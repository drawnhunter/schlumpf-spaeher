/* v7 Asset-/Feature-Check — node verifier/v7/check_v7.mjs */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require2 = createRequire(import.meta.url);
const G = require2('../../game.js');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const appjs = readFileSync(join(root, 'app.js'), 'utf8');

let fails = 0;
function ok(cond, msg) {
  if (cond) console.log('  PASS  ' + msg);
  else { fails++; console.log('  FAIL  ' + msg); }
}

console.log('== Wichtel-Bilder ==');
for (const it of G.ITEMS.filter(i => i.img.startsWith('assets/wichtel_'))) {
  ok(existsSync(join(root, it.img)), 'Bild vorhanden: ' + it.img);
}

console.log('== Sounds ==');
for (const s of ['ding', 'plopp', 'stempel']) ok(existsSync(join(root, s + '.mp3')), 'Sound: ' + s);

console.log('== Wizard / Standalone / Rename-Marker ==');
const all = html + '\n' + appjs;
const markers = [
  ['Wizard-Overlay', 'id="wizard"'],
  ['Wizard-Schritte', 'WIZ_STEPS'],
  ['Wizard-Flag', 'schlumpfWizard'],
  ['Anleitung-Button', 'openWizard()'],
  ['Rotate-Overlay', 'id="rotateHint"'],
  ['Rotate-Dismiss', 'dismissRotate'],
  ['Install-Prompt', 'beforeinstallprompt'],
  ['Install-Button', 'installApp'],
  ['Fullscreen', 'requestFullscreen'],
  ['Name: Schatz-Radar', 'Schatz-Radar'],
  ['Name: Mein Waldbuch', 'Mein Waldbuch'],
  ['Name: Anzieh-Ecke', 'Anzieh-Ecke'],
  ['Name: Für Erwachsene', 'Für Erwachsene'],
  ['Erzähler pitch', 'pitch = 1.08'],
  ['Erzähler rate', 'rate = 0.92'],
  ['Stimmwahl', 'pickVoice'],
  ['Knautsch-Kante', '--edge:0 6px 0'],
  ['Pop-Easing', 'cubic-bezier(.34,1.56,.64,1)'],
  ['Wiggle', 'wiggle4s'],
  ['Bounce-In', 'bounceIn'],
  ['Plopp-Hook', 'lastPlopp'],
  ['Ding-Hook', "play('ding'"],
  ['Stempel-Hook', "play('stempel'"],
  ['Bodenschatten', '.avatarfig::after'],
  ['Kinn-AO', '.avatarfig::before'],
  ['Atem-Animation', '@keyframes atmen'],
];
for (const [name, needle] of markers) ok(all.includes(needle), 'Marker: ' + name);

console.log(fails === 0 ? '\nALLE V7-CHECKS BESTANDEN' : `\n${fails} CHECK(S) FEHLGESCHLAGEN`);
process.exit(fails === 0 ? 0 : 1);
