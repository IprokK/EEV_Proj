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