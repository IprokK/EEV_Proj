require('dotenv').config();
const { Pool } = require('pg');

const connectionString =
    process.env.DATABASE_URL_VIRTUAL_WORLD;
console.log('Подключение к базе данных: ', connectionString);
const virtualWorldPool = new Pool({
  connectionString,
  ssl: false
});
 
// Обработка ошибок подключения
virtualWorldPool.on('error', (err) => {
    console.error('Ошибка подключения к базе данных:', err);
});

virtualWorldPool.on('connect', () => {
    console.log('Успешное подключение к базе данных');
});

module.exports = {
    query: (text, params) => virtualWorldPool.query(text, params)
};