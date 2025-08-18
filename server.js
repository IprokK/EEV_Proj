let dotenv, express, db, Economy, GameTime, pathLib, fs, virtualWorldPool;
try {
  dotenv = require('dotenv').config();
  console.log('dotenv успешно импортирован');
} catch (e) {
  console.error('Ошибка при импорте dotenv:', e);
  throw e;
}
try {
  express = require('express');
  console.log('express успешно импортирован');
} catch (e) {
  console.error('Ошибка при импорте express:', e);
  throw e;
}
try {
  db = require('./db');
  console.log('db успешно импортирован');
} catch (e) {
  console.error('Ошибка при импорте db:', e);
  throw e;
}
try {
  Economy = require('./economy');
  console.log('Economy успешно импортирован');
} catch (e) {
  console.error('Ошибка при импорте economy:', e);
  throw e;
}
try {
  GameTime = require('./gameTime');
  console.log('GameTime успешно импортирован');
} catch (e) {
  console.error('Ошибка при импорте gameTime:', e);
  throw e;
}
try {
  pathLib = require('path');
  console.log('path успешно импортирован');
} catch (e) {
  console.error('Ошибка при импорте path:', e);
  throw e;
}
try {
  fs = require('fs');
  console.log('fs успешно импортирован');
} catch (e) {
  console.error('Ошибка при импорте fs:', e);
  throw e;
}

const app = express();

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

const organizationsRouter = require('./server/organizations')(io, onlineUsers);
app.use('/api/organizations', organizationsRouter);

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

app.use(express.static(pathLib.join(__dirname, 'build')));
app.use(
  '/models',
  express.static(pathLib.join(__dirname, 'public', 'models'))
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
    console.log("Запрос пошел");
    try {
        // Проверка существования получателя в основной БД
        const receiverCheck = await db.query('SELECT id FROM users WHERE id = $1', [recvId]);
        if (receiverCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Сохранение сообщения в virtual_world
        const result = await virtualWorldPool.query(
            `INSERT INTO messages (sender_id, receiver_id, message, created_at)
     VALUES ($1, $2, $3, NOW())
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
      thirst,
      diseases
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
      thirst,
      diseases,
      last_city_id  AS "last_city_id",
      last_pos_x    AS "last_pos_x",
      last_pos_z    AS "last_pos_z"
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
  await economy.createAccount(user.id, 'USD');
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
    const dir = pathLib.join(__dirname, 'public', 'models', 'copied');
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

// Новый эндпоинт для входа в интерьер:
app.post('/api/interiors/:interiorId/enter', authenticate, async (req, res) => {
  const interiorId = parseInt(req.params.interiorId, 10);
  try {
    const interior = (await db.query(
      'SELECT city_id, spawn_x, spawn_y, spawn_z, spawn_rot, exit_x, exit_y, exit_z, exit_rot FROM interiors WHERE id = $1',
        [interiorId]
      )).rows[0];
    if (!interior) return res.status(404).json({ error: 'Интерьер не найден' });
    res.json({
      cityId: interior.city_id || 1,
      spawn: {
        x: interior.spawn_x,
        y: interior.spawn_y,
        z: interior.spawn_z,
        rot: interior.spawn_rot
      },
      exit: {
        x: interior.exit_x,
        y: interior.exit_y,
        z: interior.exit_z,
        rot: interior.exit_rot
      }, 
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Не удалось получить координаты интерьера' });
  }
});

// server.js, после маршрута /api/city_objects/:objectId/interior
app.get('/api/interiors/:interiorId/definition', authenticate, async (req, res) => {
  const interiorId = parseInt(req.params.interiorId, 10);
  try {
    const interior = (await db.query(
      'SELECT glb_filename, pos_x, pos_y, pos_z, spawn_x, spawn_y, spawn_z, spawn_rot FROM interiors WHERE id = $1',
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
      spawn: { x: interior.spawn_x, y: interior.spawn_y, z: interior.spawn_z, rot: interior.spawn_rot },
      objects
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Не удалось загрузить определение интерьера' });
  }
});

// Начало копи
app.post('/api/listen', authenticate, async (req, res) => {
    console.log('Request data:', req.body);
    const { player_id, json_filename } = req.body;

    if (!player_id || !json_filename) {
        return res.status(400).json({
            success: false,
            error: 'player_id and json_filename are required'
        });
    }

    try {
        await virtualWorldPool.query(`
            INSERT INTO json_listened (player_id, json_filename, listened_at)
            VALUES ($1, $2, NOW())
        `, [player_id, json_filename]);

        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Full DB error:', err);
        res.status(500).json({
            success: false,
            error: 'Database operation failed',
            details: process.env.NODE_ENV === 'development' ? err.message : null
        });
    }
});
//Конец копи
//Начало копи
function generateTransactions() {
    const transactions = [];
    const suspiciousCount = Math.min(3 + Math.floor(level / 3), 5);
    const suspiciousIds = [];

    while (suspiciousIds.length < suspiciousCount) {
        const id = Math.floor(Math.random() * 15);
        if (!suspiciousIds.includes(id)) {
            suspiciousIds.push(id);
        }
    }
    // Генерируем 15 транзакций
    for (let i = 0; i < 15; i++) {
        const isSuspicious = suspiciousIds.includes(i);
        // ... остальной код генерации транзакции ...
    }

    return transactions;
}

// Завершение игры
app.post('/api/cleanup-game/finish', authenticate, async (req, res) => {
    try {
        const { success, markedTransactions, personalArchive } = req.body;
        const userId = req.user.id;

        // Здесь должна быть логика обновления прогресса игрока
        // Например, увеличение репутации, разблокировка квестов и т.д.

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Ошибка сохранения результата игры' });
    }
});

// Вспомогательная функция для генерации транзакций
function getRandomCity() {
    const cities = ["Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург", "Казань", "Самара", "Омск", "Челябинск", "Ростов-на-Дону", "Уфа"];
    return cities[Math.floor(Math.random() * cities.length)];
}

function getRandomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function getRandomDevice() {
    const devices = ["Chrome Win", "Safari iOS", "Android", "Firefox Mac", "Edge Win", "Opera Win"];
    return devices[Math.floor(Math.random() * devices.length)];
}

function getRandomPurpose() {
    const purposes = [
        "Покупка продуктов",
        "Оплата услуг",
        "Перевод другу",
        "Оплата аренды",
        "Покупка техники",
        "Благотворительность",
        "Образовательные курсы"
    ];
    return purposes[Math.floor(Math.random() * purposes.length)];
}

function getRandomRecipient() {
    const recipients = [
        "Пятёрочка №17",
        "ИП Сидоров И.И.",
        "OOO 'Комплекс-С'",
        "ИП Петрова А.А.",
        "Магнит №45",
        "Ашан Супермаркет",
        "ООО 'ТехноПрофи'"
    ];
    return recipients[Math.floor(Math.random() * recipients.length)];
}

function getSuspiciousIP() {
    // Генерируем IP из известных VPN диапазонов или Tor exit nodes
    const vpnRanges = [
        "185.2.33.", "213.42.12.", "172.16.", "192.168.", "10.0."
    ];
    const range = vpnRanges[Math.floor(Math.random() * vpnRanges.length)];
    return range + Math.floor(Math.random() * 255);
}

function getSuspiciousDevice() {
    // Подозрительные устройства - одинаковые для разных транзакций
    const suspiciousDevices = [
        "Tor Browser",
        "Android 4.4.2 (старая версия)",
        "iPhone 6 (iOS 10)",
        "Emulator Android"
    ];
    return suspiciousDevices[Math.floor(Math.random() * suspiciousDevices.length)];
}

// Обновленная функция генерации транзакций
function generateTransactions() {
    const transactions = [];
    const suspiciousIds = [0, 5, 10]; // Фиксированные индексы подозрительных транзакций

    // Генерируем 15 транзакций
    for (let i = 0; i < 15; i++) {
        const isSuspicious = suspiciousIds.includes(i);
        const baseDate = new Date(2023, 6, 25); // 25 июля 2023

        let date, amount, purpose, ip, city, device, recipient;
        let anomalyType = isSuspicious ? i % 3 : null; // 0, 1 или 2 для подозрительных

        if (isSuspicious) {
            date = new Date(baseDate.getTime() + Math.floor(i / 5) * 24 * 60 * 60 * 1000);
            amount = `₽${Math.floor(200000 + Math.random() * 800000).toLocaleString()}`;

            switch (anomalyType) {
                case 0: // Географический прыжок
                    date.setHours(date.getHours() + 1);
                    ip = getSuspiciousIP();
                    city = i % 2 === 0 ? "Москва" : "Самара";
                    device = getRandomDevice();
                    purpose = getRandomPurpose();
                    recipient = getRandomRecipient();
                    break;

                case 1: // Пустое назначение + VPN
                    ip = getSuspiciousIP();
                    city = getRandomCity();
                    device = getSuspiciousDevice();
                    purpose = '';
                    recipient = getRandomRecipient();
                    break;

                case 2: // Повтор получателя
                    ip = getRandomIP();
                    city = getRandomCity();
                    device = getRandomDevice();
                    purpose = getRandomPurpose();
                    recipient = "ООО 'Сомнительные Переводы'";
                    break;
            }
        } else {
            // Нормальные транзакции
            date = new Date(baseDate.getTime() + Math.floor(i / 5) * 24 * 60 * 60 * 1000);
            amount = `₽${Math.floor(1000 + Math.random() * 20000).toLocaleString()}`;
            purpose = getRandomPurpose();
            ip = getRandomIP();
            city = getRandomCity();
            device = getRandomDevice();
            recipient = getRandomRecipient();
        }

        transactions.push({
            id: i,
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            amount,
            purpose: isSuspicious && Math.random() > 0.5 ? '' : purpose,
            ip: isSuspicious && Math.random() > 0.7 ? '' : ip,
            city,
            device: isSuspicious && Math.random() > 0.5 ? '' : device,
            recipient,
            _realIp: isSuspicious ? getSuspiciousIP() : ip,
            _realDevice: isSuspicious ? getSuspiciousDevice() : device,
            _isSuspicious: isSuspicious,
            _anomalyType: anomalyType
        });
    }

    return transactions;
}
//Конец копи
//Начало копи
app.get('/api/quests/progress', authenticate, async (req, res) => {
    console.log("Загрузка на сервере. ID пользователя:", req.user.id);

    try {
        // Получаем email пользователя из основной БД
        const userRes = await db.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        const userEmail = userRes.rows[0].email;

        // Получаем список всех квестов с их JSON файлами
        const questsQuery = await virtualWorldPool.query(`
            SELECT q.id, q.title, qj.json_filename
            FROM quests q
            JOIN quest_jsons qj ON q.id = qj.quest_id
            ORDER BY q.id
        `);

        // Получаем JSON файлы, которые прослушал игрок
        const listenedQuery = await virtualWorldPool.query(`
            SELECT json_filename FROM json_listened 
            WHERE player_id = $1
        `, [userEmail]);

        console.log("Результат запроса listenedQuery:", listenedQuery.rows);

        const listenedFiles = new Set(listenedQuery.rows.map(row => row.json_filename));
        console.log("Прослушанные файлы:", Array.from(listenedFiles));

        // Остальной код остается без изменений...
        const questsMap = new Map();
        questsQuery.rows.forEach(row => {
            if (!questsMap.has(row.id)) {
                questsMap.set(row.id, {
                    id: row.id,
                    title: row.title,
                    total: 0,
                    completed: 0,
                    files: []
                });
            }
            const quest = questsMap.get(row.id);
            quest.total++;
            quest.files.push(row.json_filename);
            if (listenedFiles.has(row.json_filename)) {
                quest.completed++;
            }
        });

        const result = Array.from(questsMap.values()).map(quest => ({
            id: quest.id,
            title: quest.title,
            progress: quest.total > 0 ? Math.round((quest.completed / quest.total) * 100) : 0,
            completed: quest.completed,
            total: quest.total
        }));

        console.log("Результат для клиента:", result);
        res.json(result);
    } catch (err) {
        console.error('Ошибка получения прогресса квестов:', err);
        res.status(500).json({ error: 'Ошибка получения прогресса квестов' });
    }
});

app.get('/api/cleanup-game/data', authenticate, async (req, res) => {
    try {
        const level = parseInt(req.query.level) || 1;
        // Генерируем транзакции с учетом уровня
        const transactions = generateTransactions(level);

        res.json({
            success: true,
            transactions: transactions,
            level: level
        });
    } catch (e) {
        console.error('Ошибка генерации данных игры:', e);
        res.status(500).json({
            success: false,
            error: 'Ошибка генерации данных игры'
        });
    }
});
//Конец копи
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
      `SELECT id, model_url, x, y, z, rot_x, rot_y, rot_z, scale
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
              SET model_url=$1, x=$2, y=$3, z=$4,
                  rot_x=$5, rot_y=$6, rot_z=$7, scale=$8
            WHERE id=$9 AND interior_id=$10`,
          [
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
            (interior_id, model_url, x, y, z, rot_x, rot_y, rot_z, scale)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            id,
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




// Сохранить текущую карту в текстовый файл
app.post('/api/save-map', authenticate, async (req, res) => {
  const { cityId = 'unknown', objects, removedIds = [] } = req.body;
  if (!Array.isArray(objects) || !Array.isArray(removedIds)) {
    return res.status(400).json({ error: 'Invalid objects' });
  }
  try {
    const dir = pathLib.join(__dirname, 'saves');
    await fs.promises.mkdir(dir, { recursive: true });
    const file = `city_${cityId}_${Date.now()}.txt`;
    const filePath = pathLib.join(dir, file);
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
  res.sendFile(pathLib.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 4000;
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Логирование всех маршрутов и middleware
['get', 'post', 'put', 'delete', 'use'].forEach(method => {
  const orig = app[method];
  app[method] = function(path, ...args) {
    if (typeof path === 'string') {
      console.log(`Регистрируется ${method.toUpperCase()} маршрут:`, path);
    } else if (typeof path === 'function') {
      console.log(`Регистрируется middleware (без пути) через ${method}`);
    }
    return orig.call(this, path, ...args);
  };
});

// После ensureMessagesTable();
async function ensureInteriorsSpawnColumns() {
  try {
    await db.query('ALTER TABLE interiors ADD COLUMN IF NOT EXISTS spawn_x NUMERIC DEFAULT 0');
    await db.query('ALTER TABLE interiors ADD COLUMN IF NOT EXISTS spawn_y NUMERIC DEFAULT 0');
    await db.query('ALTER TABLE interiors ADD COLUMN IF NOT EXISTS spawn_z NUMERIC DEFAULT 0');
    await db.query('ALTER TABLE interiors ADD COLUMN IF NOT EXISTS spawn_rot NUMERIC DEFAULT 0');
    await db.query('ALTER TABLE interiors ADD COLUMN IF NOT EXISTS exit_x NUMERIC DEFAULT 0');
    await db.query('ALTER TABLE interiors ADD COLUMN IF NOT EXISTS exit_y NUMERIC DEFAULT 0');
    await db.query('ALTER TABLE interiors ADD COLUMN IF NOT EXISTS exit_z NUMERIC DEFAULT 0');
    await db.query('ALTER TABLE interiors ADD COLUMN IF NOT EXISTS exit_rot NUMERIC DEFAULT 0');
  } catch (e) {
    console.error('Ошибка добавления spawn/exit-колонок в interiors', e);
  }
}
ensureInteriorsSpawnColumns();