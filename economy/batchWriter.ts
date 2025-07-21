import { pool } from '../db';
import { ledgerService } from './ledgerService';
import { currencyService } from './currencyService';

interface Update {
  query: string;
  params?: any[];
}

const queue: Update[] = [];

export const batchWriter = {
  queue(update: Update) {
    queue.push(update);
  },

  async flush() {
    if (!queue.length) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const upd of queue.splice(0, queue.length)) {
        await client.query(upd.query, upd.params);
      }
      await client.query('COMMIT');
      ledgerService.log('batchWriter flushed');
    } catch (e) {
      await client.query('ROLLBACK');
      ledgerService.error('batchWriter failed ' + e);
    } finally {
      client.release();
    }
  },

  start() {
    setInterval(() => this.flush(), currencyService.config.batchIntervalMs);
  },
};
