import { query } from '../db';
import { ledgerService } from './ledgerService';

export interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  stackable: boolean;
  weight: number;
}

export const inventoryService = {
  async addItem(userId: number, item: InventoryItem) {
    ledgerService.log(`addItem ${userId} ${item.name}`);
    await query(
      `INSERT INTO inventory (user_id, item_id, name, quantity, stackable, weight)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, item_id)
       DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity`,
      [
        userId,
        item.id,
        item.name,
        item.quantity,
        item.stackable,
        item.weight,
      ]
    );
  },

  async removeItem(userId: number, itemId: number, quantity: number) {
    ledgerService.log(`removeItem ${userId} ${itemId}`);
    await query(
      `UPDATE inventory SET quantity = GREATEST(quantity - $3, 0)
       WHERE user_id=$1 AND item_id=$2`,
      [userId, itemId, quantity]
    );
    await query(
      'DELETE FROM inventory WHERE user_id=$1 AND item_id=$2 AND quantity<=0',
      [userId, itemId]
    );
  },

  async getInventory(userId: number): Promise<InventoryItem[]> {
    const { rows } = await query(
      `SELECT item_id AS id, name, quantity, stackable, weight
         FROM inventory WHERE user_id=$1`,
      [userId]
    );
    return rows;
  },
};
