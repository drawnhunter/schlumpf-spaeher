/* Schlumpf-Späher Server — Datenzugriff (SQLite, WAL) */
'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const db = new Database(process.env.DB_PATH || path.join(__dirname, 'spaeher.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  email TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);`);

/* Migration für bestehende DBs ohne email-Spalte */
try { db.exec('ALTER TABLE users ADD COLUMN email TEXT'); } catch (e) { /* Spalte existiert schon */ }

db.exec(`
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS states (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  json TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

function hashPin(pin, salt) {
  return crypto.createHash('sha256').update(String(pin) + salt).digest('hex');
}

module.exports = {
  createUser(name, pin, email) {
    const salt = crypto.randomBytes(8).toString('hex');
    const r = db.prepare('INSERT INTO users(name, pin_hash, salt, email) VALUES (?, ?, ?, ?)')
      .run(name, hashPin(pin, salt), salt, email || null);
    return r.lastInsertRowid;
  },
  findUser(name) {
    return db.prepare('SELECT * FROM users WHERE name = ?').get(name);
  },
  checkPin(user, pin) {
    return !!user && user.pin_hash === hashPin(pin, user.salt);
  },
  createSession(uid) {
    const t = crypto.randomBytes(24).toString('hex');
    db.prepare('INSERT INTO sessions(token, user_id) VALUES (?, ?)').run(t, uid);
    return t;
  },
  userByToken(t) {
    if (!t) return null;
    const s = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(t);
    return s ? db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(s.user_id) : null;
  },
  dropSession(t) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(t);
  },
  getState(uid) {
    const r = db.prepare('SELECT json, updated_at FROM states WHERE user_id = ?').get(uid);
    return r ? { state: JSON.parse(r.json), updatedAt: r.updated_at } : { state: null };
  },
  putState(uid, json) {
    db.prepare(`INSERT INTO states(user_id, json, updated_at) VALUES (?, ?, datetime('now'))
                ON CONFLICT(user_id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`)
      .run(uid, JSON.stringify(json));
  },
};
