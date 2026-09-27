/* Test v3: Schrittzähler + Hybrid-Fortschritt — node verifier/v3/test_game_v3.mjs */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const G = require('../../game.js');

let fails = 0;
function ok(cond, msg) {
  if (cond) console.log('  PASS  ' + msg);
  else { fails++; console.log('  FAIL  ' + msg); }
}
function approx(a, b, tol, msg) { ok(Math.abs(a - b) <= tol, `${msg} (erwarte ~${b}, ist ${a})`); }

console.log('== v3: Schritt-Detektor (synthetisches Signal) ==');
{
  // Gehen: 60 Hz Abtastung, Schrittfrequenz ~2 Hz, Amplitude 1.8, 5 s lang
  const det = G.makeStepDetector();
  let steps = 0;
  for (let i = 0; i < 300; i++) {
    const t = i * (1000 / 60);
    const dyn = Math.abs(Math.sin(2 * Math.PI * 2 * (i / 60))) * 1.8;
    if (det(dyn, t)) steps++;
  }
  ok(steps >= 8 && steps <= 12, `Gehsignal 5 s -> 8–12 Schritte (ist ${steps})`);

  // Ruhe: keine Schritte
  const det2 = G.makeStepDetector();
  let still = 0;
  for (let i = 0; i < 300; i++) if (det2(0.05, i * 16.6)) still++;
  ok(still === 0, `Ruhe -> 0 Schritte (ist ${still})`);

  // Refraktärzeit: Spitzen im 100-ms-Abstand zählen nur einmal
  const det3 = G.makeStepDetector();
  let spikes = 0;
  const seq = [[2.0, 0], [0.1, 50], [2.0, 100], [0.1, 150], [2.0, 500], [0.1, 550], [2.0, 900]];
  for (const [dyn, t] of seq) if (det3(dyn, t)) spikes++;
  ok(spikes === 3, `Spitzen 0/100/500/900 ms -> 3 Schritte (ist ${spikes})`);

  // Wackeln unter Schwelle zählt nicht
  const det4 = G.makeStepDetector();
  let wob = 0;
  for (let i = 0; i < 200; i++) if (det4(0.9, i * 16.6)) wob++;
  ok(wob === 0, `Dauerwackeln unter Schwelle -> 0 (ist ${wob})`);
}

console.log('== v3: stepProgress / combinedProgress ==');
{
  approx(G.stepProgress(0, 0.55, 20), 0, 1e-9, '0 Schritte -> 0');
  approx(G.stepProgress(10, 0.55, 20), 0.275, 1e-9, '10 Schritte à 0.55 m bei 20 m -> 0.275');
  approx(G.stepProgress(36, 0.55, 20), 0.99, 1e-9, '36 Schritte -> 0.99');
  ok(G.stepProgress(100, 0.55, 20) === 1, 'viele Schritte -> gedeckelt auf 1');
  approx(G.combinedProgress(0.1, 0.7), 0.7, 1e-9, 'combinedProgress = max (Schritte gewinnen)');
  approx(G.combinedProgress(0.9, 0.2), 0.9, 1e-9, 'combinedProgress = max (GPS gewinnt)');
  approx(G.combinedProgress(0.3, 0.3), 0.3, 1e-9, 'gleiche Signale -> Wert');
}

console.log('== v3: Regressionen ==');
{
  const hunt = { bearing: 0, distance: 20 };
  const hp = G.huntProgress({ lat: 52.52, lon: 13.405 }, G.destinationPoint({ lat: 52.52, lon: 13.405 }, 0, 10), hunt);
  approx(hp.progress, 0.5, 0.02, 'GPS-Credit unverändert');
  ok(G.catchAllowed(0.8, 0) && !G.catchAllowed(0.5, 10000), 'catchAllowed unverändert');
  ok(G.MERCY_MS === 40000, 'Gnadenregel 40 s unverändert');
  ok(G.CHILD_STEP_M === 0.55, 'Kinderschritt 0,55 m');
}

console.log(fails === 0 ? '\nALLE V3-TESTS BESTANDEN' : `\n${fails} V3-TEST(S) FEHLGESCHLAGEN`);
process.exit(fails === 0 ? 0 : 1);
