// db.js
require('dotenv').config();
const { Pool } = require('pg');

console.log('Подключение к базе данных:', process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  // Добавляем обработку ошибок подключения
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20
});

// Обработка ошибок подключения
pool.on('error', (err) => {
  console.error('Ошибка подключения к базе данных:', err);
});

pool.on('connect', () => {
  console.log('Успешное подключение к базе данных');
});

module.exports = {
  /**
   * Execute a SQL query using the shared connection pool.
   * @param {string} text
   * @param {any[]} [params]
   */
  query: (text, params) => pool.query(text, params),

  /**
   * Expose the underlying pool for transactions or advanced usages.
   */
  pool
};
