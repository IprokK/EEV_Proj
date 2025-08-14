const { readFileSync } = require('fs');
const path = require('path');
const fetch = require('node-fetch');

class Economy {
  constructor(io, db) {
    this.io = io;
    this.db = db;
    const cfgPath = path.join(__dirname, 'economy', 'config.json');
    this.config = JSON.parse(readFileSync(cfgPath, 'utf8'));
    this.batch = new Map();
    this.initTables().catch(err => this.log('error', 'initTables', err));
    this.ensureTreasuryRows().catch(err => this.log('error', 'ensureTreasury', err));
    this.registerSocketHandlers();
    this.interval = setInterval(() => this.flushBatch(), this.config.batchIntervalMinutes * 60 * 1000);
  }

  async initTables() {
    await this.db.query(`CREATE TABLE IF NOT EXISTS treasury (
      id SERIAL PRIMARY KEY,
      country_code TEXT UNIQUE,
      balance NUMERIC DEFAULT 0
    );`);

    await this.db.query(`CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      currency TEXT,
      balance NUMERIC
    );`);

    await this.db.query(`CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      from_account INTEGER,
      to_account INTEGER,
      amount NUMERIC,
      currency TEXT,
      type TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );`);

    await this.db.query(`CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE,
      name TEXT NOT NULL,
      type TEXT,
      weight NUMERIC DEFAULT 1,
      hunger_gain NUMERIC DEFAULT 0,
      thirst_gain NUMERIC DEFAULT 0,
      stackable BOOLEAN DEFAULT true,
      functions JSONB DEFAULT '{}'::jsonb
    );`);

    await this.db.query(`CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      item_id INTEGER,
      name TEXT,
      quantity INTEGER,
      stackable BOOLEAN,
      weight NUMERIC
    );`);

    await this.db.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_user_item ON inventory(user_id, item_id)'
    );

    await this.db.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS satiety NUMERIC DEFAULT 100'
    );
    await this.db.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS thirst NUMERIC DEFAULT 100'
    );
  }

  async ensureTreasuryRows() {
    try {
      // ищем подходящее поле для "кода страны"
      const cand = await this.db.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'countries'
          AND column_name IN ('code','iso_code','alpha2','alpha3')
        LIMIT 1
      `);
      const col = cand.rows[0]?.column_name || 'name';

      const { rows } = await this.db.query(`SELECT ${col} AS code FROM countries`);
      for (const r of rows) {
        await this.db.query(
          'INSERT INTO treasury(country_code) VALUES($1) ON CONFLICT (country_code) DO NOTHING',
          [String(r.code)]
        );
      }
    } catch (e) {
      this.log('error', 'ensureTreasuryRows failed', e);
    }
  }


  async createAccount(userId, currency) {
    const res = await this.db.query('SELECT balance FROM users WHERE id=$1', [userId]);
    const initial = res.rows[0] ? parseFloat(res.rows[0].balance) : this.config.startBalance;
    if (!res.rows.length) return;
    if (res.rows[0].balance == null) {
      await this.db.query('UPDATE users SET balance=$2 WHERE id=$1', [userId, initial]);
    }
    await this.db.query(
      'INSERT INTO accounts(user_id, currency, balance) VALUES($1,$2,$3) ON CONFLICT (user_id, currency) DO NOTHING',
      [userId, currency, initial]
    );
    this.log('info', `Account ensured for user ${userId} with balance ${initial}`);
  }

  async getBalance(userId, currency) {
    this.log('info', 'getBalance', { userId, currency });
    const { rows } = await this.db.query('SELECT balance FROM users WHERE id=$1', [userId]);
    return rows[0] ? parseFloat(rows[0].balance) : 0;
  }

  async transfer(fromUser, toUser, amount, currency, type) {
    this.log('info', 'transfer begin', { fromUser, toUser, amount, currency, type });
    const client = await this.db.pool.connect();
    try {
      await client.query('BEGIN');
      const fromRes = await client.query(
        'UPDATE users SET balance = balance - $1 WHERE id=$2 RETURNING balance',
        [amount, fromUser]
      );
      const toRes = await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id=$2 RETURNING balance',
        [amount, toUser]
      );
      await client.query(
        'INSERT INTO transactions(from_account,to_account,amount,currency,type) VALUES($1,$2,$3,$4,$5)',
        [fromUser, toUser, amount, currency, type]
      );
      await client.query('COMMIT');
      this.io.emit('economy:balanceChanged', { userId: fromUser, currency, newBalance: fromRes.rows[0].balance });
      this.io.emit('economy:balanceChanged', { userId: toUser, currency, newBalance: toRes.rows[0].balance });
      this.io.emit('economy:transactionRecorded', { fromUser, toUser, amount, currency, type });
    } catch (e) {
      await client.query('ROLLBACK');
      this.log('error', 'transfer failed', e);
      throw e;
    } finally {
      client.release();
    }
  }

  convert(amount, fromCurrency, toCurrency) {
    this.log('info', 'convert request', { amount, fromCurrency, toCurrency });
    this.io.emit('economy:exchangeRateRequested', { fromCurrency, toCurrency });
    const rates = this.config.exchangeRates;
    const usd = amount / rates[fromCurrency];
    const result = usd * rates[toCurrency];
    this.io.emit('economy:exchangePerformed', { amount, fromCurrency, toCurrency, result });
    return result;
  }

  async addItem(userId, item) {
    await this.db.query(
      `INSERT INTO inventory(user_id, item_id, name, quantity, stackable, weight)
       VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity`,
      [userId, item.item_id, item.name, item.quantity, item.stackable, item.weight]
    );
    this.log('info', 'addItem', { userId, item });
  }

  async removeItem(userId, itemId, quantity) {
    await this.db.query(
      `UPDATE inventory SET quantity = GREATEST(quantity - $3,0) WHERE user_id=$1 AND item_id=$2`,
      [userId, itemId, quantity]
    );
    await this.db.query('DELETE FROM inventory WHERE user_id=$1 AND item_id=$2 AND quantity<=0', [userId, itemId]);
    this.log('info', 'removeItem', { userId, itemId, quantity });
  }

  async getInventory(userId) {
    const { rows } = await this.db.query('SELECT * FROM inventory WHERE user_id=$1', [userId]);
    return rows;
  }

  queueUpdate(update) {
    const existing = this.batch.get(update.userId) || {};
    this.batch.set(update.userId, { ...existing, ...update });
  }

  async flushBatch() {
    for (const upd of this.batch.values()) {
      try {
        await this.db.query(
          'UPDATE users SET health_level = COALESCE($2, health_level), satiety = COALESCE($3, satiety), thirst = COALESCE($4, thirst) WHERE id=$1',
          [upd.userId, upd.health, upd.satiety, upd.thirst]
        );
      } catch (e) {
        this.log('error', 'flushBatch error', e);
      }
    }
    this.batch.clear();
  }

  registerSocketHandlers() {
    this.io.on('connection', socket => {
       socket.on('economy:getBalance', async ({ userId }) => {
         const effectiveUserId = userId ?? socket.userId;
         const bal = await this.getBalance(effectiveUserId);
         socket.emit('economy:balanceChanged', { userId: effectiveUserId, newBalance: bal });
      });

      socket.on('economy:transfer', async data => {
        try {
          await this.transfer(data.fromUser, data.toUser, data.amount, data.currency, data.type);
        } catch (e) {
          socket.emit('economy:error', { message: 'transfer failed' });
        }
      });

      socket.on('economy:buyItem', async ({ userId, item }) => {
        await this.addItem(userId, item);
      });

      socket.on('economy:getInventory', async ({ userId }) => {
        socket.emit('economy:inventory', await this.getInventory(userId));
      });

      socket.on('economy:removeItem', async ({ userId, itemId, quantity }) => {
        await this.removeItem(userId, itemId, quantity);
        socket.emit('economy:inventory', await this.getInventory(userId));
      });

      socket.on('economy:updateStats', data => {
        this.queueUpdate({ userId: socket.userId, ...data });
      });

      socket.on('economy:exchange', ({ amount, fromCurrency, toCurrency }) => {
        const result = this.convert(amount, fromCurrency, toCurrency);
        socket.emit('economy:exchangeResult', { result });
      });
    });
  }

    async log(level, message, meta) {
      const entry = { level, message, meta, timestamp: new Date().toISOString() };
      console[level === 'error' ? 'error' : 'log'](`[Economy] ${message}`, meta || '');

      const url = this.config.monitoringEndpoint;
      // отключаем внешний вызов, если endpoint пустой или примерный
      if (!url || /(^|\.)example\.com$/.test(new URL(url).hostname)) return;

      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });
      } catch (e) {
        // глушим сетевую ошибку, чтобы не засорять логи
      }
    }
  }

module.exports = Economy;
