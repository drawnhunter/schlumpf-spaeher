/* Test: reine Spiellogik (game.js) — node verifier/v1/test_game.mjs */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const G = require('../../game.js');

let fails = 0;
function ok(cond, msg) {
  if (cond) console.log('  PASS  ' + msg);
  else { fails++; console.log('  FAIL  ' + msg); }
}
function approx(a, b, tol, msg) { ok(Math.abs(a - b) <= tol, `${msg} (erwarte ~${b}, ist ${a})`); }
function approxAng(a, b, tol, msg) { ok(Math.abs(G.normDelta(a - b)) <= tol, `${msg} (erwarte ~${b}, ist ${a})`); }

console.log('== Navigation ==');
{
  const berlin = { lat: 52.52, lon: 13.405 };
  const north100 = G.destinationPoint(berlin, 0, 100);
  approx(G.haversineM(berlin, north100), 100, 0.5, 'destinationPoint Nord 100 m -> Distanz ~100 m');
  approxAng(G.bearingDeg(berlin, north100), 0, 2, 'Peilung zum Punkt im Norden ~0°');
  const east = G.destinationPoint(berlin, 90, 100);
  approxAng(G.bearingDeg(berlin, east), 90, 2, 'Peilung zum Punkt im Osten ~90°');
  const west = G.destinationPoint(berlin, 270, 100);
  approxAng(G.bearingDeg(berlin, west), 270, 2, 'Peilung zum Punkt im Westen ~270°');
  approx(G.haversineM({ lat: 0, lon: 0 }, { lat: 0, lon: 0 }), 0, 1e-6, 'Distanz gleicher Punkt = 0');
  ok(G.haversineM({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }) > 110000 && G.haversineM({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }) < 112000, 'Haversine 1° Breite ~111 km');
}

console.log('== newHunt / Zufall ==');
{
  const h = G.newHunt(() => 0.5, 20, 50);
  approx(h.bearing, 180, 1e-9, 'newHunt bearing mit rng=0.5 -> 180°');
  approx(h.distance, 35, 1e-9, 'newHunt Distanz mit rng=0.5 -> 35 m');
  const h0 = G.newHunt(() => 0);
  ok(h0.bearing >= 0 && h0.distance >= 20, 'newHunt rng=0 -> untere Grenze');
  const h1 = G.newHunt(() => 0.999999);
  ok(h1.bearing < 360 && h1.distance <= 50, 'newHunt rng~1 -> obere Grenze');
}

console.log('== Kompass ==');
{
  approx(G.headingFromEvent({ alpha: 30 }), 330, 1e-9, 'Android alpha=30 -> Heading 330');
  approx(G.headingFromEvent({ webkitCompassHeading: 90 }), 90, 1e-9, 'iOS webkitCompassHeading=90');
  ok(G.headingFromEvent({}) === null, 'leeres Event -> null');
  approx(G.normDelta(190), -170, 1e-9, 'normDelta(190) = -170');
  approx(G.normDelta(-190), 170, 1e-9, 'normDelta(-190) = 170');
  const s = G.smoothHeading(350, 10, 0.5);
  approx(s, 0, 1e-9, 'Glättung über 0°-Sprung (350->10) ~0');
}

console.log('== Fortschritt / Punkte / Skala ==');
{
  approx(G.progressOf(50, 50), 0, 1e-9, 'progressOf Start = 0');
  approx(G.progressOf(0, 50), 1, 1e-9, 'progressOf am Ziel = 1');
  approx(G.progressOf(25, 50), 0.5, 1e-9, 'progressOf halb = 0.5');
  approx(G.progressOf(-5, 50), 1, 1e-9, 'progressOf clamp oben');
  ok(JSON.stringify(G.dotsOf(0)) === JSON.stringify([false,false,false,false,false,false]), 'dotsOf(0) alle rot');
  ok(JSON.stringify(G.dotsOf(1)) === JSON.stringify([true,true,true,true,true,true]), 'dotsOf(1) alle grün');
  ok(JSON.stringify(G.dotsOf(0.5)) === JSON.stringify([true,true,true,false,false,false]), 'dotsOf(0.5) halb grün');
  ok(G.scaleOf(0.0).label.startsWith('Eiskalt'), 'Skala 0.0 = Eiskalt');
  ok(G.scaleOf(0.3).label.startsWith('Kalt'), 'Skala 0.3 = Kalt');
  ok(G.scaleOf(0.5).label.startsWith('Lauwarm'), 'Skala 0.5 = Lauwarm');
  ok(G.scaleOf(0.7).label.startsWith('Warm'), 'Skala 0.7 = Warm');
  ok(G.scaleOf(0.9).label.startsWith('Heiß'), 'Skala 0.9 = Heiß');
  ok(G.scaleOf(1.0).label.startsWith('GLÜHEND'), 'Skala 1.0 = GLÜHEND');
  ok(G.tickMs(100) > G.tickMs(5), 'Piep-Intervall nimmt mit Nähe ab');
  ok(G.tickMs(0) >= 350, 'Piep-Intervall Mindestgrenze');
  ok(G.tickMs(1000) <= 3000, 'Piep-Intervall Höchstgrenze');
  ok(G.catchReady(10) === true && G.catchReady(10.1) === false, 'catchReady Schwelle 10 m');
}

console.log('== Sammelobjekte ==');
{
  ok(G.ITEMS.length === 10, 'genau 10 Sammelobjekte definiert');
  const ids = new Set(G.ITEMS.map(i => i.id));
  ok(ids.size === 10, 'Item-IDs eindeutig');
  for (const it of G.ITEMS) ok(it.name && it.img && it.fact && [1,2,3].includes(it.rarity), `Item ${it.id} vollständig`);
  const dodgesOk = G.ITEMS.every(i => i.dodges === (i.rarity - 1));
  ok(dodgesOk, 'Ausweich-Anzahl = rarity-1 (häufig 0, selten 1, legendär 2)');
  // Monte-Carlo: Verteilung
  const N = 40000, c = { 1: 0, 2: 0, 3: 0 };
  let seed = 42; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < N; i++) c[G.pickItem(rnd).rarity]++;
  approx(c[1] / N, 0.6, 0.01, 'Verteilung häufig ~60 %');
  approx(c[2] / N, 0.28, 0.01, 'Verteilung selten ~28 %');
  approx(c[3] / N, 0.12, 0.01, 'Verteilung legendär ~12 %');
}

console.log(fails === 0 ? '\nALLE TESTS BESTANDEN' : `\n${fails} TEST(S) FEHLGESCHLAGEN`);
process.exit(fails === 0 ? 0 : 1);
