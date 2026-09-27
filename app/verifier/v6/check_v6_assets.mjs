/* v6 Asset-/PWA-Check — node verifier/v6/check_v6_assets.mjs */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require2 = createRequire(import.meta.url);
const G = require2('../../game.js');

let fails = 0;
function ok(cond, msg) {
  if (cond) console.log('  PASS  ' + msg);
  else { fails++; console.log('  FAIL  ' + msg); }
}

console.log('== PWA ==');
ok(existsSync(join(root, 'manifest.webmanifest')), 'manifest.webmanifest');
ok(existsSync(join(root, 'sw.js')), 'sw.js');
const man = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
ok(man.display === 'standalone', 'Manifest: standalone');
ok(man.orientation === 'landscape', 'Manifest: landscape');
ok(Array.isArray(man.icons) && man.icons.length === 3, 'Manifest: 3 Icons');
for (const ic of man.icons) ok(existsSync(join(root, ic.src)), 'Icon vorhanden: ' + ic.src);
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
ok(sw.includes('/api/'), 'SW lässt /api ans Netz');
ok(sw.includes('Baloo2-var.ttf'), 'SW precached die Schrift');
const html = readFileSync(join(root, 'index.html'), 'utf8');
ok(html.includes('rel="manifest"'), 'HTML verlinkt Manifest');
ok(html.includes('@font-face'), 'HTML bindet Schrift ein');
ok(html.includes('Baloo 2'), 'HTML nutzt Baloo 2');
ok(existsSync(join(root, 'assets/fonts/Baloo2-var.ttf')), 'Font-Datei vorhanden');

console.log('== Avatar-Dateien ==');
ok(existsSync(join(root, 'assets/av/base.png')), 'Avatar-Basis');
for (const s of G.AVATAR_SLOTS) {
  for (const p of G.AVATAR_PARTS[s]) {
    ok(existsSync(join(root, `assets/av/${s}_${p.id}.png`)), `Teil: ${s}_${p.id}.png`);
  }
}

console.log('== Neue Items + Insel ==');
for (const n of ['amulett', 'gluehwurm', 'tautropfen', 'beeren', 'moos', 'kastanie']) {
  ok(existsSync(join(root, `assets/${n}.png`)), 'Item-Bild: ' + n);
}
ok(existsSync(join(root, 'assets/insel_bg.jpg')), 'Insel-Hintergrund');

console.log(fails === 0 ? '\nALLE V6-ASSET-CHECKS BESTANDEN' : `\n${fails} CHECK(S) FEHLGESCHLAGEN`);
process.exit(fails === 0 ? 0 : 1);
