"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountService = void 0;
const db_1 = require("../db");
const ledgerService_1 = require("./ledgerService");
exports.accountService = {
    /**
     * Get balance for user in currency.
     */
    async getBalance(userId, currency) {
        var _a, _b;
        const { rows } = await db_1.pool.query('SELECT balance FROM accounts WHERE user_id=$1 AND currency=$2', [userId, currency]);
        return (_b = (_a = rows[0]) === null || _a === void 0 ? void 0 : _a.balance) !== null && _b !== void 0 ? _b : 0;
    },
    async ensureAccount(userId, currency, initial = 0) {
        await db_1.pool.query(`INSERT INTO accounts(user_id, currency, balance)
       VALUES($1,$2,$3)
       ON CONFLICT (user_id, currency)
       DO NOTHING`, [userId, currency, initial]);
    },
    /**
     * Transfer funds between users atomically.
     */
    async transfer(fromUser, toUser, amount, currency, type) {
        var _a, _b;
        const client = await db_1.pool.connect();
        try {
            await client.query('BEGIN');
            const fromRes = await client.query('UPDATE accounts SET balance = balance - $1 WHERE user_id=$2 AND currency=$3 RETURNING id', [amount, fromUser, currency]);
            const toRes = await client.query('UPDATE accounts SET balance = balance + $1 WHERE user_id=$2 AND currency=$3 RETURNING id', [amount, toUser, currency]);
            const fromAcc = (_a = fromRes.rows[0]) === null || _a === void 0 ? void 0 : _a.id;
            const toAcc = (_b = toRes.rows[0]) === null || _b === void 0 ? void 0 : _b.id;
            await client.query(`INSERT INTO transactions(from_account,to_account,amount,currency,type)
         VALUES($1,$2,$3,$4,$5)`, [fromAcc, toAcc, amount, currency, type]);
            await client.query('COMMIT');
            ledgerService_1.ledgerService.log(`transfer ${amount} ${currency} from ${fromUser} to ${toUser} (${type})`);
        }
        catch (e) {
            await client.query('ROLLBACK');
            ledgerService_1.ledgerService.error('transfer failed ' + e);
            throw e;
        }
        finally {
            client.release();
        }
    },
};
