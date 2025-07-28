const fs = require('fs');
const path = require('path');

class GameTime {
  constructor(io, speed = 8) {
    this.io = io;
    this.speed = speed;
    this.file = path.join(__dirname, 'saves', 'game_time.json');
    this.load();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  load() {
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.gameTime = new Date(data.time);
      this.lastReal = data.lastReal;
    } catch {
      this.gameTime = new Date('2025-01-01T00:00:00Z');
      this.lastReal = Date.now();
    }
  }

  save() {
    fs.writeFileSync(
      this.file,
      JSON.stringify({ time: this.gameTime.toISOString(), lastReal: this.lastReal })
    );
  }

  tick() {
    const now = Date.now();
    const diff = now - this.lastReal;
    this.gameTime = new Date(this.gameTime.getTime() + diff * this.speed);
    this.lastReal = now;
    this.io.emit('gameTime:update', { time: this.gameTime.toISOString() });
    this.save();
  }
}

module.exports = GameTime;
