require('dotenv').config();
const express = require('express');
const db = require('./db');
const path = require('path');
const fs = require('fs');
const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: [
      'http://localhost:4000',
      'http://rltn.online',
      'https://rltn.online',
      'http://www.rltn.online',
      'https://www.rltn.online'
    ],
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

app.use(express.static(path.join(__dirname, 'build')));
app.use(
  '/models',
  express.static(path.join(__dirname, 'public', 'models'))
);

let players = {};

// --- Расширяем players для поддержки городов ---
let playersByCity = {};

io.on('connection', socket => {
  console.log('Player connected:', socket.id);

  // Получаем город игрока из БД
  (async () => {
    const { rows } = await db.query('SELECT last_city_id, last_pos_x, last_pos_z FROM users WHERE id = $1', [socket.userId]);
    const cityId = rows[0]?.last_city_id || 1;
    const x = rows[0]?.last_pos_x || 0;
    const z = rows[0]?.last_pos_z || 0;
    if (!playersByCity[cityId]) playersByCity[cityId] = {};
    playersByCity[cityId][socket.id] = {
      socketId: socket.id,
      userId: socket.userId,
      x,
      z,
      cityId,
      avatarURL: null,
      gender: null,
      firstName: null,
      lastName: null
    };
    players[socket.id] = playersByCity[cityId][socket.id];
    socket.cityId = cityId;
    socket.x = x;
    socket.z = z;
    // Отправляем только игроков этого города
    socket.emit('currentPlayers', playersByCity[cityId]);
  })();

  // --- Новый игрок ---
  socket.on('newPlayer', data => {
    const cityId = data.cityId || socket.cityId || 1;
    if (!playersByCity[cityId]) playersByCity[cityId] = {};
    const p = playersByCity[cityId][socket.id] || {};
    Object.assign(p, {
      x: data.x,
      z: data.z,
      cityId,
      avatarURL: data.avatarURL || null,
      gender: data.gender || null,
      firstName: data.firstName || '',
      lastName: data.lastName || ''
    });
    playersByCity[cityId][socket.id] = p;
    players[socket.id] = p;
    socket.cityId = cityId;
    // Сообщаем только игрокам этого города
    for (const id in playersByCity[cityId]) {
      if (id !== socket.id) {
        io.to(id).emit('newPlayer', {
          playerId: socket.id,
          x: p.x,
          z: p.z,
          avatarURL: p.avatarURL,
          gender: p.gender,
          firstName: p.firstName,
          lastName: p.lastName
        });
      }
    }
  });

  // --- Перемещение игрока ---
  socket.on('playerMovement', movementData => {
    const cityId = socket.cityId;
    if (playersByCity[cityId] && playersByCity[cityId][socket.id]) {
      playersByCity[cityId][socket.id].x = movementData.x;
      playersByCity[cityId][socket.id].z = movementData.z;
      // Сообщаем только игрокам этого города
      for (const id in playersByCity[cityId]) {
        if (id !== socket.id) {
          io.to(id).emit('playerMoved', {
            playerId: socket.id,
            x: movementData.x,
            z: movementData.z
          });
        }
      }
      // Voice chat nearby только в этом городе
      const sender = playersByCity[cityId][socket.id];
      for (const [id, other] of Object.entries(playersByCity[cityId])) {
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

  // --- Чат ---
  socket.on('chatMessage', ({ message, name }) => {
    const cityId = socket.cityId;
    const sender = playersByCity[cityId]?.[socket.id];
    if (!sender) return;
    for (const [id, other] of Object.entries(playersByCity[cityId])) {
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

  // --- WebRTC signaling ---
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
    if (players[socket.id]) {
      players[socket.id].voiceEnabled = enabled;
    }
    socket.broadcast.emit('voiceChatStatus', { playerId: socket.id, enabled });
  });

  // --- Смена города ---
  socket.on('cityChange', async ({ cityId }) => {
    const oldCity = socket.cityId;
    if (playersByCity[oldCity]) {
      delete playersByCity[oldCity][socket.id];
      // Сообщаем игрокам старого города о выходе
      for (const id in playersByCity[oldCity]) {
        io.to(id).emit('playerDisconnected', socket.id);
      }
    }
    if (!playersByCity[cityId]) playersByCity[cityId] = {};
    playersByCity[cityId][socket.id] = {
      socketId: socket.id,
      userId: socket.userId,
      x: 0,
      z: 0,
      cityId,
      avatarURL: null,
      gender: null,
      firstName: null,
      lastName: null
    };
    players[socket.id] = playersByCity[cityId][socket.id];
    socket.cityId = cityId;
    // Отправляем новых игроков этого города
    socket.emit('currentPlayers', playersByCity[cityId]);
  });

  // --- Отключение ---
  socket.on('disconnect', async () => {
    const cityId = socket.cityId;
    const player = playersByCity[cityId]?.[socket.id];
    if (player) {
      // Сохраняем координаты и город выхода
      await db.query(
        'UPDATE users SET last_city_id = $1, last_pos_x = $2, last_pos_z = $3 WHERE id = $4',
        [cityId, player.x, player.z, player.userId]
      );
      delete playersByCity[cityId][socket.id];
      delete players[socket.id];
      // Сообщаем игрокам города о выходе
      for (const id in playersByCity[cityId]) {
        io.to(id).emit('playerDisconnected', socket.id);
      }
    }
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
      avatar_url AS "avatarURL",
      balance,
      satiery
    FROM users
    WHERE id = $1
  `, [userId]);
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

app.get('/api/players/:socketId', authenticate, async (req, res) => {
  const socketId = req.params.socketId;
  let p = players[socketId];
  if (!p) {
    for (const city of Object.values(playersByCity)) {
      if (city[socketId]) {
        p = city[socketId];
        break;
      }
    }
  }
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
       satiety,
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

// Получить объекты города по cityId
app.get('/api/cities/:cityId/objects', authenticate, async (req, res) => {
  const cityId = req.params.cityId;
  try {
    const { rows } = await db.query(`
      SELECT id, name, model_url, pos_x, pos_y, pos_z, rot_x, rot_y, rot_z, organization_id,
             COALESCE(collidable, true) AS collidable
      FROM city_objects
      WHERE city_id = $1
    `, [cityId]);
    res.json(rows);
  } catch (e) {
    console.error('Ошибка в /api/cities/:cityId/objects:', e);
    res.status(500).json({ error: 'Ошибка получения объектов города' });
  }
});

// Получить список доступных моделей из public/models/copied
app.get('/api/models', authenticate, async (req, res) => {
  try {
    const dir = path.join(__dirname, 'public', 'models', 'copied');
    const files = await fs.promises.readdir(dir);
    const glbs = files.filter(f => f.toLowerCase().endsWith('.glb'));
    res.json(glbs);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка чтения списка моделей' });
  }
});

// Регистрируем маршрут на старте приложения:
app.get(
  '/api/city_objects/:objectId/interior',
  authenticate,
  async (req, res) => {
    const objectId = parseInt(req.params.objectId, 10);
    try {
      const { rows } = await db.query(
        'SELECT interior_id FROM city_objects WHERE id = $1',
        [objectId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Объект с таким id не найден' });
      }
      res.json({ interiorId: rows[0].interior_id });
    } catch (e) {
      console.error('Ошибка в /api/city_objects/:objectId/interior', e);
      res.status(500).json({ error: 'Не удалось получить interior_id' });
    }
  }
);

// server.js, после маршрута /api/city_objects/:objectId/interior
app.get('/api/interiors/:interiorId/definition', authenticate, async (req, res) => {
  const interiorId = parseInt(req.params.interiorId, 10);
  try {
    // получаем контейнер-glb
    const interior = (await db.query(
      'SELECT glb_filename FROM interiors WHERE id = $1',
      [interiorId]
    )).rows[0];
    if (!interior) return res.status(404).json({ error: 'Интерьер не найден' });

    // получаем все объекты с model_url
    const objects = (await db.query(
      `SELECT type, model_url, x, y, z, rot_x, rot_y, rot_z, scale
         FROM interior_objects
        WHERE interior_id = $1
        ORDER BY id`,
      [interiorId]
    )).rows;

    res.json({
      glb: `/models/interiors/${interior.glb_filename}`, 
      objects
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Не удалось загрузить определение интерьера' });
  }
});



// Получить организацию по objectId
app.get('/api/organizations/by-object/:objectId', authenticate, async (req, res) => {
  const objectId = parseInt(req.params.objectId, 10);
  try {
    const { rows } = await db.query(`
      SELECT 
        o.id,
        o.name,
        os.menu,
        os.work_hours
      FROM city_objects AS co
      JOIN organizations AS o
        ON co.organization_id = o.id
      JOIN organization_settings AS os
        ON os.organization_id = o.id
      WHERE co.id = $1
    `, [objectId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Организация не найдена для этого объекта' });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error('Ошибка в /api/organizations/by-object/:objectId:', e);
    res.status(500).json({ error: 'Ошибка получения меню организации' });
  }
});


// Покупка товара в организации
app.post('/api/organizations/:id/purchase', authenticate, async (req, res) => {
  const { id } = req.params;
  const { itemKey } = req.body;
  try {
    const { rows } = await db.query(
      'SELECT menu FROM organization_settings WHERE organization_id = $1',
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Организация не найдена' });
    const menu = rows[0].menu || {};
    const item = menu[itemKey];
    if (!item) return res.status(400).json({ error: 'Товар не найден' });
    const price = item.price || 0;
    const satiety = item.satiety || 0;
    const upd = await db.query(
      'UPDATE users SET balance = balance - $1, satiety = LEAST(satiety + $2, 100) WHERE id = $3 RETURNING satiety',
      [price, satiety, req.user.id]
    );
    res.json({ success: true, satiety: upd.rows[0].satiety });
  } catch (e) {
    console.error('purchase error', e);
    res.status(500).json({ error: 'Ошибка покупки' });
  }
});


// Сохранить текущую карту в текстовый файл
app.post('/api/save-map', authenticate, async (req, res) => {
  const { cityId = 'unknown', objects, removedIds = [] } = req.body;
  if (!Array.isArray(objects) || !Array.isArray(removedIds)) {
    return res.status(400).json({ error: 'Invalid objects' });
  }
  try {
    const dir = path.join(__dirname, 'saves');
    await fs.promises.mkdir(dir, { recursive: true });
    const file = `city_${cityId}_${Date.now()}.txt`;
    const filePath = path.join(dir, file);
    await fs.promises.writeFile(
      filePath,
      JSON.stringify({ objects, removedIds }, null, 2),
      'utf8'
    );
    res.json({ ok: true, file });
  } catch (e) {
    console.error('Ошибка сохранения карты', e);
    res.status(500).json({ error: 'Ошибка сохранения карты' });
  }
});

// Получить список городов с названием и страной
app.get('/api/cities', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT cities.id, cities.name, countries.name AS country_name
      FROM cities
      JOIN countries ON cities.country_id = countries.id
      ORDER BY countries.name, cities.name
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка получения списка городов' });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 4000;
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});