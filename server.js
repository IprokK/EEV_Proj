require('dotenv').config();
const express = require('express');
const db = require('./db');
const path = require('path');
const fs = require('fs');
const app = express();

// Economy services compiled from TypeScript
const {
  currencyService,
  exchangeService,
  inventoryService,
  accountService,
  batchWriter,
  ledgerService,
} = require('./dist/economy');

const { virtualWorldPool } = require('./db1');

async function ensureMessagesTable() {
  try {
    await virtualWorldPool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        is_read BOOLEAN DEFAULT FALSE
      )
    `);
  } catch (e) {
    console.error('Ошибка создания таблицы messages', e);
  }
}

async function ensureEconomyTables() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS treasury (
      id SERIAL PRIMARY KEY,
      country_code TEXT UNIQUE,
      balance NUMERIC DEFAULT 0
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      currency TEXT,
      balance NUMERIC
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      from_account INTEGER,
      to_account INTEGER,
      amount NUMERIC,
      currency TEXT,
      type TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      item_id INT,
      name TEXT,
      quantity INT,
      stackable BOOLEAN,
      weight NUMERIC
    )`);
  } catch (e) {
    console.error('Ошибка создания economy таблиц', e);
  }
}

ensureMessagesTable();
ensureEconomyTables();
batchWriter.start();


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

let onlineUsers = {};   

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('No token'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.id;
    onlineUsers[socket.userId] = socket.id; // Добавить пользователя в онлайн  
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

    // Economy socket events
    exchangeService.registerSocket(socket);
    socket.on('economy:getBalance', async ({ currency }) => {
      const balance = await accountService.getBalance(socket.userId, currency);
      socket.emit('economy:balanceChanged', { currency, balance });
    });
    socket.on('economy:buyItem', async ({ item, price, currency }) => {
      try {
        await accountService.transfer(socket.userId, 0, price, currency, 'purchase');
        await inventoryService.addItem(socket.userId, item);
        socket.emit('economy:balanceChanged', {
          currency,
          balance: await accountService.getBalance(socket.userId, currency),
        });
        socket.emit('economy:transactionRecorded', { type: 'purchase', amount: price });
      } catch (e) {
        ledgerService.error('buyItem error ' + e);
        socket.emit('economy:error', { error: 'purchase failed' });
      }
    });
    socket.on('economy:getInventory', async () => {
      const items = await inventoryService.getInventory(socket.userId);
      socket.emit('economy:inventory', items);
    });
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

  socket.on('sendMessage', async ({ receiverId, message }, callback) => {
        try {
            const senderId = socket.userId;
            const recvId = parseInt(receiverId, 10);

            // Проверка получателя
            const receiverCheck = await db.query('SELECT id FROM users WHERE id = $1', [recvId]);
            if (receiverCheck.rows.length === 0) {
                return callback({ error: 'Пользователь не найден' });
            }

            // Сохранение сообщения
            const result = await virtualWorldPool.query(
                `INSERT INTO messages (sender_id, receiver_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, created_at, is_read`,
                [senderId, recvId, message]
            );

            const newMessage = result.rows[0];
            const receiverSocketId = onlineUsers[recvId];

            // Отправка получателю
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('newMessage', {
                    id: newMessage.id,
                    text: message,
                    senderId,
                    timestamp: newMessage.created_at,
                    isRead: newMessage.is_read
                });
            }

            callback({ success: true, message: newMessage });
        } catch (err) {
            callback({ error: 'Ошибка отправки сообщения' });
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
    delete onlineUsers[socket.userId];
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

// Маршрут для получения списка пользователей
// Получить список пользователей (кроме текущего)
app.get('/api/users', authenticate, async (req, res) => {
    try {
        const { rows } = await db.query(`
      SELECT id, first_name AS "firstName", last_name AS "lastName", avatar_url AS "avatarURL"
      FROM users
      WHERE id != $1
    `, [req.user.id]);
        res.json(rows);
    } catch (e) {
        console.error('Ошибка получения списка пользователей', e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Новый маршрут для получения сообщений с конкретным контактом
app.get('/api/messages/:contactId', authenticate, async (req, res) => {
    const userId = req.user.id;
    const contactId = parseInt(req.params.contactId, 10);

    try {
        const messagesRes = await virtualWorldPool.query(
            `SELECT * FROM messages
             WHERE (sender_id = $1 AND receiver_id = $2)
                OR (sender_id = $2 AND receiver_id = $1)
             ORDER BY created_at ASC`,
            [userId, contactId]
        );

        res.json(messagesRes.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка получения сообщений' });
    }
});

app.post('/api/messages/send', authenticate, async (req, res) => {
    const senderId = req.user.id;
    const { receiverId, message } = req.body;
    const recvId = parseInt(receiverId, 10);

    try {
        // Проверка существования получателя в основной БД
        const receiverCheck = await db.query('SELECT id FROM users WHERE id = $1', [recvId]);
        if (receiverCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Сохранение сообщения в virtual_world
        const result = await virtualWorldPool.query(
            `INSERT INTO messages (sender_id, receiver_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, created_at, is_read`,
            [senderId, recvId, message]
        );

        const newMessage = result.rows[0];

        // Отправка через сокеты, если получатель онлайн
        const receiverSocketId = onlineUsers[recvId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('newMessage', {
                id: newMessage.id,
                text: message,
                senderId,
                timestamp: newMessage.created_at,
                isRead: newMessage.is_read
            });
        }

        res.status(201).json(newMessage);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка отправки сообщения' });
    }
});

app.get('/api/messages', authenticate, async (req, res) => {
    const userId = req.user.id;

    try {
        // Получение сообщений из virtual_world
        const messagesRes = await virtualWorldPool.query(
            `SELECT * FROM messages
       WHERE sender_id = $1 OR receiver_id = $1
       ORDER BY created_at DESC`,
            [userId]
        );

        if (messagesRes.rows.length === 0) {
            return res.json([]);
        }

        // Сбор ID пользователей
        const userIds = new Set();
        messagesRes.rows.forEach(msg => {
            userIds.add(msg.sender_id);
            userIds.add(msg.receiver_id);
        });

        // Получение данных пользователей из основной БД
        const usersRes = await db.query(
            `SELECT id, first_name, last_name, avatar_url
       FROM users
       WHERE id = ANY($1)`,
            [Array.from(userIds)]
        );

        // Создание карты пользователей
        const userMap = {};
        usersRes.rows.forEach(user => {
            userMap[user.id] = {
                name: `${user.first_name} ${user.last_name}`,
                avatar: user.avatar_url
            };
        });

        // Формирование ответа
        const messages = messagesRes.rows.map(msg => ({
            id: msg.id,
            text: msg.message,
            senderId: msg.sender_id,
            receiverId: msg.receiver_id,
            sender: userMap[msg.sender_id] || { name: 'Неизвестный', avatar: null },
            receiver: userMap[msg.receiver_id] || { name: 'Неизвестный', avatar: null },
            timestamp: msg.created_at,
            isRead: msg.is_read
        }));

        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка получения сообщений' });
    }
});

app.patch('/api/messages/:id/read', authenticate, async (req, res) => {
    const messageId = req.params.id;
    const userId = req.user.id;

    try {
        // Проверка прав доступа
        const checkRes = await virtualWorldPool.query(
            `SELECT id FROM messages WHERE id = $1 AND receiver_id = $2`,
            [messageId, userId]
        );

        if (checkRes.rows.length === 0) {
            return res.status(404).json({ error: 'Сообщение не найдено или доступ запрещен' });
        }

        // Обновление статуса
        await virtualWorldPool.query(
            `UPDATE messages SET is_read = true WHERE id = $1`,
            [messageId]
        );

        res.status(204).end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка обновления сообщения' });
    }
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
  // Initialize economy account
  await accountService.ensureAccount(
    user.id,
    currencyService.getCurrencyForCountry('US'),
    currencyService.config.startBalance
  );
  await db.query(
    `INSERT INTO treasury(country_code)
     VALUES($1) ON CONFLICT (country_code) DO NOTHING`,
    ['US']
  );
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
      id: user.id,
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
    const interior = (await db.query(
      'SELECT glb_filename, pos_x, pos_y, pos_z FROM interiors WHERE id = $1',
      [interiorId]
    )).rows[0];
    if (!interior) return res.status(404).json({ error: 'Интерьер не найден' });

    const objects = (await db.query(
      `SELECT type, model_url, x, y, z, rot_x, rot_y, rot_z, scale
         FROM interior_objects
        WHERE interior_id = $1
        ORDER BY id`,
      [interiorId]
    )).rows;

    res.json({
      glb: `/models/interiors/${interior.glb_filename}`,
      position: { x: interior.pos_x, y: interior.pos_y, z: interior.pos_z },
      objects
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Не удалось загрузить определение интерьера' });
  }
});

// Список интерьеров с координатами для отображения на карте
app.get('/api/interiors', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, pos_x, pos_y, pos_z FROM interiors ORDER BY id'
    );
    res.json(rows);
  } catch (e) {
    console.error('Ошибка получения списка интерьеров', e);
    res.status(500).json({ error: 'Не удалось получить список интерьеров' });
  }
});

// Получить объекты интерьера
app.get('/api/interiors/:id/objects', authenticate, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const { rows } = await db.query(
      `SELECT id, type, model_url, x, y, z, rot_x, rot_y, rot_z, scale
         FROM interior_objects
        WHERE interior_id = $1
        ORDER BY id`,
      [id]
    );
    res.json(rows);
  } catch (e) {
    console.error('Ошибка получения объектов интерьера', e);
    res.status(500).json({ error: 'Не удалось получить объекты интерьера' });
  }
});

// Сохранить объекты интерьера в БД
app.post('/api/interiors/:id/save', authenticate, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { objects = [], removedIds = [] } = req.body;
  if (!Array.isArray(objects) || !Array.isArray(removedIds)) {
    return res.status(400).json({ error: 'Invalid objects' });
  }
  try {
    if (removedIds.length) {
      await db.query(
        'DELETE FROM interior_objects WHERE id = ANY($1::int[]) AND interior_id = $2',
        [removedIds, id]
      );
    }
    for (const obj of objects) {
      if (obj.id) {
        await db.query(
          `UPDATE interior_objects
              SET type=$1, model_url=$2, x=$3, y=$4, z=$5,
                  rot_x=$6, rot_y=$7, rot_z=$8, scale=$9
            WHERE id=$10 AND interior_id=$11`,
          [
            obj.type,
            obj.model_url,
            obj.x,
            obj.y,
            obj.z,
            obj.rot_x,
            obj.rot_y,
            obj.rot_z,
            obj.scale,
            obj.id,
            id
          ]
        );
      } else {
        await db.query(
          `INSERT INTO interior_objects
            (interior_id, type, model_url, x, y, z, rot_x, rot_y, rot_z, scale)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            id,
            obj.type,
            obj.model_url,
            obj.x,
            obj.y,
            obj.z,
            obj.rot_x,
            obj.rot_y,
            obj.rot_z,
            obj.scale
          ]
        );
      }
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('Ошибка сохранения интерьера', e);
    res.status(500).json({ error: 'Не удалось сохранить интерьер' });
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