// server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const socketIo = require('socket.io');

// Папка с публичными файлами (index.html, animations, модели и т.д.)
const publicDir = path.join(__dirname, 'public');

// Создаём HTTP сервер без Express
const server = http.createServer((req, res) => {
  // Определяем запрошенный файл (по умолчанию index.html)
  let safeUrl = req.url.split('?')[0];
  if (safeUrl === '/') safeUrl = '/index.html';
  const filePath = path.join(publicDir, safeUrl);

  // Предотвращаем выход за пределы папки public
  if (!filePath.startsWith(publicDir)) {
    res.statusCode = 403;
    return res.end('Access denied');
  }

  // Выбираем MIME тип по расширению
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.glb':  'model/gltf-binary',
    '.wasm': 'application/wasm'
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  // Читаем и отдаём файл
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

// Настраиваем Socket.IO поверх этого же сервера
const io = socketIo(server);
let players = {};

io.on('connection', socket => {
  console.log('Player connected:', socket.id);

  // Инициализируем нового игрока
  players[socket.id] = { x: 0, z: 0, playerId: socket.id, avatarURL: null };
  socket.emit('currentPlayers', players);

  // Новый игрок
  socket.on('newPlayer', data => {
    players[socket.id] = { x: data.x, z: data.z, playerId: socket.id, avatarURL: data.avatarURL || null };
    socket.broadcast.emit('newPlayer', { playerId: socket.id, x: data.x, z: data.z, avatarURL: data.avatarURL || null });
  });

  // Обновление позиции
  socket.on('playerMovement', movementData => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].z = movementData.z;
      socket.broadcast.emit('playerMoved', { playerId: socket.id, x: movementData.x, z: movementData.z });
    }
  });

  // Отключение
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

// Запуск сервера на порту 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
