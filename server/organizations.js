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
  const { item, price, hungerGain = 0 } = req.body;
  try {
    await db.query('BEGIN');
    const { rows } = await db.query('SELECT balance, hunger FROM users WHERE id=$1', [req.user.id]);
    const balance = parseFloat(rows[0].balance);
    const currentHunger = parseFloat(rows[0].hunger);
    if (balance < price) {
      await db.query('ROLLBACK');
      return res.status(400).json({ error: 'insufficient funds' });
    }
    await db.query('UPDATE users SET balance = balance - $1, hunger = LEAST(100, hunger + $2) WHERE id=$3', [price, hungerGain, req.user.id]);
    await db.query(
      `INSERT INTO organization_orders(organization_id, user_id, item, price)
       VALUES($1,$2,$3,$4)`,
      [id, req.user.id, item, price]
    );
    await db.query('COMMIT');
    res.json({ success: true, newBalance: balance - price, newHunger: Math.min(100, currentHunger + hungerGain) });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;