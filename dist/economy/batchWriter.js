"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchWriter = void 0;
const db_1 = require("../db");
const ledgerService_1 = require("./ledgerService");
const currencyService_1 = require("./currencyService");
const queue = [];
exports.batchWriter = {
    queue(update) {
        queue.push(update);
    },
    async flush() {
        if (!queue.length)
            return;
        const client = await db_1.pool.connect();
        try {
            await client.query('BEGIN');
            for (const upd of queue.splice(0, queue.length)) {
                await client.query(upd.query, upd.params);
            }
            await client.query('COMMIT');
            ledgerService_1.ledgerService.log('batchWriter flushed');
        }
        catch (e) {
            await client.query('ROLLBACK');
            ledgerService_1.ledgerService.error('batchWriter failed ' + e);
        }
        finally {
            client.release();
        }
    },
    start() {
        setInterval(() => this.flush(), currencyService_1.currencyService.config.batchIntervalMs);
    },
};
