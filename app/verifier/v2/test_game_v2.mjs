/* Test v2: Credit-Modell, Gnadenregel, kurze Distanzen — node verifier/v2/test_game_v2.mjs */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const G = require('../../game.js');

let fails = 0;
function ok(cond, msg) {
  if (cond) console.log('  PASS  ' + msg);
  else { fails++; console.log('  FAIL  ' + msg); }
}
function approx(a, b, tol, msg) { ok(Math.abs(a - b) <= tol, `${msg} (erwarte ~${b}, ist ${a})`); }

const START = { lat: 52.52, lon: 13.405 };

console.log('== v2: kurze Distanzen ==');
{
  const h0 = G.newHunt(() => 0);
  ok(h0.distance === 10, 'rng=0 -> Distanz 10 m (untere Grenze)');
  const h1 = G.newHunt(() => 0.999999);
  ok(h1.distance <= 25, 'rng~1 -> Distanz <= 25 m');
  const hm = G.newHunt(() => 0.5);
  approx(hm.distance, 17.5, 1e-9, 'rng=0.5 -> Distanz 17.5 m');
  ok(G.newHunt(() => 0.5, 20, 50).distance === 35, 'explizite Grenzen weiterhin möglich (v1-Kompatibilität)');
}

console.log('== v2: huntProgress (Credit-Modell) ==');
{
  const hunt = { bearing: 0, distance: 20 }; // Ziel: 20 m nördlich
  const north10 = G.destinationPoint(START, 0, 10);
  let hp = G.huntProgress(START, north10, hunt);
  approx(hp.progress, 0.5, 0.02, '10 m in Zielrichtung -> Fortschritt ~0.5');
  approx(hp.remaining, 10, 0.5, '10 m in Zielrichtung -> Rest ~10 m');
  const north20 = G.destinationPoint(START, 0, 20);
  hp = G.huntProgress(START, north20, hunt);
  approx(hp.progress, 1, 0.02, '20 m in Zielrichtung -> Fortschritt ~1 (Freigabe-Nähe)');
  const south10 = G.destinationPoint(START, 180, 10);
  hp = G.huntProgress(START, south10, hunt);
  approx(hp.progress, 0.175, 0.02, '10 m falsch herum -> 35 % Credit (~0.175)');
  const east10 = G.destinationPoint(START, 90, 10);
  hp = G.huntProgress(START, east10, hunt);
  ok(hp.progress > 0.1 && hp.progress < 0.25, '10 m orthogonal -> Teilkredit (~0.175)');
  const stand = G.destinationPoint(START, 0, 0.2);
  hp = G.huntProgress(START, stand, hunt);
  ok(hp.progress === 0, 'Stehenbleiben (<0.5 m) -> kein Fortschritt');
  ok(hp.walked < 0.5, 'walked wird korrekt zurückgegeben');
}

console.log('== v2: Gnadenregel / Freigabe ==');
{
  ok(G.catchAllowed(0.8, 0) === true, '80 % Fortschritt -> sofort frei');
  ok(G.catchAllowed(0.79, 0) === false, '79 % ohne Zeit -> nicht frei');
  ok(G.catchAllowed(0.2, 40000) === true, 'Gnadenregel ab 40 s');
  ok(G.catchAllowed(0.2, 39999) === false, 'unter 40 s nicht frei');
  ok(G.MERCY_MS === 40000, 'MERCY_MS = 40 s');
}

console.log('== v2: Regressionen (Kernfunktionen unverändert) ==');
{
  approx(G.haversineM(START, G.destinationPoint(START, 0, 100)), 100, 0.5, 'Haversine/destinationPoint stabil');
  approx(Math.abs(G.normDelta(G.bearingDeg(START, G.destinationPoint(START, 90, 50)) - 90)), 0, 2, 'Peilung Osten stabil');
  ok(JSON.stringify(G.dotsOf(0.5)) === JSON.stringify([true,true,true,false,false,false]), 'dotsOf unverändert');
  ok(G.ITEMS.length === 10, 'weiterhin 10 Sammelobjekte');
}

console.log(fails === 0 ? '\nALLE V2-TESTS BESTANDEN' : `\n${fails} V2-TEST(S) FEHLGESCHLAGEN`);
process.exit(fails === 0 ? 0 : 1);
