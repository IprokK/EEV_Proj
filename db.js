// db.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false
});

module.exports = {
  /**
   * Execute a query on the default pool.
   * @param {string} text SQL query text
   * @param {any[]} [params] Query parameters
   */
  query: (text, params) => pool.query(text, params),
  /**
   * Export the underlying pool for transactions.
   */
  pool
};
