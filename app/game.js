/* ============================================================
   Schlumpf-Späher — reine Spiellogik (ohne DOM, Node-testbar)
   ============================================================ */
(function (root) {
  'use strict';

  const R_EARTH = 6371000; // m

  function toRad(d) { return d * Math.PI / 180; }
  function toDeg(r) { return r * 180 / Math.PI; }

  /* Distanz in Metern zwischen zwei Koordinaten */
  function haversineM(a, b) {
    const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
    const la1 = toRad(a.lat), la2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
    return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /* Anfangspeilung 0..360 von a nach b (0 = Norden, im Uhrzeigersinn) */
  function bearingDeg(a, b) {
    const la1 = toRad(a.lat), la2 = toRad(b.lat), dLon = toRad(b.lon - a.lon);
    const y = Math.sin(dLon) * Math.cos(la2);
    const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  /* Zielpunkt: von Start aus bearingDeg-Grad und distM Meter entfernt */
  function destinationPoint(start, bearing, distM) {
    const ang = distM / R_EARTH, brg = toRad(bearing);
    const la1 = toRad(start.lat), lo1 = toRad(start.lon);
    const la2 = Math.asin(Math.sin(la1) * Math.cos(ang) + Math.cos(la1) * Math.sin(ang) * Math.cos(brg));
    const lo2 = lo1 + Math.atan2(Math.sin(brg) * Math.sin(ang) * Math.cos(la1), Math.cos(ang) - Math.sin(la1) * Math.sin(la2));
    return { lat: toDeg(la2), lon: ((toDeg(lo2) + 540) % 360) - 180 };
  }

  /* Neue Suche: zufällige Peilung + Distanz (v2: kindgerecht kurz, 10–25 m) */
  const HUNT_MIN = 10, HUNT_MAX = 25;
  function newHunt(rnd, minM = HUNT_MIN, maxM = HUNT_MAX) {
    const r = rnd || Math.random;
    return {
      bearing: r() * 360,
      distance: minM + r() * (maxM - minM),
    };
  }

  /* Kompass-Heading aus einem DeviceOrientation-Event (Android/iOS) */
  function headingFromEvent(e) {
    if (!e) return null;
    if (typeof e.webkitCompassHeading === 'number') return (e.webkitCompassHeading + 360) % 360; // iOS
    if (typeof e.alpha === 'number') return (360 - e.alpha) % 360; // Android: alpha gegen Uhrzeigersinn ab Norden
    return null;
  }

  /* Kürzeste Winkeldifferenz a-b in (-180, 180] */
  function normDelta(deg) { return ((deg + 540) % 360) - 180; }

  /* Geglätteter Kompasswert (kreis-Mittel) */
  function smoothHeading(prev, next, k = 0.25) {
    if (prev == null) return next;
    return ((prev + k * normDelta(next - prev)) + 360) % 360;
  }

  /* Fortschritt 0..1 aus Restdistanz/Gesamtdistanz */
  function progressOf(remaining, total) {
    if (!(total > 0)) return 0;
    return Math.min(1, Math.max(0, 1 - remaining / total));
  }

  /* Fortschritts-Punkte: n Punkte, die von rot nach grün wechseln */
  function dotsOf(p, n = 6) {
    const on = Math.round(Math.min(1, Math.max(0, p)) * n);
    return Array.from({ length: n }, (_, i) => i < on);
  }

  /* Kalt-Warm-Skala */
  const SCALE_STEPS = [
    { min: 0.0,  label: 'Eiskalt 🧊',  color: '#4aa3ff' },
    { min: 0.2,  label: 'Kalt ❄️',     color: '#6cc0ff' },
    { min: 0.45, label: 'Lauwarm 🌤️',  color: '#ffd166' },
    { min: 0.65, label: 'Warm 🔥',     color: '#ff9f43' },
    { min: 0.85, label: 'Heiß 🔥🔥',   color: '#ff6b4a' },
    { min: 0.97, label: 'GLÜHEND! 🌋', color: '#ff3b30' },
  ];
  function scaleOf(p) {
    let cur = SCALE_STEPS[0];
    for (const s of SCALE_STEPS) if (p >= s.min) cur = s;
    return cur;
  }

  /* Piep-Intervall (ms) je nach Restdistanz: näher = schneller */
  function tickMs(remaining) {
    return Math.max(350, Math.min(3000, 300 + remaining * 70));
  }

  /* Fang-Radius in Metern (v1, klassisch) */
  const CATCH_RADIUS = 10;
  function catchReady(remaining) { return remaining <= CATCH_RADIUS; }

  /* ---------- v2: großzügiges Fortschrittsmodell ----------
     Jede Bewegung zählt: in Zielrichtung voll, orthogonal/entgegengesetzt
     zu 35 %. Kinder (4–8 J.) sollen nach wenigen Metern belohnt werden. */
  const WRONG_WAY_CREDIT = 0.35;
  function huntProgress(start, cur, hunt) {
    const walked = haversineM(start, cur);
    if (walked < 0.5) return { progress: 0, remaining: hunt.distance, walked: 0 };
    const dir = bearingDeg(start, cur);
    const cosT = Math.cos(toRad(normDelta(dir - hunt.bearing)));
    const toward = walked * cosT;
    /* Jede Bewegung zählt mind. zu 35 %, Zielrichtung voll */
    const credit = Math.max(toward, walked * WRONG_WAY_CREDIT);
    const progress = Math.min(1, credit / hunt.distance);
    return { progress, remaining: Math.max(0, hunt.distance * (1 - progress)), walked };
  }

  /* Fang-Freigabe: Fortschritt ≥ 80 % ODER Gnadenregel nach 40 s */
  const MERCY_MS = 40000;
  function catchAllowed(progress, elapsedMs) {
    return progress >= 0.8 || elapsedMs >= MERCY_MS;
  }

  /* ---------- v3: Schrittzähler (Beschleunigungssensor) ---------- */
  /* Kinderschritt ~0,55 m */
  const CHILD_STEP_M = 0.55;

  function stepProgress(steps, stepLenM, distance) {
    if (!(distance > 0)) return 0;
    return Math.min(1, Math.max(0, (steps * stepLenM) / distance));
  }

  /* Fortschritt aus mehreren Quellen: das beste Signal zählt */
  function combinedProgress() {
    let m = 0;
    for (const p of arguments) if (p > m) m = p;
    return Math.min(1, m);
  }

  /* Peak-Detektor auf der dynamischen Beschleunigung (gravitationsbereinigt).
     Reines Signal rein (dyn, Zeitstempel ms) -> true bei erkanntem Schritt. */
  function makeStepDetector(thresh = 1.25, refractoryMs = 380) {
    let lastStep = -1e9, armed = true;
    return function (dyn, now) {
      if (dyn < thresh * 0.4) armed = true; // ruhig -> wieder scharf
      if (armed && dyn > thresh && now - lastStep >= refractoryMs) {
        lastStep = now; armed = false;
        return true;
      }
      return false;
    };
  }

  /* ---------- Sammelobjekte ---------- */
  /* rarity: 1 häufig (60 %), 2 selten (28 %), 3 legendär (12 %)
     qrOnly: nur per QR-Code-Scan fangbar (Druck-Editionen) */
  const ITEMS = [
    { id: 'schlumpf',    name: 'Waldschlumpf',       img: 'assets/schlumpf.png',    rarity: 3, dodges: 2, fact: 'Ein echter Waldschlumpf! Er war den ganzen Tag unterwegs.' },
    { id: 'sternenstab', name: 'Sternenstab',        img: 'assets/sternenstab.png', rarity: 3, dodges: 2, fact: 'Damit zaubern Schlümpfe Glitzerregen. Vorsicht, kitzelt!' },
    { id: 'schlumpfhaus',name: 'Schlumpfhaus',       img: 'assets/schlumpfhaus.png',rarity: 2, dodges: 1, fact: 'Ein Pilzhaus zum Mitnehmen — da wohnt bestimmt gleich einer ein.' },
    { id: 'glitzerpilz', name: 'Glitzerpilz',        img: 'assets/glitzerpilz.png', rarity: 2, dodges: 1, fact: 'Leuchtet nachts golden. Schlümpfe benutzen ihn als Laterne.' },
    { id: 'goldnuss',    name: 'Goldnuss',           img: 'assets/goldnuss.png',    rarity: 2, dodges: 1, fact: 'Die wertvollste Eichel des Waldes. Eichhörnchen sind neidisch!' },
    { id: 'pilze',       name: 'Fliegenpilz-Familie',img: 'assets/pilze.png',       rarity: 1, dodges: 0, fact: 'Drei freundliche Pilze — die winken immer zurück.' },
    { id: 'geraet',      name: 'Mini-Suchgerät',     img: 'assets/geraet.png',      rarity: 1, dodges: 0, fact: 'Ein Ersatzgerät. Die Nadel zittert schon wieder.' },
    { id: 'fernglas',    name: 'Mini-Fernglas',      img: 'assets/fernglas.png',    rarity: 1, dodges: 0, fact: 'Schlumpf-Größe! Damit sehen die Kleinen bis ans Kuchenbuffet.' },
    { id: 'falle',       name: 'Kuchen-Falle',       img: 'assets/falle.png',       rarity: 1, dodges: 0, fact: 'Leer — der Köder ist weg. Wer war wohl drin?' },
    { id: 'kuchen',      name: 'Schlumpf-Kuchen',    img: 'assets/kuchen.png',      rarity: 1, dodges: 0, fact: 'Erdbeer-Schichtkuchen. Das Lieblingsessen aller Waldschlümpfe.' },
    /* Druck-Editionen (nur per QR-Scan) */
    { id: 'osterschlumpf',    name: 'Oster-Schlumpf',     img: 'assets/osterschlumpf.png',    rarity: 3, qrOnly: true, fact: 'Hat sich als Hase verkleidet. Fast hätten wir ihn übersehen!' },
    { id: 'osterei',          name: 'Goldenes Osterei',   img: 'assets/osterei.png',          rarity: 3, qrOnly: true, fact: 'Glänzt so sehr, dass Vögel neidisch werden.' },
    { id: 'halloweenschlumpf',name: 'Halloween-Schlumpf', img: 'assets/halloweenschlumpf.png',rarity: 3, qrOnly: true, fact: 'Sein Kürbis leuchtet — aber er macht nur lustige Gesichter damit.' },
    { id: 'kuerbis',          name: 'Leucht-Kürbis',      img: 'assets/kuerbis.png',          rarity: 3, qrOnly: true, fact: 'Wärmt im Herbst die kleinen Schlumpf-Füße.' },
    /* v6: Erweiterung (Radar-Pool) */
    { id: 'amulett',   name: 'Eichel-Amulett',  img: 'assets/amulett.png',   rarity: 2, dodges: 1, fact: 'Wer es trägt, findet immer den Heimweg.' },
    { id: 'gluehwurm', name: 'Glühwurm-Glas',   img: 'assets/gluehwurm.png', rarity: 2, dodges: 1, fact: 'Flimmert sanft — die beste Nachttischlampe der Schlümpfe.' },
    { id: 'tautropfen',name: 'Tautropfen-Flasche',img: 'assets/tautropfen.png',rarity: 1, dodges: 0, fact: 'Frisch vom Blatt gefangen. Schmeckt nach Morgen.' },
    { id: 'beeren',    name: 'Beerenkorb',      img: 'assets/beeren.png',    rarity: 1, dodges: 0, fact: 'Rote Waldbeeren — weg damit, bevor die Vögel kommen!' },
    { id: 'moos',      name: 'Mooskissen',      img: 'assets/moos.png',      rarity: 1, dodges: 0, fact: 'So weich, dass man sofort müde wird.' },
    { id: 'kastanie',  name: 'Kastanien-Kerl',  img: 'assets/kastanie.png',  rarity: 1, dodges: 0, fact: 'Glänzt wie frisch poliert und grinst den ganzen Tag.' },
  ];
  const RARITY_WEIGHT = { 1: 60, 2: 28, 3: 12 };

  /* Erst Klasse würfeln (60/28/12 %), dann Zufalls-Item aus der Klasse.
     qrOnly-Items kommen nie in den Radar-Pool. */
  function pickItem(rnd) {
    const r = rnd || Math.random;
    const roll = r() * 100;
    const cls = roll < RARITY_WEIGHT[1] ? 1 : roll < RARITY_WEIGHT[1] + RARITY_WEIGHT[2] ? 2 : 3;
    const pool = ITEMS.filter(i => i.rarity === cls && !i.qrOnly);
    return pool[Math.floor(r() * pool.length) % pool.length];
  }
  function itemById(id) { return ITEMS.find(i => i.id === id) || null; }

  /* ---------- v4: QR-Tokens (Druck-Packs) ---------- */
  const QR_PREFIX = 'SPAHER:ITEM:';
  function buildQrToken(itemId) { return QR_PREFIX + itemId; }
  function parseQrToken(text) {
    if (typeof text !== 'string') return null;
    const t = text.trim();
    if (!t.startsWith(QR_PREFIX)) return null;
    const id = t.slice(QR_PREFIX.length).toLowerCase();
    return itemById(id) ? id : null;
  }

  /* ---------- v4: Rahmen-Ränge (3/6/10) ---------- */
  const RANKS = [
    { rank: 0, at: 0,  name: 'kein Rang', css: '' },
    { rank: 1, at: 3,  name: 'Bronze',    css: 'bronze' },
    { rank: 2, at: 6,  name: 'Silber',    css: 'silber' },
    { rank: 3, at: 10, name: 'Gold',      css: 'gold' },
  ];
  function rankOf(count) {
    let cur = RANKS[0];
    for (const r of RANKS) if (count >= r.at) cur = r;
    return cur;
  }
  /* Fortschritt zum nächsten Rang: {rank, next, nextAt, progress} */
  function rankProgress(count) {
    const cur = rankOf(count);
    const next = RANKS.find(r => r.at > count) || null;
    if (!next) return { rank: cur, next: null, nextAt: null, progress: 1 };
    const prevAt = cur.at;
    return { rank: cur, next, nextAt: next.at, progress: (count - prevAt) / (next.at - prevAt) };
  }

  /* ---------- v4: Mini-Fang mit Schwenken ---------- */
  /* Sichtfenster des Fernglases in Grad (halbe Breite links+rechts) */
  const CATCH_FOV = 60;
  /* relAngle = Sprite-Richtung minus Blickrichtung (Grad, -180..180) */
  function catchView(relAngle) {
    const d = normDelta(relAngle);
    if (Math.abs(d) <= CATCH_FOV / 2) {
      return { visible: true, x: Math.max(-0.9, Math.min(0.9, d / (CATCH_FOV / 2))) };
    }
    return { visible: false, side: d < 0 ? 'left' : 'right' };
  }
  /* Startwinkel des Sprites: seitlich, ±30..100° */
  function randomSpriteAngle(rnd) {
    const r = rnd || Math.random;
    const side = r() < 0.5 ? -1 : 1;
    return side * (30 + r() * 70);
  }
  /* Ausweich-Sprung: auf die andere Seite, ±40..110° vom aktuellen Blick */
  function dodgeAngle(rnd) {
    const r = rnd || Math.random;
    const side = r() < 0.5 ? -1 : 1;
    return side * (40 + r() * 70);
  }

  /* ---------- v4: Schwierigkeitsstufen ---------- */
  const DIFFS = {
    kurz:       { min: 8,  max: 15, label: 'Kurz 🐣' },
    mittel:     { min: 15, max: 30, label: 'Mittel 🚶' },
    expedition: { min: 35, max: 60, label: 'Expedition 🧭' },
  };
  const DEFAULT_DIFF = 'mittel';

  /* ---------- v5: Sprachführung (Schlumpf-Guide) ---------- */
  /* Richtungskategorie aus Winkeldifferenz Ziel-Blick (Grad, -180..180) */
  function dirCategory(deltaDeg) {
    const d = normDelta(deltaDeg);
    const a = Math.abs(d);
    if (a <= 25) return 'straight';
    if (a >= 115) return 'back';
    return d < 0 ? 'left' : 'right';
  }
  /* Meter-Ansagen im 5-m-Raster */
  function distBucket(remaining) { return Math.max(0, Math.round(remaining / 5) * 5); }
  const SPEECH = {
    start: 'Wir haben ein Signal auf dem Radar!',
    straight: 'Geradeaus, genau so weiter!',
    left: 'Mehr nach links laufen, wo ich hinzeige!',
    right: 'Mehr nach rechts laufen, wo ich hinzeige!',
    back: 'Du musst dich umdrehen!',
    far: m => `Das Signal ist noch ${m} Meter entfernt!`,
    near: m => `Nur noch ${m} Meter, wir haben es gleich!`,
    unlock: 'Da! Der Schlumpf ist ganz nah! Fernglas raus!',
    caught: 'Super gemacht! Gefangen!',
  };

  /* ---------- v6: Avatar-Baukasten ---------- */
  const AVATAR_SLOTS = ['hut', 'kopf', 'ober', 'unter', 'hand', 'ruecken'];
  const AVATAR_PARTS = {
    hut:     [{ id: 'zipfel', name: 'Zipfelmütze' }, { id: 'pilz', name: 'Pilzhut' }, { id: 'kranz', name: 'Blumenkranz' }, { id: 'zauber', name: 'Zauberhut' }],
    kopf:    [{ id: 'brille', name: 'Brille' }, { id: 'bart', name: 'Bart' }, { id: 'stern', name: 'Sternenbrille' }],
    ober:    [{ id: 'weste', name: 'Weste' }, { id: 'schuerze', name: 'Schürze' }, { id: 'shirt', name: 'Streifenshirt' }],
    unter:   [{ id: 'rot', name: 'Rote Hose' }, { id: 'blau', name: 'Blaue Hose' }, { id: 'latz', name: 'Latzhose' }],
    hand:    [{ id: 'stock', name: 'Wanderstock' }, { id: 'laterne', name: 'Laterne' }, { id: 'blume', name: 'Blumen' }, { id: 'korb', name: 'Beerenkorb' }],
    ruecken: [{ id: 'rucksack', name: 'Rucksack' }, { id: 'schirm', name: 'Pilzschirm' }, { id: 'fluegel', name: 'Blattflügel' }],
  };
  function avatarImg(slot, id) { return `assets/av/${slot}_${id}.png`; }
  function avatarDefault() { return { hut: 'zipfel', kopf: null, ober: 'weste', unter: 'blau', hand: null, ruecken: null }; }
  function avatarValid(a) {
    if (!a || typeof a !== 'object') return false;
    for (const s of AVATAR_SLOTS) {
      const v = a[s];
      if (v == null) continue;
      if (!AVATAR_PARTS[s].some(p => p.id === v)) return false;
    }
    return true;
  }

  /* ---------- v6: Schlumpfinsel ---------- */
  const ISLAND_COLS = 6, ISLAND_ROWS = 4;
  const ISLAND_TILES = ISLAND_COLS * ISLAND_ROWS;
  function islandEmpty() { return { tiles: {} }; }
  function islandCanPlace(island, coll, idx, itemId) {
    if (!island || !island.tiles) return false;
    if (!Number.isInteger(idx) || idx < 0 || idx >= ISLAND_TILES) return false;
    if (!itemById(itemId)) return false;
    if ((coll[itemId] || 0) <= 0) return false;
    return !island.tiles[idx];
  }
  function islandPlace(island, coll, idx, itemId) {
    if (!islandCanPlace(island, coll, idx, itemId)) return null;
    const tiles = Object.assign({}, island.tiles);
    tiles[idx] = itemId;
    return { tiles };
  }
  function islandRemove(island, idx) {
    if (!island || !island.tiles || !island.tiles[idx]) return null;
    const tiles = Object.assign({}, island.tiles);
    delete tiles[idx];
    return { tiles };
  }
  /* Waldschlümpfe + Editions-Schlümpfe ziehen ein (max. 5 sichtbar) */
  function islandInhabitants(coll) {
    const n = (coll.schlumpf || 0) + (coll.osterschlumpf || 0) + (coll.halloweenschlumpf || 0);
    return Math.min(5, n);
  }

  /* ---------- v5: Cloud-Sync (Sammlung zusammenführen) ---------- */
  /* Vereinigung zweier Sammlungen: pro Art der höhere Stand gewinnt */
  function mergeCollections(a, b) {
    const out = Object.assign({}, a || {});
    for (const k in (b || {})) out[k] = Math.max(out[k] || 0, b[k] || 0);
    return out;
  }

  const GameLogic = {
    toRad, toDeg, haversineM, bearingDeg, destinationPoint, newHunt, HUNT_MIN, HUNT_MAX,
    headingFromEvent, normDelta, smoothHeading, progressOf, dotsOf,
    scaleOf, SCALE_STEPS, tickMs, CATCH_RADIUS, catchReady,
    huntProgress, WRONG_WAY_CREDIT, catchAllowed, MERCY_MS,
    CHILD_STEP_M, stepProgress, combinedProgress, makeStepDetector,
    ITEMS, RARITY_WEIGHT, pickItem, itemById,
    QR_PREFIX, buildQrToken, parseQrToken,
    RANKS, rankOf, rankProgress,
    CATCH_FOV, catchView, randomSpriteAngle, dodgeAngle,
    DIFFS, DEFAULT_DIFF,
    dirCategory, distBucket, SPEECH, mergeCollections,
    AVATAR_SLOTS, AVATAR_PARTS, avatarImg, avatarDefault, avatarValid,
    ISLAND_COLS, ISLAND_ROWS, ISLAND_TILES, islandEmpty, islandCanPlace, islandPlace, islandRemove, islandInhabitants,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = GameLogic;
  else root.GameLogic = GameLogic;
})(typeof self !== 'undefined' ? self : globalThis);
