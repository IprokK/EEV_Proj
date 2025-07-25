import { Server, Socket } from 'socket.io';
import { readFileSync } from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import type { Pool } from 'pg';

interface DBClient {
  query: (text: string, params?: any[]) => Promise<any>;
  pool: Pool;
}

export interface InventoryItem {
  item_id?: number;
  name: string;
  quantity: number;
  stackable: boolean;
  weight: number;
}

interface PendingUpdate {
  userId: number;
  health?: number;
  satiety?: number;
}

/**
 * Economy system providing account balances, transfers and inventory.
 */
export default class Economy {
  private io: Server;
  private db: DBClient;
  private config: any;
  private batch: Map<number, PendingUpdate> = new Map();
  private interval: NodeJS.Timeout;

  constructor(io: Server, db: DBClient) {
    this.io = io;
    this.db = db;
    const cfgPath = path.join(__dirname, 'economy', 'config.json');
    this.config = JSON.parse(readFileSync(cfgPath, 'utf8'));

    this.initTables().catch(err => this.log('error', 'initTables', err));
    this.ensureTreasuryRows().catch(err => this.log('error', 'ensureTreasury', err));
    this.registerSocketHandlers();
    this.interval = setInterval(() => this.flushBatch(), this.config.batchIntervalMinutes * 60 * 1000);
  }

  private async initTables() {
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

    await this.db.query(`CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      item_id INTEGER,
      name TEXT,
      quantity INTEGER,
      stackable BOOLEAN,
      weight NUMERIC
    );`);
  }

  private async ensureTreasuryRows() {
    try {
      const { rows } = await this.db.query('SELECT code FROM countries');
      for (const r of rows) {
        await this.db.query(
          'INSERT INTO treasury(country_code) VALUES($1) ON CONFLICT (country_code) DO NOTHING',
          [r.code]
        );
      }
    } catch (e) {
      this.log('error', 'ensureTreasuryRows failed', e);
    }
  }

  /**
   * Create account for a new user with starting balance from config.
   */
  async createAccount(userId: number, currency: string) {
    await this.db.query(
      'INSERT INTO accounts(user_id, currency, balance) VALUES($1,$2,$3)',
      [userId, currency, this.config.startBalance]
    );
    this.log('info', `Account created for user ${userId}`);
  }

  /**
   * Get account balance.
   */
  async getBalance(userId: number, currency: string): Promise<number> {
    this.log('info', 'getBalance', { userId, currency });
    const { rows } = await this.db.query(
      'SELECT balance FROM accounts WHERE user_id=$1 AND currency=$2',
      [userId, currency]
    );
    return rows[0]?.balance || 0;
  }

  /**
   * Transfer between users.
   */
  async transfer(fromUser: number, toUser: number, amount: number, currency: string, type: string) {
    this.log('info', 'transfer begin', { fromUser, toUser, amount, currency, type });
    const client = await this.db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'UPDATE accounts SET balance = balance - $1 WHERE user_id=$2 AND currency=$3',
        [amount, fromUser, currency]
      );
      const toRes = await client.query(
        'UPDATE accounts SET balance = balance + $1 WHERE user_id=$2 AND currency=$3 RETURNING balance',
        [amount, toUser, currency]
      );
      await client.query(
        'INSERT INTO transactions(from_account,to_account,amount,currency,type) VALUES($1,$2,$3,$4,$5)',
        [fromUser, toUser, amount, currency, type]
      );
      await client.query('COMMIT');
      this.io.emit('economy:balanceChanged', { userId: fromUser, currency, newBalance: await this.getBalance(fromUser, currency) });
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

  /**
   * Convert between currencies using static rates from config.
   */
  convert(amount: number, fromCurrency: string, toCurrency: string): number {
    this.log('info', 'convert request', { amount, fromCurrency, toCurrency });
    this.io.emit('economy:exchangeRateRequested', { fromCurrency, toCurrency });
    const rates = this.config.exchangeRates;
    const usd = amount / rates[fromCurrency];
    const result = usd * rates[toCurrency];
    this.io.emit('economy:exchangePerformed', { amount, fromCurrency, toCurrency, result });
    return result;
  }

  /** Add item to user inventory */
  async addItem(userId: number, item: InventoryItem) {
    await this.db.query(
      `INSERT INTO inventory(user_id, item_id, name, quantity, stackable, weight)
       VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity`,
      [userId, item.item_id, item.name, item.quantity, item.stackable, item.weight]
    );
    this.log('info', 'addItem', { userId, item });
  }

  /** Remove item from user inventory */
  async removeItem(userId: number, itemId: number, quantity: number) {
    await this.db.query(
      `UPDATE inventory SET quantity = GREATEST(quantity - $3,0) WHERE user_id=$1 AND item_id=$2`,
      [userId, itemId, quantity]
    );
    await this.db.query('DELETE FROM inventory WHERE user_id=$1 AND item_id=$2 AND quantity<=0', [userId, itemId]);
    this.log('info', 'removeItem', { userId, itemId, quantity });
  }

  /** Get inventory list */
  async getInventory(userId: number): Promise<InventoryItem[]> {
    const { rows } = await this.db.query('SELECT * FROM inventory WHERE user_id=$1', [userId]);
    return rows;
  }

  /** Schedule flush of non-critical updates */
  queueUpdate(update: PendingUpdate) {
    const existing = this.batch.get(update.userId) || {} as PendingUpdate;
    this.batch.set(update.userId, { ...existing, ...update });
  }

  private async flushBatch() {
    for (const upd of this.batch.values()) {
      try {
        await this.db.query(
          'UPDATE users SET health_level = COALESCE($2, health_level), satiety = COALESCE($3, satiety) WHERE id=$1',
          [upd.userId, upd.health, upd.satiety]
        );
      } catch (e) {
        this.log('error', 'flushBatch error', e);
      }
    }
    this.batch.clear();
  }

  private registerSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      socket.on('economy:getBalance', async ({ userId, currency }) => {
        const bal = await this.getBalance(userId, currency);
        socket.emit('economy:balanceChanged', { userId, currency, newBalance: bal });
      });
      socket.on('economy:transfer', async (data) => {
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
      socket.on('economy:exchange', ({ amount, fromCurrency, toCurrency }) => {
        const result = this.convert(amount, fromCurrency, toCurrency);
        socket.emit('economy:exchangeResult', { result });
      });
    });
  }

  private async log(level: string, message: string, meta?: any) {
    const entry = { level, message, meta, timestamp: new Date().toISOString() };
    console[level === 'error' ? 'error' : 'log'](`[Economy] ${message}`, meta || '');
    try {
      await fetch(this.config.monitoringEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
    } catch (e) {
      console.error('Monitoring send failed', e);
    }
  }
}
