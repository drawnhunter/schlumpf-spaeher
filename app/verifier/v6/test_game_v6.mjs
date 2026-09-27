/* Test v6: Avatar-Katalog, Insel-Logik, Item-Erweiterung — node verifier/v6/test_game_v6.mjs */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const G = require('../../game.js');

let fails = 0;
function ok(cond, msg) {
  if (cond) console.log('  PASS  ' + msg);
  else { fails++; console.log('  FAIL  ' + msg); }
}

console.log('== v6: Items (20) ==');
{
  ok(G.ITEMS.length === 20, 'genau 20 Sammelobjekte');
  const ids = new Set(G.ITEMS.map(i => i.id));
  ok(ids.size === 20, 'Item-IDs eindeutig');
  const neu = ['amulett', 'gluehwurm', 'tautropfen', 'beeren', 'moos', 'kastanie'];
  for (const n of neu) ok(G.itemById(n) && !G.itemById(n).qrOnly, `Neues Radar-Item: ${n}`);
  for (const it of G.ITEMS) ok(/^assets\/[\w]+\.png$/.test(it.img), `Bildpfad ok: ${it.img}`);
  let qrInRadar = 0, seed = 11;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 20000; i++) if (G.pickItem(rnd).qrOnly) qrInRadar++;
  ok(qrInRadar === 0, 'qrOnly weiterhin nie im Radar-Pool');
}

console.log('== v6: Avatar ==');
{
  ok(G.AVATAR_SLOTS.length === 6, '6 Slots');
  ok(JSON.stringify(G.AVATAR_SLOTS) === JSON.stringify(['hut','kopf','ober','unter','hand','ruecken']), 'Slot-Reihenfolge');
  for (const s of G.AVATAR_SLOTS) {
    const parts = G.AVATAR_PARTS[s];
    ok(parts.length >= 3 && parts.length <= 4, `${s}: 3–4 Teile (${parts.length})`);
    const ids = parts.map(p => p.id);
    ok(new Set(ids).size === ids.length, `${s}: IDs eindeutig`);
    for (const p of parts) {
      ok(p.name && p.name.length > 1, `${s}/${p.id}: Name vorhanden`);
      ok(G.avatarImg(s, p.id) === `assets/av/${s}_${p.id}.png`, `${s}/${p.id}: Bildpfad-Schema`);
    }
  }
  const d = G.avatarDefault();
  ok(G.avatarValid(d), 'Default-Avatar valide');
  ok(G.avatarValid({ hut: 'pilz', kopf: null, ober: 'shirt', unter: 'latz', hand: 'stock', ruecken: 'fluegel' }), 'voller Avatar valide');
  ok(!G.avatarValid({ hut: 'hutman' }), 'unbekannte Teil-ID -> invalide');
  ok(!G.avatarValid(null) && !G.avatarValid('zipfel'), 'null/string -> invalide');
  ok(G.avatarValid({}), 'leerer Avatar valide (alles null)');
}

console.log('== v6: Insel ==');
{
  ok(G.ISLAND_COLS === 6 && G.ISLAND_ROWS === 4 && G.ISLAND_TILES === 24, 'Raster 6×4');
  const coll = { pilze: 2, schlumpfhaus: 1, schlumpf: 3, osterschlumpf: 1 };
  let isl = G.islandEmpty();
  ok(Object.keys(isl.tiles).length === 0, 'leere Insel');
  ok(G.islandCanPlace(isl, coll, 0, 'pilze'), 'platzierbar: besessenes Item, freies Feld');
  ok(!G.islandCanPlace(isl, coll, 0, 'kuchen'), 'nicht besessen -> nicht platzierbar');
  ok(!G.islandCanPlace(isl, coll, 24, 'pilze'), 'Index außerhalb -> false');
  ok(!G.islandCanPlace(isl, coll, -1, 'pilze'), 'negativer Index -> false');
  ok(!G.islandCanPlace(isl, coll, 0, 'drache'), 'unbekanntes Item -> false');
  const isl2 = G.islandPlace(isl, coll, 0, 'pilze');
  ok(isl2 && isl2.tiles[0] === 'pilze', 'platzieren funktioniert');
  ok(Object.keys(isl.tiles).length === 0, 'Original-Insel unverändert (immutable)');
  ok(!G.islandCanPlace(isl2, coll, 0, 'schlumpfhaus'), 'belegtes Feld -> false');
  const isl3 = G.islandPlace(isl2, coll, 5, 'schlumpfhaus');
  ok(isl3 && isl3.tiles[5] === 'schlumpfhaus', 'zweites Feld platzierbar');
  const isl4 = G.islandRemove(isl3, 0);
  ok(isl4 && !isl4.tiles[0] && isl4.tiles[5] === 'schlumpfhaus', 'entfernen funktioniert');
  ok(G.islandRemove(isl4, 99) === null, 'entfernen leeres Feld -> null');
  ok(G.islandInhabitants(coll) === 4, 'Bewohner = 3 Waldschlümpfe + 1 Oster = 4');
  ok(G.islandInhabitants({ schlumpf: 12 }) === 5, 'Bewohner gedeckelt auf 5');
  ok(G.islandInhabitants({}) === 0, 'keine Schlümpfe -> 0 Bewohner');
}

console.log('== v6: Regressionen ==');
{
  ok(G.dirCategory(26) === 'right' && G.dirCategory(-115) === 'back', 'dirCategory unverändert');
  ok(G.catchAllowed(0.8, 0) === true, 'catchAllowed unverändert');
  ok(G.MERCY_MS === 40000, 'Gnadenregel unverändert');
  ok(G.rankOf(10).name === 'Gold', 'Ränge unverändert');
}

console.log(fails === 0 ? '\nALLE V6-TESTS BESTANDEN' : `\n${fails} V6-TEST(S) FEHLGESCHLAGEN`);
process.exit(fails === 0 ? 0 : 1);
