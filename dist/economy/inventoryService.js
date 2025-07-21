"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryService = void 0;
const db_1 = require("../db");
const ledgerService_1 = require("./ledgerService");
exports.inventoryService = {
    async addItem(userId, item) {
        ledgerService_1.ledgerService.log(`addItem ${userId} ${item.name}`);
        await (0, db_1.query)(`INSERT INTO inventory (user_id, item_id, name, quantity, stackable, weight)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, item_id)
       DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity`, [
            userId,
            item.id,
            item.name,
            item.quantity,
            item.stackable,
            item.weight,
        ]);
    },
    async removeItem(userId, itemId, quantity) {
        ledgerService_1.ledgerService.log(`removeItem ${userId} ${itemId}`);
        await (0, db_1.query)(`UPDATE inventory SET quantity = GREATEST(quantity - $3, 0)
       WHERE user_id=$1 AND item_id=$2`, [userId, itemId, quantity]);
        await (0, db_1.query)('DELETE FROM inventory WHERE user_id=$1 AND item_id=$2 AND quantity<=0', [userId, itemId]);
    },
    async getInventory(userId) {
        const { rows } = await (0, db_1.query)(`SELECT item_id AS id, name, quantity, stackable, weight
         FROM inventory WHERE user_id=$1`, [userId]);
        return rows;
    },
};
