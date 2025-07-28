const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');

const router = express.Router();

function authenticate(req, res, next) {
  const auth = req.headers.authorization?.split(' ');
  try {
    if (!auth || auth[0] !== 'Bearer') return res.status(401).send('No token');
    const payload = jwt.verify(auth[1], process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).send('Invalid token');
  }
}

async function initTables() {
  await db.query(`CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    object_id INTEGER,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    city TEXT,
    owner TEXT,
    budget NUMERIC DEFAULT 0,
    rating NUMERIC DEFAULT 0
  )`);
  await db.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS object_id INTEGER`);

  await db.query(`CREATE TABLE IF NOT EXISTS organization_settings (
    organization_id INTEGER PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    menu JSONB,
    work_hours TEXT
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS organization_orders (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    price NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS organization_inventory (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    price NUMERIC DEFAULT 0
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS organization_employees (
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    wage NUMERIC DEFAULT 0,
    PRIMARY KEY(organization_id, user_id)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS hotel_rooms (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    room_number TEXT,
    class TEXT,
    price NUMERIC,
    is_available BOOLEAN DEFAULT true,
    occupant INTEGER REFERENCES users(id),
    lease_end TIMESTAMPTZ
  )`);
}

initTables().catch(err => console.error('Failed to init organization tables', err));

router.post('/', async (req, res) => {
  const { name, type, city, owner, objectId, budget = 0, rating = 0 } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO organizations(name, type, city, owner, object_id, budget, rating)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, type, city, owner, objectId, budget, rating]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { rows } = await db.query('SELECT * FROM organizations WHERE id=$1', [id]);
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  res.json(rows[0]);
});

router.get('/object/:objectId', async (req, res) => {
  const { objectId } = req.params;
  const { rows } = await db.query('SELECT * FROM organizations WHERE object_id=$1', [objectId]);
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  res.json(rows[0]);
});

router.get('/:id/settings', async (req, res) => {
  const { id } = req.params;
  const { rows } = await db.query(
    'SELECT menu, work_hours FROM organization_settings WHERE organization_id=$1',
    [id]
  );
  res.json(rows[0] || {});
});

router.put('/:id/settings', async (req, res) => {
  const { id } = req.params;
  const { menu, workHours } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO organization_settings(organization_id, menu, work_hours)
       VALUES($1, $2, $3)
       ON CONFLICT (organization_id)
       DO UPDATE SET menu = EXCLUDED.menu, work_hours = EXCLUDED.work_hours
       RETURNING menu, work_hours`,
      [id, menu, workHours]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/:id/purchase', authenticate, async (req, res) => {
  const { id } = req.params;
  const { itemKey } = req.body;
  try {
    const menuRes = await db.query('SELECT menu FROM organization_settings WHERE organization_id=$1', [id]);
    const menu = menuRes.rows[0]?.menu || {};
    const item = menu[itemKey];
    if (!item) return res.status(400).json({ error: 'invalid item' });

    const price = parseFloat(item.price);
    const hungerGain = item.hungerGain || 0;
    const thirstGain = item.thirstGain || 0;

    const { rows } = await db.query('SELECT balance, satiety, thirst FROM users WHERE id=$1', [req.user.id]);
    let balance = parseFloat(rows[0].balance);
    let satiety = parseFloat(rows[0].satiety ?? 100);
    let thirst = parseFloat(rows[0].thirst ?? 100);
    if (balance < price) return res.status(400).json({ error: 'insufficient funds' });

    await db.query('BEGIN');
    await db.query(
      'UPDATE users SET balance = balance - $1, satiety = LEAST(100, COALESCE(satiety,100)+$2), thirst = LEAST(100, COALESCE(thirst,100)+$3) WHERE id=$4',
      [price, hungerGain, thirstGain, req.user.id]
    );
    await db.query(
      `INSERT INTO organization_orders(organization_id, user_id, item, price)
       VALUES($1,$2,$3,$4)`,
      [id, req.user.id, item.title, price]
    );
    await db.query(
      `INSERT INTO inventory(user_id, item_id, name, quantity, stackable, weight)
       VALUES($1,$2,$3,1,true,1)
       ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = inventory.quantity + 1`,
      [req.user.id, itemKey, item.title]
    );
    await db.query('COMMIT');
    balance -= price;
    satiety = Math.min(100, satiety + hungerGain);
    thirst = Math.min(100, thirst + thirstGain);
    res.json({ success: true, balance, satiety, thirst });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

// ----- управление бизнесом -----

router.put('/:id/owner', authenticate, async (req, res) => {
  const { id } = req.params;
  const { owner } = req.body;
  try {
    await db.query('UPDATE organizations SET owner=$1 WHERE id=$2', [owner, id]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'db error' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM organizations WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/:id/inventory', authenticate, async (req, res) => {
  const { id } = req.params;
  const { item, quantity = 0, cost = 0, price = 0 } = req.body;
  try {
    await db.query('BEGIN');
    await db.query(
      `INSERT INTO organization_inventory(organization_id, item, quantity, price)
       VALUES($1,$2,$3,$4)
       ON CONFLICT (organization_id, item)
       DO UPDATE SET quantity = organization_inventory.quantity + EXCLUDED.quantity, price = EXCLUDED.price`,
      [id, item, quantity, price]
    );
    await db.query('UPDATE organizations SET budget = budget - $1 WHERE id=$2', [cost, id]);
    await db.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await db.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'db error' });
  }
});

router.get('/:id/inventory', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query('SELECT * FROM organization_inventory WHERE organization_id=$1', [id]);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/:id/pay-wages', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query('SELECT user_id, wage FROM organization_employees WHERE organization_id=$1', [id]);
    let total = rows.reduce((s, r) => s + parseFloat(r.wage), 0);
    const org = await db.query('SELECT budget FROM organizations WHERE id=$1', [id]);
    if (parseFloat(org.rows[0].budget) < total) return res.status(400).json({ error: 'insufficient funds' });
    await db.query('BEGIN');
    await db.query('UPDATE organizations SET budget = budget - $1 WHERE id=$2', [total, id]);
    for (const r of rows) {
      await db.query('UPDATE users SET balance = balance + $1 WHERE id=$2', [r.wage, r.user_id]);
    }
    await db.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await db.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/:id/pay-taxes', authenticate, async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  try {
    await db.query('UPDATE organizations SET budget = budget - $1 WHERE id=$2', [amount, id]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/:id/pay-utilities', authenticate, async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  try {
    await db.query('UPDATE organizations SET budget = budget - $1 WHERE id=$2', [amount, id]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'db error' });
  }
});

// ----- управление отелями -----

router.post('/:id/rooms', authenticate, async (req, res) => {
  const { id } = req.params;
  const { roomNumber, class: roomClass, price } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO hotel_rooms(organization_id, room_number, class, price)
       VALUES($1,$2,$3,$4) RETURNING *`,
      [id, roomNumber, roomClass, price]
    );
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'db error' });
  }
});

router.put('/:id/rooms/:roomId', authenticate, async (req, res) => {
  const { id, roomId } = req.params;
  const { class: roomClass, price } = req.body;
  try {
    await db.query(
      `UPDATE hotel_rooms SET class=COALESCE($1,class), price=COALESCE($2,price) WHERE id=$3 AND organization_id=$4`,
      [roomClass, price, roomId, id]
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'db error' });
  }
});

router.get('/:id/rooms', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query('SELECT * FROM hotel_rooms WHERE organization_id=$1', [id]);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/:id/rooms/:roomId/rent', authenticate, async (req, res) => {
  const { id, roomId } = req.params;
  const { days = 1 } = req.body;
  try {
    const { rows } = await db.query('SELECT price, is_available FROM hotel_rooms WHERE id=$1 AND organization_id=$2', [roomId, id]);
    if (!rows.length || !rows[0].is_available) return res.status(400).json({ error: 'room unavailable' });
    const price = parseFloat(rows[0].price) * days;
    const user = await db.query('SELECT balance FROM users WHERE id=$1', [req.user.id]);
    if (parseFloat(user.rows[0].balance) < price) return res.status(400).json({ error: 'insufficient funds' });
    await db.query('BEGIN');
    await db.query('UPDATE users SET balance = balance - $1 WHERE id=$2', [price, req.user.id]);
    await db.query('UPDATE organizations SET budget = budget + $1 WHERE id=$2', [price, id]);
    await db.query(
      'UPDATE hotel_rooms SET is_available=false, occupant=$1, lease_end = NOW() + ($2 || \" days\")::interval WHERE id=$3',
      [req.user.id, days, roomId]
    );
    await db.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await db.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
