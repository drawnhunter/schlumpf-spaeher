/* Test v7: Wichtel-Wacht + Insel-Bewohner — node verifier/v7/test_game_v7.mjs */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const G = require('../../game.js');

let fails = 0;
function ok(cond, msg) {
  if (cond) console.log('  PASS  ' + msg);
  else { fails++; console.log('  FAIL  ' + msg); }
}

console.log('== v7: Katalog (34 Items, 14 Gnome) ==');
{
  ok(G.ITEMS.length === 34, 'genau 34 Sammelobjekte');
  const ids = new Set(G.ITEMS.map(i => i.id));
  ok(ids.size === 34, 'IDs eindeutig');
  const gnome = G.ITEMS.filter(i => i.gnome);
  ok(gnome.length === 17, '17 Gnome (14 Wichtel + Waldschlumpf + 2 Editions-Schlümpfe)');
  const wichtel = G.ITEMS.filter(i => i.gnome && i.img.startsWith('assets/wichtel_'));
  ok(wichtel.length === 14, '14 Wichtel-Wacht-Figuren');
  ok(wichtel.filter(i => i.rarity === 1).length === 6, '6 häufige Wichtel');
  ok(wichtel.filter(i => i.rarity === 2).length === 5, '5 seltene Wichtel');
  ok(wichtel.filter(i => i.rarity === 3).length === 3, '3 legendäre Wichtel');
  ok(wichtel.every(i => !i.qrOnly), 'Wichtel sind Radar-Funde (kein qrOnly)');
  ok(wichtel.every(i => i.name && i.fact && i.name.length > 2), 'Namen + Facts vorhanden');
  let qrInRadar = 0, seed = 13;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 30000; i++) if (G.pickItem(rnd).qrOnly) qrInRadar++;
  ok(qrInRadar === 0, 'qrOnly weiterhin nie im Radar-Pool');
  let gnomeInRadar = 0;
  for (let i = 0; i < 30000; i++) if (G.pickItem(rnd).gnome) gnomeInRadar++;
  ok(gnomeInRadar > 8000, 'Gnome tauchen regelmäßig im Radar auf');
}

console.log('== v7: Insel-Bewohner (alle Gnome) ==');
{
  ok(G.islandInhabitants({}) === 0, 'leer -> 0');
  ok(G.islandInhabitants({ pfitz: 1 }) === 1, '1 Wichtel -> 1 Bewohner');
  ok(G.islandInhabitants({ pfitz: 2, sylvio: 1, kuchen: 5 }) === 3, 'Gnome summiert, Objekte ignoriert');
  ok(G.islandInhabitants({ schlumpf: 1, osterschlumpf: 1 }) === 2, 'Klassik-Schlümpfe zählen weiter');
  ok(G.islandInhabitants({ pfitz: 4, moosmichel: 4, borste: 2 }) === 5, 'gedeckelt auf 5');
}

console.log('== v7: Regressionen ==');
{
  ok(G.ISLAND_TILES === 24, 'Insel-Raster unverändert');
  ok(G.dirCategory(26) === 'right', 'dirCategory unverändert');
  ok(G.catchAllowed(0.8, 0), 'catchAllowed unverändert');
  ok(G.MERCY_MS === 40000, 'Gnadenregel unverändert');
  ok(G.rankOf(10).name === 'Gold', 'Ränge unverändert');
  ok(G.AVATAR_SLOTS.length === 6, 'Avatar-Slots unverändert');
  ok(G.parseQrToken('SPAHER:ITEM:kuerbis') === 'kuerbis', 'QR-Tokens unverändert');
}

console.log(fails === 0 ? '\nALLE V7-TESTS BESTANDEN' : `\n${fails} V7-TEST(S) FEHLGESCHLAGEN`);
process.exit(fails === 0 ? 0 : 1);
