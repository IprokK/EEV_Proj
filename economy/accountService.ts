import { pool } from '../db';
import { ledgerService } from './ledgerService';

export const accountService = {
  /**
   * Get balance for user in currency.
   */
  async getBalance(userId: number, currency: string): Promise<number> {
    const { rows } = await pool.query(
      'SELECT balance FROM accounts WHERE user_id=$1 AND currency=$2',
      [userId, currency]
    );
    return rows[0]?.balance ?? 0;
  },

  async ensureAccount(userId: number, currency: string, initial = 0) {
    await pool.query(
      `INSERT INTO accounts(user_id, currency, balance)
       VALUES($1,$2,$3)
       ON CONFLICT (user_id, currency)
       DO NOTHING`,
      [userId, currency, initial]
    );
  },

  /**
   * Transfer funds between users atomically.
   */
  async transfer(
    fromUser: number,
    toUser: number,
    amount: number,
    currency: string,
    type: string
  ) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const fromRes = await client.query(
        'UPDATE accounts SET balance = balance - $1 WHERE user_id=$2 AND currency=$3 RETURNING id',
        [amount, fromUser, currency]
      );
      const toRes = await client.query(
        'UPDATE accounts SET balance = balance + $1 WHERE user_id=$2 AND currency=$3 RETURNING id',
        [amount, toUser, currency]
      );
      const fromAcc = fromRes.rows[0]?.id;
      const toAcc = toRes.rows[0]?.id;
      await client.query(
        `INSERT INTO transactions(from_account,to_account,amount,currency,type)
         VALUES($1,$2,$3,$4,$5)`,
        [fromAcc, toAcc, amount, currency, type]
      );
      await client.query('COMMIT');
      ledgerService.log(
        `transfer ${amount} ${currency} from ${fromUser} to ${toUser} (${type})`
      );
    } catch (e) {
      await client.query('ROLLBACK');
      ledgerService.error('transfer failed ' + e);
      throw e;
    } finally {
      client.release();
    }
  },
};
