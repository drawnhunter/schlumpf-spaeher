/* Test v5: Sprachführung-Logik + Sync-Merge — node verifier/v5/test_game_v5.mjs */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const G = require('../../game.js');

let fails = 0;
function ok(cond, msg) {
  if (cond) console.log('  PASS  ' + msg);
  else { fails++; console.log('  FAIL  ' + msg); }
}

console.log('== v5: dirCategory ==');
{
  ok(G.dirCategory(0) === 'straight', '0° -> geradeaus');
  ok(G.dirCategory(25) === 'straight', '25° -> noch geradeaus (Grenze)');
  ok(G.dirCategory(26) === 'right', '26° -> rechts');
  ok(G.dirCategory(-26) === 'left', '-26° -> links');
  ok(G.dirCategory(114) === 'right', '114° -> rechts (Grenze)');
  ok(G.dirCategory(115) === 'back', '115° -> umdrehen');
  ok(G.dirCategory(-115) === 'back', '-115° -> umdrehen');
  ok(G.dirCategory(179) === 'back', '179° -> umdrehen');
  ok(G.dirCategory(-179) === 'back', '-179° -> umdrehen');
  ok(G.dirCategory(190) === 'back', '190° -> normiert -170 -> umdrehen');
}

console.log('== v5: distBucket ==');
{
  ok(G.distBucket(23) === 25, '23 m -> 25');
  ok(G.distBucket(22) === 20, '22 m -> 20');
  ok(G.distBucket(2.4) === 0, '2.4 m -> 0');
  ok(G.distBucket(0) === 0, '0 m -> 0');
  ok(G.distBucket(-3) === 0, 'negativ -> 0 (geklemmt)');
}

console.log('== v5: SPEECH-Texte ==');
{
  for (const k of ['start', 'straight', 'left', 'right', 'back', 'unlock', 'caught']) {
    ok(typeof G.SPEECH[k] === 'string' && G.SPEECH[k].length > 5, `Zeile vorhanden: ${k}`);
  }
  ok(G.SPEECH.far(30).includes('30'), 'far() enthält Meter');
  ok(G.SPEECH.near(5).includes('5'), 'near() enthält Meter');
}

console.log('== v5: mergeCollections ==');
{
  const a = { pilze: 2, kuchen: 1 };
  const b = { pilze: 5, schlumpf: 1 };
  const m = G.mergeCollections(a, b);
  ok(m.pilze === 5 && m.kuchen === 1 && m.schlumpf === 1, 'Merge nimmt pro Art das Maximum');
  ok(JSON.stringify(G.mergeCollections(null, b)) === JSON.stringify(b), 'null + b = b');
  ok(JSON.stringify(G.mergeCollections(a, null)) === JSON.stringify(a), 'a + null = a');
  ok(a.pilze === 2, 'Merge verändert Eingabe nicht');
}

console.log(fails === 0 ? '\nALLE V5-TESTS BESTANDEN' : `\n${fails} V5-TEST(S) FEHLGESCHLAGEN`);
process.exit(fails === 0 ? 0 : 1);
