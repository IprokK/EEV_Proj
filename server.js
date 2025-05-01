// server.js

require('dotenv').config();
const express = require('express');
const db = require('./db');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: 'http://localhost:3000',  // ваш фронт
    methods: ['GET','POST']
  }
});
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// JWT-middleware
function authenticate(req, res, next) {
  const auth = req.headers.authorization?.split(' ');
  try {
  if (!auth || auth[0] !== 'Bearer') return res.status(401).send('No token');
    const payload = jwt.verify(auth[1], process.env.JWT_SECRET);
    req.user = payload; 
    next();
  } catch {
    res.status(401).send('Invalid token');
  }
}

// Раздаём статические файлы React‑сборки из папки build/
app.use(express.static(path.join(__dirname, 'build')));

// Хранение состояния игроков

  let players = {};

  io.on('connection', socket => {
    console.log('Player connected:', socket.id);

    // Инициализируем нового игрока
    players[socket.id] = {
      x: 0,
      z: 0,
      playerId: socket.id,
      avatarURL: null,
      gender: null,
      firstName: null,
      lastName: null
    };
      
    socket.emit('currentPlayers', players);

    // Новый игрок
    socket.on('newPlayer', data => {
      // сохраняем сразу всё, что прислал клиент
      players[socket.id] = {
        x: data.x,
        z: data.z,
        playerId: socket.id,
        avatarURL: data.avatarURL || null,
        gender: data.gender || null,
        firstName: data.firstName || '',
        lastName: data.lastName || ''
      };
      // шлём остальным
      socket.broadcast.emit('newPlayer', players[socket.id]);
    });

    // Обновление позиции
    socket.on('playerMovement', movementData => {
      if (players[socket.id]) {
        players[socket.id].x = movementData.x;
        players[socket.id].z = movementData.z;
        socket.broadcast.emit('playerMoved', {
          playerId: socket.id,
          x: movementData.x,
          z: movementData.z
        });
      }
    });
      // 💬 Чат: приём и рассылка сообщений только по расстоянию
      socket.on('chatMessage', ({ message, name }) => {
          const sender = players[socket.id];
          if (!sender) return;

          for (const [id, other] of Object.entries(players)) {
              const dx = sender.x - other.x;
              const dz = sender.z - other.z;
              const dist = Math.sqrt(dx * dx + dz * dz);

              // Рассылаем только игрокам в радиусе 50
              if (dist <= 50 || id === socket.id) {
                  io.to(id).emit('chatMessage', {
                      playerId: socket.id,
                      position: { x: sender.x, z: sender.z },
                      name: name || '???',
                      message: message
                  });
              }
          }
      });


    // Отключение
    socket.on('disconnect', () => {
      console.log('Player disconnected:', socket.id);
      delete players[socket.id];
      io.emit('playerDisconnected', socket.id);
    });
  });

// после app.post('/api/login', …)

// GET /api/me — отдать полностью заполненный профиль
app.get('/api/me', authenticate, async (req, res) => {
  const userId = req.user.id;  // теперь payload.id есть
  const { rows } = await db.query(`
    SELECT
      email,
      first_name AS "firstName",
      last_name  AS "lastName",
      gender,
      age,
      city,
      avatar_url AS "avatarURL"
    FROM users
    WHERE id = $1
  `, [userId]);
  if (!rows.length) return res.status(404).json({ error:'User not found' });
  res.json(rows[0]);
});


// POST /api/register
// ожидает JSON: { email, password, firstName, lastName, gender, age, city, avatarURL }
  app.post('/api/register', async (req, res) => {
    console.log('register request:');
    const { email, password, firstName, lastName, gender, age, city, avatarURL } = req.body;
    // 1) Проверяем, нет ли уже пользователя
    const { rowCount } = await db.query(`SELECT 1 FROM users WHERE email = $1`, [email]);
    if (rowCount) return res.status(400).json({ error: 'Почта уже занята' });
  
    // 2) Хэшируем пароль и вставляем
    const hash = await bcrypt.hash(password, 10);
    const insertSQL = `
      INSERT INTO users(email, password_hash, first_name, last_name, gender, age, city, avatar_url)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id, email, created_at
    `;
    const result = await db.query(insertSQL, [
      email, hash, firstName, lastName, gender, age, city, avatarURL
    ]);
  
    // 3) Отправляем токен или OK
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '12h'
    });
    res.json({ success: true, token });
  });

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  // 1) находим пользователя
  const { rows } = await db.query(
    `SELECT id, password_hash,
            first_name   AS "firstName",
            last_name    AS "lastName",
            gender,
            age,
            city,
            avatar_url   AS "avatarURL"
     FROM users
     WHERE email = $1`,
    [email]
  );
  if (!rows.length) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const user = rows[0];
  // 2) проверяем пароль
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  // 3) подписываем токен только с id
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: '12h'
  });

  // 4) отдаем токен + профиль (без password_hash)
  res.json({
    token,
    profile: {
      email,
      firstName: user.firstName,
      lastName: user.lastName,
      gender: user.gender,
      age: user.age,
      city: user.city,
      avatarURL: user.avatarURL
    }
  });
});



// Catch‑all — для любых остальных запросов (SPA‑маршрутизация)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Запуск сервера
const PORT = process.env.PORT || 4000;
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
