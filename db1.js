require('dotenv').config();
const { Pool } = require('pg');

const virtualWorldPool = new Pool({
    connectionString: process.env.DATABASE_URL_VIRTUAL_WORLD,
    ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false
});

module.exports = {
    virtualWorldPool: {
        query: (text, params) => virtualWorldPool.query(text, params)
    }
};