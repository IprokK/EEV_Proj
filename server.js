let dotenv, express, db, Economy, GameTime, pathLib, fs, virtualWorldPool, new_quest_Base;
try {
  dotenv = require('dotenv').config();
  console.log('dotenv успешно импортирован');
} catch (e) {
  console.error('Ошибка при импорте dotenv:', e);
  console.log('Продолжаем без .env файла');
}

// Устанавливаем fallback значения для критических переменных окружения
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'fallback-secret-key-for-development';
  console.warn('JWT_SECRET не найден, используем fallback ключ (НЕ ДЛЯ ПРОДАКШЕНА!)');
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/revproj';
  console.warn('DATABASE_URL не найден, используем fallback (НЕ ДЛЯ ПРОДАКШЕНА!)');
}
try {
  express = require('express');
  console.log('express успешно импортирован');
} catch (e) {
  console.error('Ошибка при импорте express:', e);
  throw e;
}

try {
    virtualWorldPool = require('./db1');
    console.log('db1 - virtualWorld - успешно импротирован');
}
catch (e) {
    console.error('Ошибка при импорте db1 - virtual_World:', e);
    throw e;
}
/*
try {
    new_quest_Base = require('./db2');
    console.log('db2 - new_quest_Base - успешно импортирован');
}
catch (e) {
    console.error('Ошибка при импорте db2 - new_quest_Base: ', e);
    throw e;
}
*/
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

let onlineUsers = new Map();
let lastSeenTimes = new Map(); // Добавляем отслеживание времени последнего онлайн

const organizationsRouter = require('./server/organizations')(io, onlineUsers);
app.use('/api/organizations', organizationsRouter);

// Инициализация игрового времени (ускорение 8x) и вещание клиентам
try {
  if (GameTime && typeof GameTime === 'function') {
    global.__gameTimeInstance = global.__gameTimeInstance || new GameTime(io, 8);
    console.log('GameTime таймер запущен');
  }
} catch (e) {
  console.error('GameTime не запущен:', e);
}

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('No token'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.id;
    onlineUsers.set(socket.userId, socket.id); // Добавить пользователя в онлайн
    
    // Обновляем время последнего онлайн
    lastSeenTimes.set(socket.userId, new Date());
    console.log(`Пользователь ${socket.userId} стал онлайн, время: ${lastSeenTimes.get(socket.userId)}`);
    
    // Уведомляем всех клиентов о том, что пользователь стал онлайн
    socket.broadcast.emit('userStatusChanged', { 
      userId: socket.userId, 
      isOnline: true 
    });
    console.log(`Отправлено событие userStatusChanged для пользователя ${socket.userId} (онлайн)`);
    
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
      y: 0,
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
    socket.y = 0;
    socket.z = z;
    // Отправляем только игроков этого города
    socket.emit('currentPlayers', playersByCity[cityId]);
  })();

  // --- Новый игрок ---
  socket.on('newPlayer', data => {
    const cityId = socket.cityId || 1;
    if (!playersByCity[cityId]) playersByCity[cityId] = {};
    const p = playersByCity[cityId][socket.id] || {};
    Object.assign(p, {
      x: data.x,
      y: data.y ?? p.y ?? 0,
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
    // Сообщаем всем игрокам этого города (без учёта интерьера)
    for (const id in playersByCity[cityId]) {
      if (id === socket.id) continue;
      io.to(id).emit('newPlayer', {
        playerId: socket.id,
        x: p.x,
        y: p.y ?? 0,
        z: p.z,
        avatarURL: p.avatarURL,
        gender: p.gender,
        firstName: p.firstName,
        lastName: p.lastName
      });
    }
  });

  // --- Перемещение игрока ---
  socket.on('playerMovement', movementData => {
    const cityId = socket.cityId;
    if (playersByCity[cityId] && playersByCity[cityId][socket.id]) {
      playersByCity[cityId][socket.id].x = movementData.x;
      if (typeof movementData.y === 'number') {
        playersByCity[cityId][socket.id].y = movementData.y;
      }
      playersByCity[cityId][socket.id].z = movementData.z;
      // Сообщаем только игрокам этого города (без учёта интерьера)
      for (const id in playersByCity[cityId]) {
        if (id !== socket.id) {
          io.to(id).emit('playerMoved', {
            playerId: socket.id,
            x: movementData.x,
            y: typeof movementData.y === 'number' ? movementData.y : (playersByCity[cityId][socket.id].y ?? 0),
            z: movementData.z
          });
        }
      }
      // Voice chat nearby только в этом городе
      const norm = v => (v == null ? null : String(v));
      const sender = playersByCity[cityId][socket.id];
      for (const [id, other] of Object.entries(playersByCity[cityId])) {
        if (id === socket.id) continue;
        // Голосовой чат больше не фильтруем по интерьеру
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

  // --- Смена интерьера (вход/выход) ---
  socket.on('interiorChange', ({ interiorId }) => {
    const cityId = socket.cityId;
    if (!playersByCity[cityId] || !playersByCity[cityId][socket.id]) return;
    const norm = v => (v == null ? null : String(v));
    const prevInterior = playersByCity[cityId][socket.id].interiorId ?? null;
    const nextInterior = norm(interiorId);
    playersByCity[cityId][socket.id].interiorId = nextInterior;
    socket.interiorId = nextInterior;

    // Сообщаем игрокам старого интерьера, что этот игрок ушёл
    for (const id in playersByCity[cityId]) {
      if (id === socket.id) continue;
      const other = playersByCity[cityId][id];
      const samePrev = norm(other?.interiorId) === norm(prevInterior);
      if (samePrev && prevInterior !== nextInterior) {
        io.to(id).emit('playerDisconnected', socket.id);
      }
    }

    // Сообщаем всем игрокам города о появлении (без учёта интерьера)
    for (const id in playersByCity[cityId]) {
      if (id === socket.id) continue;
      const p = playersByCity[cityId][socket.id];
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

    // Отправляем текущий список видимых игроков только для этого сокета
    // Отправляем полный список игроков города
    socket.emit('currentPlayers', playersByCity[cityId]);
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
            const receiverSocketId = onlineUsers.get(recvId);

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
    // Обновляем время последнего онлайн
    lastSeenTimes.set(socket.userId, new Date());
    console.log(`Пользователь ${socket.userId} стал офлайн, время: ${lastSeenTimes.get(socket.userId)}`);
    
    // Уведомляем всех клиентов о том, что пользователь стал офлайн
    socket.broadcast.emit('userStatusChanged', { 
      userId: socket.userId, 
      isOnline: false 
    });
    console.log(`Отправлено событие userStatusChanged для пользователя ${socket.userId} (офлайн)`);
    
    onlineUsers.delete(socket.userId);
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

// API endpoint для получения статуса пользователей для Telegram
app.get('/api/users/status', authenticate, async (req, res) => {
    try {
        console.log(`Запрос статуса пользователей от пользователя ${req.user.id}`);
        
        const { rows } = await db.query(`
            SELECT id, first_name AS "firstName", last_name AS "lastName", avatar_url AS "avatarURL"
            FROM users
            WHERE id != $1
        `, [req.user.id]);
        
        // Добавляем статус online и время последнего онлайн для каждого пользователя
        const usersWithStatus = rows.map(user => ({
            ...user,
            isOnline: onlineUsers.has(user.id),
            lastSeen: lastSeenTimes.get(user.id) || null
        }));
        
        console.log(`Возвращено ${usersWithStatus.length} пользователей с статусом`);
        console.log('Онлайн пользователи:', Array.from(onlineUsers.keys()));
        
        res.json(usersWithStatus);
    } catch (e) {
        console.error('Ошибка получения статуса пользователей', e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API endpoint to get user information by ID
app.get('/api/users/:userId', authenticate, async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    try {
        const { rows } = await db.query(`
            SELECT id, first_name AS "firstName", last_name AS "lastName", avatar_url AS "avatarURL"
            FROM users
            WHERE id = $1
        `, [userId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = rows[0];
        const isOnline = onlineUsers.has(user.id);
        const lastSeen = lastSeenTimes.get(user.id) || new Date();
        res.json({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarURL: user.avatarURL,
            isOnline: isOnline,
            lastSeen: lastSeen
        });
    } catch (e) {
        console.error('Ошибка получения информации о пользователе по ID', e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API endpoint to get unread message count for a specific contact
app.get('/api/messages-read/:contactId', authenticate, async (req, res) => {
    const userId = req.user.id;
    const contactId = parseInt(req.params.contactId, 10);
    
    try {
        const { rows } = await db.query(`
            SELECT COUNT(*) as unread_count
            FROM messages 
            WHERE sender_id = $1 AND recipient_id = $2 AND is_read = false
        `, [contactId, userId]);
        
        res.json({ unreadCount: parseInt(rows[0].unread_count) });
    } catch (e) {
        console.error('Ошибка получения количества непрочитанных сообщений:', e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Новый маршрут для получения сообщений с конкретным контактом
app.get('/api/messages/:contactId', authenticate, async (req, res) => {
  const userId = req.user.id;
  const contactId = parseInt(req.params.contactId, 10);
  try {
    // Ensure table exists
      await virtualWorldPool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_read BOOLEAN NOT NULL DEFAULT FALSE
      )`);
  } catch (e) {
    console.warn('[GET /api/messages/:contactId] ensure table failed:', e.message);
  }

  try {
    const sql = `SELECT * FROM messages
                 WHERE (sender_id = $1 AND receiver_id = $2)
                    OR (sender_id = $2 AND receiver_id = $1)
                 ORDER BY created_at ASC`;
      const messagesRes = await virtualWorldPool.query(sql, [userId, contactId]);
    res.json(messagesRes.rows);
  } catch (err) {
    console.error('[GET /api/messages/:contactId] error:', err);
    res.status(500).json({ error: 'Ошибка получения сообщений' });
  }
});

app.get('/api/messages/:contactId', authenticate, async (req, res) => {
    const userId = req.user.id;
    const contactId = parseInt(req.params.contactId, 10);
    try {
        // Ensure table exists
        await virtualWorldPool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_read BOOLEAN NOT NULL DEFAULT FALSE
      )`);
    } catch (e) {
        console.warn('[GET /api/messages/:contactId] ensure table failed:', e.message);
    }

    try {
        const sql = `SELECT * FROM messages
                 WHERE (sender_id = $1 AND receiver_id = $2)
                    OR (sender_id = $2 AND receiver_id = $1)
                 ORDER BY created_at ASC`;
        const messagesRes = await virtualWorldPool.query(sql, [userId, contactId]);
        res.json(messagesRes.rows);
    } catch (err) {
        console.error('[GET /api/messages/:contactId] error:', err);
        res.status(500).json({ error: 'Ошибка получения сообщений' });
    }
});

app.get('/api/messages-read/:contactId', authenticate, async (req, res) => {
    const userId = req.user.id;
    const contactId = parseInt(req.params.contactId, 10);

    try {
        // Проверяем есть ли НЕпрочитанные сообщения от этого контакта
        const sql = `SELECT EXISTS (
            SELECT 1 FROM messages 
            WHERE sender_id = $1 
            AND receiver_id = $2 
            AND is_read = false
            AND sender_id != receiver_id
        ) as has_unread`;

        const result = await virtualWorldPool.query(sql, [contactId, userId]);

        // Если есть непрочитанные - возвращаем "true", иначе "false"
        const hasUnread = result.rows[0].has_unread;
        res.json(hasUnread ? "true" : "false");

    } catch (err) {
        console.error('[GET /api/messages-read/:contactId] error:', err);
        res.status(500).json({ error: 'Ошибка проверки состояния' });
    }
});




app.post('/api/messages-read-true-false', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { contactId } = req.body;

        if (!contactId) {
            return res.status(400).json({ error: 'contactId required' });
        }

        // Проверяем что contactId не равен ID текущего пользователя
        if (parseInt(contactId) === userId) {
            return res.json({ success: true, skipped: 'Нельзя отмечать свои собственные сообщения' });
        }

        // Отмечаем сообщения как прочитанные ТОЛЬКО если отправитель ≠ получатель
        await virtualWorldPool.query(
            `UPDATE messages 
             SET is_read = true 
             WHERE sender_id = $1 AND receiver_id = $2 
             AND sender_id != receiver_id`,  // Добавляем проверку
            [contactId, userId]
        );

        res.json({ success: true });

    } catch (error) {
        console.error('Error updating read status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.post('/api/messages/send', authenticate, async (req, res) => {
  const senderId = req.user.id;
  const { receiverId, message } = req.body || {};
  const recvId = parseInt(receiverId, 10);
  console.log('[POST /api/messages/send] sender:', senderId, 'receiver:', recvId);
  try {
      const receiverCheck = await db.query('SELECT id FROM users WHERE id = $1', [recvId]);
    if (receiverCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    try {
        await virtualWorldPool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          sender_id INT NOT NULL,
          receiver_id INT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          is_read BOOLEAN NOT NULL DEFAULT FALSE
        )`);
    } catch (e) {
      console.warn('[POST /api/messages/send] ensure table failed:', e.message);
    }

      const result = await virtualWorldPool.query(
      `INSERT INTO messages (sender_id, receiver_id, message, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, created_at, is_read`,
      [senderId, recvId, message]
    );
    const newMessage = result.rows[0];

            const receiverSocketId = onlineUsers.get(recvId);
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
    console.error('[POST /api/messages/send] error:', err);
    res.status(500).json({ error: 'Ошибка отправки сообщения' });
  }
});

app.get('/api/messages', authenticate, async (req, res) => {
  const userId = req.user.id;
    try {
        await virtualWorldPool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_read BOOLEAN NOT NULL DEFAULT FALSE
      )`);
  } catch (e) {
    console.warn('[GET /api/messages] ensure table failed:', e.message);
  }
  try {
      const messagesRes = await virtualWorldPool.query(
      `SELECT * FROM messages
       WHERE sender_id = $1 OR receiver_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    if (messagesRes.rows.length === 0) {
      return res.json([]);
    }
    const userIds = new Set();
    messagesRes.rows.forEach(msg => { userIds.add(msg.sender_id); userIds.add(msg.receiver_id); });
      const usersRes = await virtualWorldPool.query(
      `SELECT id, first_name, last_name, avatar_url FROM users WHERE id = ANY($1)`,
      [Array.from(userIds)]
    );
    const userMap = {};
    usersRes.rows.forEach(user => {
      userMap[user.id] = { name: `${user.first_name} ${user.last_name}`, avatar: user.avatar_url };
    });
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
    console.error('[GET /api/messages] error:', err);
    res.status(500).json({ error: 'Ошибка получения сообщений' });
  }
});

app.patch('/api/messages/:id/read', authenticate, async (req, res) => {
  const messageId = req.params.id;
  const userId = req.user.id;
  try {
      await virtualWorldPool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_read BOOLEAN NOT NULL DEFAULT FALSE
      )`);
  } catch (e) {
    console.warn('[PATCH /api/messages/:id/read] ensure table failed:', e.message);
  }
  try {
      const checkRes = await virtualWorldPool.query(`SELECT id FROM messages WHERE id = $1 AND receiver_id = $2`, [messageId, userId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Сообщение не найдено или доступ запрещен' });
    }
      await virtualWorldPool.query(`UPDATE messages SET is_read = true WHERE id = $1`, [messageId]);
    res.status(204).end();
  } catch (err) {
    console.error('[PATCH /api/messages/:id/read] error:', err);
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
  
  const user = rows[0];
  
  // Автоматически исправляем неправильный avatarURL
  if (!user.avatarURL || user.avatarURL === 'try' || user.avatarURL === 'undefined' || user.avatarURL === 'null') {
    console.log(`Исправляем неправильный avatarURL для пользователя ${userId}: ${user.avatarURL} -> /models/character.glb`);
    
    try {
      await db.query(
        'UPDATE users SET avatar_url = $1 WHERE id = $2',
        ['/models/character.glb', userId]
      );
      user.avatarURL = '/models/character.glb';
    } catch (e) {
      console.error('Ошибка обновления avatarURL:', e);
    }
  }
  
  res.json(user);
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
      diseases
     FROM users
     WHERE id = $1
   `, [dbId]);

  if (!rows.length) return res.status(404).json({ error: 'User not found in database' });
  
  const user = rows[0];
  
  // Автоматически исправляем неправильный avatarURL
  if (!user.avatarURL || user.avatarURL === 'try' || user.avatarURL === 'undefined' || user.avatarURL === 'null') {
    console.log(`Исправляем неправильный avatarURL для игрока ${dbId}: ${user.avatarURL} -> /models/character.glb`);
    
    try {
      await db.query(
        'UPDATE users SET avatar_url = $1 WHERE id = $2',
        ['/models/character.glb', dbId]
      );
      user.avatarURL = '/models/character.glb';
    } catch (e) {
      console.error('Ошибка обновления avatarURL:', e);
    }
  }
  
  res.json(user);
});

app.post('/api/register', async (req, res) => {
  try {
    console.log('register request:', req.body?.email);
   const { email, password, firstName, lastName, gender, age, city, avatarURL } = req.body || {};

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Не заполнены обязательные поля' });
    }

    const { rowCount } = await db.query(`SELECT 1 FROM users WHERE email = $1`, [email]);
    if (rowCount) return res.status(400).json({ error: 'Почта уже занята' });
    const hash = await bcrypt.hash(password, 10);
    const insertSQL = `
      INSERT INTO users(email, password_hash, first_name, last_name, gender, age, city, avatar_url)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id, email, created_at
    `;
    const result = await db.query(insertSQL, [
     email, hash, firstName, lastName, gender ?? null, age ?? null, city ?? null, avatarURL ?? null
    ]);

   const user = result.rows[0];
   // Не даём регистрации упасть, если экономика не завелась
    try {
      await Economy.createAccount(user.id, 'USD');
    } catch (e) {
      console.error('Economy.createAccount failed:', e);
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET не задан в окружении (.env)');
      return res.status(500).json({ error: 'Ошибка конфигурации сервера' });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ success: true, token });
  } catch (e) {
    console.error('Ошибка регистрации:', e);
    res.status(500).json({ error: 'Внутренняя ошибка регистрации' });
  }
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
      SELECT id,
             name,
             model_url,
             pos_x, pos_y, pos_z,
             rot_x, rot_y, rot_z,
             COALESCE(scale_x, 1) AS scale_x,
             COALESCE(scale_y, 1) AS scale_y,
             COALESCE(scale_z, 1) AS scale_z,
             organization_id,
             COALESCE(collidable, true) AS collidable,
             COALESCE(textures, '-') AS textures
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

// Обновить avatarURL пользователя
app.put('/api/profile/avatar', authenticate, async (req, res) => {
  const { avatarURL } = req.body;
  const userId = req.user.id;
  
  try {
    // Проверяем, что avatarURL не пустой и валидный
    if (!avatarURL || avatarURL === 'try' || avatarURL === 'undefined' || avatarURL === 'null') {
      return res.status(400).json({ error: 'Неправильный avatarURL' });
    }
    
    await db.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2',
      [avatarURL, userId]
    );
    
    res.json({ success: true, avatarURL });
  } catch (e) {
    console.error('Ошибка обновления avatarURL:', e);
    res.status(500).json({ error: 'Ошибка обновления avatarURL' });
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
    const base = await db.query(
      'SELECT spawn_x, spawn_y, spawn_z, spawn_rot, exit_x, exit_y, exit_z, exit_rot FROM interiors WHERE id = $1',
      [interiorId]
    );
    const interior = base.rows[0];
    if (!interior) return res.status(404).json({ error: 'Интерьер не найден' });

    let exitInt = null;
    try {
      const extra = await db.query(
        'SELECT exit_int_x, exit_int_y, exit_int_z FROM interiors WHERE id = $1',
        [interiorId]
      );
      if (extra.rows[0] && (extra.rows[0].exit_int_x != null || extra.rows[0].exit_int_y != null || extra.rows[0].exit_int_z != null)) {
        exitInt = {
          x: extra.rows[0].exit_int_x,
          y: extra.rows[0].exit_int_y,
          z: extra.rows[0].exit_int_z
        };
      }
    } catch (e2) {
      // Колонки exit_int_* могут отсутствовать — это не ошибка для клиента
      console.warn('exit_int_* columns are not available yet:', e2.message);
    }

    // Эффективная точка входа: если spawn_x/y/z не заданы (или равны 0),
    // пробуем использовать внутреннюю точку выхода (exit_int_*),
    // иначе в крайнем случае используем координаты внешнего выхода.
    const rawSpawn = {
      x: interior.spawn_x,
      y: interior.spawn_y,
      z: interior.spawn_z,
      rot: interior.spawn_rot
    };
    const isZeroOrNull = v => v == null || Number(v) === 0;
    const spawnLooksEmpty = isZeroOrNull(rawSpawn.x) && isZeroOrNull(rawSpawn.y) && isZeroOrNull(rawSpawn.z);

    let effectiveSpawn = { ...rawSpawn };
    if (spawnLooksEmpty) {
      if (exitInt && typeof exitInt.x === 'number' && typeof exitInt.z === 'number') {
        effectiveSpawn = { x: exitInt.x, y: exitInt.y ?? 0, z: exitInt.z, rot: rawSpawn.rot };
      } else if (!isZeroOrNull(interior.exit_x) || !isZeroOrNull(interior.exit_y) || !isZeroOrNull(interior.exit_z)) {
        // Фолбэк на внешние координаты выхода, если они заданы
        effectiveSpawn = { x: interior.exit_x, y: interior.exit_y, z: interior.exit_z, rot: rawSpawn.rot };
      }
    }

    // Логируем вычисленные координаты для отладки
    try {
      console.log('[INTERIOR ENTER]', {
        interiorId,
        spawn: effectiveSpawn,
        rawSpawn,
        exit: { x: interior.exit_x, y: interior.exit_y, z: interior.exit_z, rot: interior.exit_rot },
        exitInt
      });
    } catch (_) {}

    res.json({
      spawn: effectiveSpawn,
      exit: {
        x: interior.exit_x,
        y: interior.exit_y,
        z: interior.exit_z,
        rot: interior.exit_rot
      },
      exitInt
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
  try {
    console.log('[API /api/listen] Request body:', req.body);
    const { player_id: bodyPlayerId, json_filename } = req.body || {};
    const authUser = req.user || {};
    const effectivePlayerId = bodyPlayerId || authUser.email || authUser.id || authUser.userId;
    if (!effectivePlayerId || !json_filename) {
      return res.status(400).json({ success: false, error: 'player_id and json_filename are required' });
    }

    // Выбираем пул: если есть отдельный пул, берём его, иначе общий db
    try {
      // Создаём таблицу при необходимости
        await virtualWorldPool.query(`
        CREATE TABLE IF NOT EXISTS json_listened (
          id SERIAL PRIMARY KEY,
          player_id TEXT NOT NULL,
          json_filename TEXT NOT NULL,
          listened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
    } catch (e) {
      console.warn('[API /api/listen] ensure table failed:', e.message);
    }

    const q = `INSERT INTO json_listened (player_id, json_filename, listened_at) VALUES ($1, $2, NOW())`;
      await virtualWorldPool.query(q, [String(effectivePlayerId), String(json_filename)]);
    console.log('[API /api/listen] Saved listened:', { player: effectivePlayerId, json: json_filename });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[API /api/listen] error:', err);
    return res.status(500).json({ success: false, error: 'Database operation failed', details: err.message });
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
        // ВМЕСТО получения email, используем напрямую ID пользователя
        const userId = req.user.id.toString(); // Преобразуем в строку для consistency

        // Получаем список всех квестов с их JSON файлами
        const questsQuery = await virtualWorldPool.query(`
            SELECT q.id, q.title, qj.json_filename
            FROM quests q
            JOIN quest_jsons qj ON q.id = qj.quest_id
            ORDER BY q.id
        `);

        // Получаем JSON файлы, которые прослушал игрок по его ID
        const listenedQuery = await virtualWorldPool.query(`
            SELECT json_filename FROM json_listened 
            WHERE player_id = $1
        `, [userId]); // Используем ID вместо email

        console.log("Результат запроса listenedQuery для ID", userId, ":", listenedQuery.rows);

        const listenedFiles = new Set(listenedQuery.rows.map(row => row.json_filename));
        console.log("Прослушанные файлы:", Array.from(listenedFiles));

        // Остальной код без изменений...
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

// Коллизии карты: загрузка/сохранение файла public/colliders.json
app.get('/api/colliders', authenticate, async (req, res) => {
  const cityId = Number(req.query.cityId) || 0;
  try {
    const fileName = cityId ? `colliders_city_${cityId}.json` : 'colliders.json';
    const filePath = pathLib.join(__dirname, 'public', fileName);
    try {
      const raw = await fs.promises.readFile(filePath, 'utf8');
      const json = JSON.parse(raw);
      return res.json(json);
    } catch (e) {
      // Если нет файла — создаём пустой
      const empty = { colliders: [] };
      await fs.promises.mkdir(pathLib.join(__dirname, 'public'), { recursive: true });
      await fs.promises.writeFile(filePath, JSON.stringify(empty, null, 2), 'utf8');
      return res.json(empty);
    }
  } catch (e) {
    console.error('Ошибка чтения colliders.json:', e);
    res.status(500).json({ error: 'Ошибка чтения коллизий' });
  }
});

app.post('/api/colliders', authenticate, async (req, res) => {
  try {
    const { colliders, cityId } = req.body || {};
    if (!Array.isArray(colliders)) {
      return res.status(400).json({ error: 'Invalid colliders' });
    }
    const fileName = cityId ? `colliders_city_${Number(cityId)}.json` : 'colliders.json';
    const filePath = pathLib.join(__dirname, 'public', fileName);
    await fs.promises.mkdir(pathLib.join(__dirname, 'public'), { recursive: true });
    await fs.promises.writeFile(filePath, JSON.stringify({ colliders }, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (e) {
    console.error('Ошибка записи colliders.json:', e);
    res.status(500).json({ error: 'Ошибка сохранения коллизий' });
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
const server = http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Обработка сигналов для graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  gracefulShutdown();
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  gracefulShutdown();
});

function gracefulShutdown() {
  console.log('Уведомляем всех клиентов о перезагрузке сервера...');
  
  // Отправляем уведомление всем подключенным клиентам
  io.emit('serverRestart', { 
    message: 'Сервер будет перезагружен через 5 секунд. Пожалуйста, сохраните прогресс.',
    restartIn: 5000
  });
  
  // Даем время клиентам получить уведомление
  setTimeout(() => {
    console.log('Закрываем сервер...');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
    
    // Принудительно закрываем через 10 секунд
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  }, 5000);
}

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

// Добавляем колонки масштаба для городских объектов, если ещё не созданы
async function ensureCityObjectsScaleColumns() {
  try {
    await db.query('ALTER TABLE city_objects ADD COLUMN IF NOT EXISTS scale_x NUMERIC DEFAULT 1');
    await db.query('ALTER TABLE city_objects ADD COLUMN IF NOT EXISTS scale_y NUMERIC DEFAULT 1');
    await db.query('ALTER TABLE city_objects ADD COLUMN IF NOT EXISTS scale_z NUMERIC DEFAULT 1');
  } catch (e) {
    console.error('Ошибка добавления scale колонок в city_objects', e);
  }
}
ensureCityObjectsScaleColumns();