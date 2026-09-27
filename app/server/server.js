/* Schlumpf-Späher Server — HTTP-API (Express)
   Endpunkte:
     GET  /api/health            -> { ok, ts }
     POST /api/register          { name, pin }      -> { token, name }   (409 Name vergeben)
     POST /api/login             { name, pin }      -> { token, name }   (401 falsch)
     GET  /api/state             (Bearer)           -> { state|null, updatedAt? }
     PUT  /api/state             (Bearer) { state } -> { ok }
     POST /api/logout            (Bearer)           -> { ok }
   Statisch: liefert die App aus dem Projekt-Root (eine Ebene ueber server/).
   Env: PORT (default 4178), DB_PATH (default ./spaeher.db) */
'use strict';
const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
app.use(express.json({ limit: '120kb' }));

function tokenOf(req) { return (req.headers.authorization || '').replace(/^Bearer\s+/i, ''); }
function auth(req, res, next) {
  const u = db.userByToken(tokenOf(req));
  if (!u) return res.status(401).json({ error: 'unauthorized' });
  req.user = u;
  next();
}

app.post('/api/register', (req, res) => {
  const { name, pin } = req.body || {};
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 20) {
    return res.status(400).json({ error: 'Name muss 2–20 Zeichen haben' });
  }
  if (!/^\d{4}$/.test(String(pin))) return res.status(400).json({ error: 'PIN muss 4 Ziffern haben' });
  const n = name.trim();
  if (db.findUser(n)) return res.status(409).json({ error: 'Name ist schon vergeben' });
  const uid = db.createUser(n, String(pin));
  res.json({ token: db.createSession(uid), name: n });
});

app.post('/api/login', (req, res) => {
  const { name, pin } = req.body || {};
  const u = db.findUser(String(name || '').trim());
  if (!db.checkPin(u, String(pin))) return res.status(401).json({ error: 'Name oder PIN falsch' });
  res.json({ token: db.createSession(u.id), name: u.name });
});

app.get('/api/state', auth, (req, res) => res.json(db.getState(req.user.id)));

app.put('/api/state', auth, (req, res) => {
  const { state } = req.body || {};
  if (typeof state !== 'object' || state === null) return res.status(400).json({ error: 'state-Objekt fehlt' });
  db.putState(req.user.id, state);
  res.json({ ok: true });
});

app.post('/api/logout', auth, (req, res) => {
  db.dropSession(tokenOf(req));
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Die App selbst ausliefern (index.html, assets, …) — ein Prozess fuer alles
app.use(express.static(path.join(__dirname, '..')));

const port = Number(process.env.PORT || 4178);
if (require.main === module) {
  app.listen(port, () => console.log(`Schlumpf-Späher Server läuft auf Port ${port}`));
}
module.exports = app;
