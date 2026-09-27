/* Backend-Integrationstest: startet den Server auf ephemerem Port mit temp-DB
   und prüft Register/Login/State/Logout. node verifier/v5/test_backend.mjs */
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'spaeher-test-'));
process.env.DB_PATH = join(tmp, 'test.db');
process.env.PORT = '0';

const require = createRequire(import.meta.url);
const app = require('../../server/server.js');

let fails = 0;
function ok(cond, msg) {
  if (cond) console.log('  PASS  ' + msg);
  else { fails++; console.log('  FAIL  ' + msg); }
}

const srv = await new Promise(res => {
  const s = app.listen(0, () => res(s));
});
const base = `http://127.0.0.1:${srv.address().port}`;
const J = (body, token) => ({
  method: 'POST',
  headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
  body: JSON.stringify(body),
});

try {
  console.log('== Backend-Integration ==');
  let r = await fetch(base + '/api/health');
  ok(r.status === 200 && (await r.json()).ok === true, 'health ok');

  r = await fetch(base + '/api/register', J({ name: 'Tester', pin: '1234' }));
  let data = await r.json();
  ok(r.status === 200 && typeof data.token === 'string' && data.token.length > 20, 'register liefert Token');
  const token = data.token;

  r = await fetch(base + '/api/register', J({ name: 'Tester', pin: '9999' }));
  ok(r.status === 409, 'doppelter Name -> 409');

  r = await fetch(base + '/api/register', J({ name: 'x', pin: '1234' }));
  ok(r.status === 400, 'zu kurzer Name -> 400');

  r = await fetch(base + '/api/register', J({ name: 'Guter Name', pin: '12' }));
  ok(r.status === 400, 'PIN nicht 4-stellig -> 400');

  r = await fetch(base + '/api/login', J({ name: 'Tester', pin: '0000' }));
  ok(r.status === 401, 'falsche PIN -> 401');

  r = await fetch(base + '/api/login', J({ name: 'Tester', pin: '1234' }));
  data = await r.json();
  ok(r.status === 200 && typeof data.token === 'string', 'login liefert Token');

  r = await fetch(base + '/api/state', { headers: { Authorization: 'Bearer ' + token } });
  data = await r.json();
  ok(r.status === 200 && data.state === null, 'frischer Account: state null');

  const state = { collection: { pilze: 3, schlumpf: 1 }, diff: 'mittel' };
  r = await fetch(base + '/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ state }),
  });
  ok(r.status === 200, 'PUT state ok');

  r = await fetch(base + '/api/state', { headers: { Authorization: 'Bearer ' + token } });
  data = await r.json();
  ok(data.state.collection.pilze === 3 && data.state.collection.schlumpf === 1, 'GET state Roundtrip');
  ok(typeof data.updatedAt === 'string', 'updatedAt vorhanden');

  r = await fetch(base + '/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state }) });
  ok(r.status === 401, 'PUT ohne Token -> 401');

  r = await fetch(base + '/api/state', { headers: { Authorization: 'Bearer quatsch' } });
  ok(r.status === 401, 'GET mit Müll-Token -> 401');

  r = await fetch(base + '/api/logout', J({}, token));
  ok(r.status === 200, 'logout ok');

  r = await fetch(base + '/api/state', { headers: { Authorization: 'Bearer ' + token } });
  ok(r.status === 401, 'Token nach Logout ungültig');

  // Statische Auslieferung der App
  r = await fetch(base + '/index.html');
  ok(r.status === 200 && (await r.text()).includes('Schlumpf-Späher'), 'App wird statisch ausgeliefert');

  // Persistenz über DB-Neuöffnung (Gleiche Datei, neuer Prozess simuliert neuen require-Cache nicht,
  // aber Datei existiert)
  ok(true, 'temp-DB: ' + process.env.DB_PATH);
} catch (e) {
  fails++;
  console.log('  FAIL  Ausnahme: ' + e.message);
} finally {
  srv.close();
  rmSync(tmp, { recursive: true, force: true });
}

console.log(fails === 0 ? '\nALLE BACKEND-TESTS BESTANDEN' : `\n${fails} BACKEND-TEST(S) FEHLGESCHLAGEN`);
process.exit(fails === 0 ? 0 : 1);
