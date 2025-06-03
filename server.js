const { Pool } = require('pg');
const pool = new Pool({
    // ... ваши параметры ...
    connectionTimeoutMillis: 2000,
    query_timeout: 5000,
    log: (msg) => console.log('DB:', msg)
});

require('dotenv').config();
const express = require('express');
const db = require('./db');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/register', async (req, res) => {
    console.log('register request:', req.body);

    try {
        const { email, password, firstName, lastName, gender, age, city, avatarURL } = req.body;

        // Проверка существования пользователя
        const userCheck = await db.query(`SELECT 1 FROM users WHERE email = $1`, [email]);
        if (userCheck.rowCount > 0) {
            console.log('Email already exists:', email);
            return res.status(400).json({ error: 'Почта уже занята' });
        }

        console.log('Hashing password...');
        const hash = await bcrypt.hash(password, 10);

        console.log('Inserting user into database...');
        const insertSQL = `
      INSERT INTO users(email, password_hash, first_name, last_name, gender, age, city, avatar_url)
      VALUES($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, email, created_at
    `;

        const result = await db.query(insertSQL, [
            email, hash, firstName, lastName, gender, age, city, avatarURL
        ]);

        if (result.rows.length === 0) {
            throw new Error('User creation failed');
        }

        const user = result.rows[0];
        console.log('User created:', user.id);

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
            expiresIn: '12h'
        });

        res.json({ success: true, token });

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('No token'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.id;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

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

async function initializeDatabase() {
    try {
        // Проверяем существование таблицы messages
        const { rows } = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'messages'
      )
    `);

        if (!rows[0].exists) {
            console.log('Creating database tables...');

            // Создаем таблицу пользователей (если не существует)
            await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(50),
          last_name VARCHAR(50),
          gender VARCHAR(10),
          age INTEGER,
          city VARCHAR(100),
          avatar_url VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

            // Создаем таблицу сообщений
            await db.query(`
        CREATE TABLE messages (
          id SERIAL PRIMARY KEY,
          sender_id INTEGER NOT NULL REFERENCES users(id),
          receiver_id INTEGER NOT NULL REFERENCES users(id),
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_read BOOLEAN DEFAULT false
        )
      `);

            // Создаем индексы для ускорения поиска
            await db.query('CREATE INDEX idx_messages_sender ON messages(sender_id)');
            await db.query('CREATE INDEX idx_messages_receiver ON messages(receiver_id)');
            await db.query('CREATE INDEX idx_messages_created ON messages(created_at)');

            console.log('Database tables created successfully');
        }
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

// Вызываем инициализацию БД при запуске сервера
initializeDatabase();

// ================== СОКЕТ ДЛЯ ОТПРАВКИ СООБЩЕНИЙ ================== //
const messageSockets = {}; // {userId: socketId}

io.on('connection', socket => {
    // ... существующий код подключения ...

    // Сохраняем связь userID -> socketID для отправки сообщений
    if (socket.userId) {
        messageSockets[socket.userId] = socket.id;
    }

    // Обработка отключения
    socket.on('disconnect', () => {
        // ... существующий код отключения ...

        // Удаляем связь пользователя
        if (socket.userId) {
            delete messageSockets[socket.userId];
        }
    });
});

// ================== API ДЛЯ РАБОТЫ С СООБЩЕНИЯМИ ================== //

// Получение ID пользователя по socketId
app.get('/api/user-id/:socketId', authenticate, async (req, res) => {
    const socketId = req.params.socketId;
    const player = players[socketId];
    if (!player || !player.userId) {
        return res.status(404).json({ error: 'Player not found' });
    }
    res.json({ userId: player.userId });
});

// Отправка сообщения
app.post('/api/messages', authenticate, async (req, res) => {
    const { receiver_id, message } = req.body;

    try {
        // Сохраняем сообщение в базе данных
        const result = await db.query(
            `INSERT INTO messages (sender_id, receiver_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [req.user.id, receiver_id, message]
        );

        const savedMessage = result.rows[0];

        // Отправляем сообщение через сокет получателю, если он онлайн
        if (messageSockets[receiver_id]) {
            io.to(messageSockets[receiver_id]).emit('newMessage', savedMessage);
        }

        res.status(201).json(savedMessage);
    } catch (err) {
        console.error('Error saving message:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Получение истории сообщений
app.get('/api/messages', authenticate, async (req, res) => {
    try {
        const otherUserId = req.query.userId;
        const { rows } = await db.query(
            `SELECT m.*, 
        u.first_name AS sender_first_name,
        u.last_name AS sender_last_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC`,
            [req.user.id, otherUserId]
        );

        res.json(rows);
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Поиск пользователей для чата
app.get('/api/users/search', authenticate, async (req, res) => {
    try {
        const searchTerm = `%${req.query.term}%`;
        const { rows } = await db.query(
            `SELECT id, first_name, last_name
      FROM users
      WHERE CONCAT(first_name, ' ', last_name) ILIKE $1
        AND id != $2
      LIMIT 10`,
            [searchTerm, req.user.id]
        );

        res.json(rows);
    } catch (err) {
        console.error('Error searching users:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// После создания пула БД
db.query('SELECT NOW()')
    .then(res => console.log('Database connected at:', res.rows[0].now))
    .catch(err => console.error('Database connection error:', err));
app.use(express.static(path.join(__dirname, 'build')));

let players = {};

io.on('connection', socket => {
  console.log('Player connected:', socket.id);

  players[socket.id] = {
    socketId: socket.id,
    userId: socket.userId,
    x: 0,
    z: 0,
    avatarURL: null,
    gender: null,
    firstName: null,
    lastName: null
  };

  socket.emit('currentPlayers', players);

  socket.on('newPlayer', data => {
    const p = players[socket.id];
    Object.assign(p, {
      x: data.x,
      z: data.z,
      avatarURL: data.avatarURL || null,
      gender: data.gender || null,
      firstName: data.firstName || '',
      lastName: data.lastName || ''
    });
    socket.broadcast.emit('newPlayer', {
      playerId: socket.id,
      x:        p.x,
      z:        p.z,
      avatarURL: p.avatarURL,
      gender:   p.gender,
      firstName:p.firstName,
      lastName: p.lastName
    });
  });

  socket.on('playerMovement', movementData => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].z = movementData.z;
      socket.broadcast.emit('playerMoved', {
        playerId: socket.id,
        x: movementData.x,
        z: movementData.z
      });

      // Notify nearby players for voice chat
      const sender = players[socket.id];
      for (const [id, other] of Object.entries(players)) {
        if (id === socket.id) continue;
        const dx = sender.x - other.x;
        const dz = sender.z - other.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= 50) {
          io.to(id).emit('voiceChatNearby', { playerId: socket.id });
          io.to(socket.id).emit('voiceChatNearby', { playerId: id });
        }
      }
    }
  });

  socket.on('chatMessage', ({ message, name }) => {
    const sender = players[socket.id];
    if (!sender) return;

    for (const [id, other] of Object.entries(players)) {
      const dx = sender.x - other.x;
      const dz = sender.z - other.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

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

  // WebRTC signaling
  socket.on('voiceChatOffer', ({ to, offer }) => {
    io.to(to).emit('voiceChatOffer', { from: socket.id, offer });
  });

  socket.on('voiceChatAnswer', ({ to, answer }) => {
    io.to(to).emit('voiceChatAnswer', { from: socket.id, answer });
  });

  socket.on('voiceChatIceCandidate', ({ to, candidate }) => {
    io.to(to).emit('voiceChatIceCandidate', { from: socket.id, candidate });
  });

  socket.on('voiceChatToggle', ({ enabled }) => {
    players[socket.id].voiceEnabled = enabled;
    socket.broadcast.emit('voiceChatStatus', { playerId: socket.id, enabled });
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

app.get('/api/me', authenticate, async (req, res) => {
  const userId = req.user.id;
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
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

app.get('/api/players/:socketId', authenticate, async (req, res) => {
  const socketId = req.params.socketId;
  const p = players[socketId];
  if (!p) return res.status(404).json({ error: 'Player not found' });

  const dbId = p.userId;
  if (!dbId) return res.status(404).json({ error: 'User profile missing' });

  const { rows } = await db.query(`
     SELECT
       first_name    AS "firstName",
       last_name     AS "lastName",
       gender,
       age,
       city,
       avatar_url    AS "avatarURL",
       balance,
       hours_played  AS "hoursPlayed",
       reputation,
       phone,
       sportiness,
       health_level  AS "healthLevel",
       stress_level  AS "stressLevel",
       diseases
     FROM users
     WHERE id = $1
   `, [dbId]);

  if (!rows.length) return res.status(404).json({ error: 'User not found in database' });
  res.json(rows[0]);
});

app.post('/api/register', async (req, res) => {
  console.log('register request:');
  const { email, password, firstName, lastName, gender, age, city, avatarURL } = req.body;
  const { rowCount } = await db.query(`SELECT 1 FROM users WHERE email = $1`, [email]);
  if (rowCount) return res.status(400).json({ error: 'Почта уже занята' });

  const hash = await bcrypt.hash(password, 10);
  const insertSQL = `
    INSERT INTO users(email, password_hash, first_name, last_name, gender, age, city, avatar_url)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING id, email, created_at
  `;
  const result = await db.query(insertSQL, [
    email, hash, firstName, lastName, gender, age, city, avatarURL
  ]);

  const user = result.rows[0];
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '12h'
  });
  res.json({ success: true, token });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
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
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: '12h'
  });

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

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 4000;
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});