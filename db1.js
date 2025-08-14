require('dotenv').config();
const { Pool } = require('pg');

const connectionString =
  process.env.DATABASE_URL_VIRTUAL_WORLD || process.env.DATABASE_URL;

const virtualWorldPool = new Pool({
  connectionString,
  ssl: false
});

module.exports = {
  virtualWorldPool: {
    query: (text, params) => virtualWorldPool.query(text, params)
  }
};