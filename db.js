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
