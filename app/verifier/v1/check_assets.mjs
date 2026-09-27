/* Test: alle referenzierten Assets existieren + Feature-Marker vorhanden + keine externen CDNs */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const appjs = readFileSync(join(root, 'app.js'), 'utf8');
const gamejs = readFileSync(join(root, 'game.js'), 'utf8');

let fails = 0;
function ok(cond, msg) {
  if (cond) console.log('  PASS  ' + msg);
  else { fails++; console.log('  FAIL  ' + msg); }
}

console.log('== Assets ==');
const refs = new Set();
for (const m of (html + appjs + gamejs).matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
  const p = m[1];
  if (!p.startsWith('http') && !p.startsWith('#') && !p.startsWith('data:') && !p.includes('${')) refs.add(p);
}
for (const m of (html + appjs + gamejs).matchAll(/['"](assets\/[^'"]+|giggle\.mp3|beep\.mp3|fanfare\.mp3)['"]/g)) {
  if (!m[1].includes('${')) refs.add(m[1]);
}
for (const r of refs) ok(existsSync(join(root, r)), 'Asset vorhanden: ' + r);

/* Item-Bilder aus game.js explizit prüfen */
const { createRequire } = await import('node:module');
const require2 = createRequire(import.meta.url);
const G = require2('../../game.js');
for (const it of G.ITEMS) ok(existsSync(join(root, it.img)), 'Item-Bild vorhanden: ' + it.img);

console.log('== Feature-Marker (HTML/JS) ==');
const markers = [
  ['Radar-View', 'id="radar"'],
  ['Fang-View', 'id="catch"'],
  ['Sammelbuch-View', 'id="buch"'],
  ['Fußspur-View', 'id="tracks"'],
  ['Home-View', 'id="home"'],
  ['Fortschritts-Punkte', 'id="navDots"'],
  ['Kalt-Warm-Skala', 'id="thermo"'],
  ['Kompass-Pfeil', 'id="arrow"'],
  ['Fernglas-Freischaltung', 'catchReady'],
  ['Übungsmodus', 'demoMode'],
  ['Sprite-Fang', 'id="sprite"'],
  ['Zoom-Buttons', 'zoomBy'],
  ['GPS', 'watchPosition'],
  ['Kompass-Sensor', 'deviceorientationabsolute'],
  ['Sammel-Persistenz', 'schlumpfSammlung'],
];
const all = html + '\n' + appjs + '\n' + gamejs;
for (const [name, needle] of markers) ok(all.includes(needle), 'Marker: ' + name);

console.log('== Offline-Fähigkeit ==');
ok(!/https?:\/\/(cdn|unpkg|cdnjs|fonts)/.test(html + appjs), 'keine externen CDN-Referenzen');

console.log(fails === 0 ? '\nALLE CHECKS BESTANDEN' : `\n${fails} CHECK(S) FEHLGESCHLAGEN`);
process.exit(fails === 0 ? 0 : 1);
