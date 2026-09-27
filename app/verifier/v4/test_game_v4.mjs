/* Test v4: QR-Tokens, Ränge, Fang-Schwenken, Schwierigkeit — node verifier/v4/test_game_v4.mjs */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const G = require('../../game.js');

let fails = 0;
function ok(cond, msg) {
  if (cond) console.log('  PASS  ' + msg);
  else { fails++; console.log('  FAIL  ' + msg); }
}
function approx(a, b, tol, msg) { ok(Math.abs(a - b) <= tol, `${msg} (erwarte ~${b}, ist ${a})`); }

console.log('== v4: Items & QR-Pool ==');
{
  ok(G.ITEMS.length === 14, '14 Sammelobjekte (10 Basis + 4 QR-Editionen)');
  const qr = G.ITEMS.filter(i => i.qrOnly);
  ok(qr.length === 4, 'genau 4 qrOnly-Items');
  let qrInRadar = 0, seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 20000; i++) if (G.pickItem(rnd).qrOnly) qrInRadar++;
  ok(qrInRadar === 0, 'qrOnly-Items tauchen nie im Radar-Pool auf');
  ok(G.itemById('pilze').name === 'Fliegenpilz-Familie', 'itemById findet Item');
  ok(G.itemById('nope') === null, 'itemById unbekannt -> null');
}

console.log('== v4: QR-Token ==');
{
  const t = G.buildQrToken('kuerbis');
  ok(t === 'SPAHER:ITEM:kuerbis', 'Token-Aufbau korrekt');
  ok(G.parseQrToken(t) === 'kuerbis', 'Roundtrip gelingt');
  ok(G.parseQrToken('  SPAHER:ITEM:Pilze \n') === 'pilze', 'Whitespace/Großbuchstaben tolerant');
  ok(G.parseQrToken('https://example.com') === null, 'fremde URL -> null');
  ok(G.parseQrToken('SPAHER:ITEM:drache') === null, 'unbekannte ID -> null');
  ok(G.parseQrToken('') === null && G.parseQrToken(null) === null, 'leer/null -> null');
  for (const it of G.ITEMS) ok(G.parseQrToken(G.buildQrToken(it.id)) === it.id, `Roundtrip ${it.id}`);
}

console.log('== v4: Rahmen-Ränge ==');
{
  ok(G.rankOf(0).rank === 0 && G.rankOf(2).rank === 0, '0–2 Funde: kein Rang');
  ok(G.rankOf(3).rank === 1 && G.rankOf(3).name === 'Bronze', '3 Funde: Bronze');
  ok(G.rankOf(5).rank === 1, '5 Funde: noch Bronze');
  ok(G.rankOf(6).rank === 2 && G.rankOf(6).name === 'Silber', '6 Funde: Silber');
  ok(G.rankOf(9).rank === 2, '9 Funde: noch Silber');
  ok(G.rankOf(10).rank === 3 && G.rankOf(10).name === 'Gold', '10 Funde: Gold');
  const rp = G.rankProgress(4);
  ok(rp.rank.rank === 1 && rp.nextAt === 6 && approx2(rp.progress, 1/3), 'rankProgress(4): Bronze, 1/3 bis Silber');
  function approx2(a, b) { return Math.abs(a - b) < 1e-9; }
  ok(G.rankProgress(10).progress === 1 && G.rankProgress(10).next === null, 'Gold: Fortschritt voll');
  ok(G.rankProgress(0).nextAt === 3, '0 Funde: nächster Rang bei 3');
}

console.log('== v4: Fang-Schwenken ==');
{
  let v = G.catchView(0);
  ok(v.visible && approx(v.x, 0, 1e-9, true) !== false, 'Winkel 0 -> sichtbar, Mitte');
  v = G.catchView(30);
  ok(v.visible && v.x >= 0.89, 'Rand des Sichtfensters (30°) sichtbar, x~1');
  v = G.catchView(31);
  ok(!v.visible && v.side === 'right', '31° -> Pfeil rechts');
  v = G.catchView(-45);
  ok(!v.visible && v.side === 'left', '-45° -> Pfeil links');
  v = G.catchView(170);
  ok(!v.visible && v.side === 'right', '170° -> Pfeil rechts (umdrehen rechts herum)');
  v = G.catchView(-170);
  ok(!v.visible && v.side === 'left', '-170° -> Pfeil links');
  let neg = 0, pos = 0, seed2 = 3;
  const rnd2 = () => (seed2 = (seed2 * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 500; i++) { const a = G.randomSpriteAngle(rnd2); if (a < 0) neg++; else pos++; ok2(Math.abs(a) >= 30 && Math.abs(a) <= 100); }
  function ok2(c) { if (!c) { fails++; console.log('  FAIL  randomSpriteAngle außerhalb 30..100'); } }
  ok(neg > 150 && pos > 150, `Sprite-Richtung balanciert (links ${neg}, rechts ${pos})`);
  const da = G.dodgeAngle(() => 0.9);
  ok(Math.abs(da) >= 40 && Math.abs(da) <= 110, 'Ausweichwinkel im 40..110°-Korridor');
}

console.log('== v4: Schwierigkeit ==');
{
  ok(G.DIFFS.kurz.min === 8 && G.DIFFS.kurz.max === 15, 'Kurz: 8–15 m');
  ok(G.DIFFS.mittel.min === 15 && G.DIFFS.mittel.max === 30, 'Mittel: 15–30 m');
  ok(G.DIFFS.expedition.min === 35 && G.DIFFS.expedition.max === 60, 'Expedition: 35–60 m');
  ok(G.DEFAULT_DIFF === 'mittel', 'Standard: Mittel');
  const h = G.newHunt(() => 0.5, G.DIFFS.expedition.min, G.DIFFS.expedition.max);
  approx(h.distance, 47.5, 1e-9, 'newHunt nutzt Stufen-Grenzen');
}

console.log(fails === 0 ? '\nALLE V4-TESTS BESTANDEN' : `\n${fails} V4-TEST(S) FEHLGESCHLAGEN`);
process.exit(fails === 0 ? 0 : 1);
