/* ============================================================
   Schlumpf-Späher — App-Steuerung (DOM, Sensoren, Fang)
   ============================================================ */
'use strict';
const $ = id => document.getElementById(id);
const G = window.GameLogic;

/* ---------- Zustand ---------- */
let demoMode = false;          // Übungsmodus ohne GPS
let hunt = null;               // {bearing, distance}
let target = null;             // {lat, lon}
let pos = null;                // letzte GPS-Position {lat,lon,acc}
let fakePos = null;            // Demo-Position
let heading = null;            // geglätteter Kompasskurs
let gpsHeading = null;         // Kurs aus GPS (bei Bewegung)
let watchId = null;
let remaining = Infinity;
let stream = null, torchOn = false, zoomCaps = null, zoomVal = 1;
let spriteItem = null, dodgesLeft = 0, spriteSpawnTO = null, hopTimer = null;
let coll = {};                 // {itemId: anzahl}
let navLastUpdate = 0;
let tickTO = null;
let navPoll = null;
let demoTapCount = 0, demoTapT = 0;
let cameFrom = 'home';
let startPos = null;         // Startpunkt der aktuellen Suche
let huntStartAt = 0;         // für die Gnadenregel
let lastProgress = 0;
let lastPosTime = 0;
let autoToastDone = false;
let stepsWalked = 0;         // Schritte der aktuellen Suche
let stepDetect = null;       // Peak-Detektor
let gravLp = 0;              // Schwerkraft-Tiefpass
let noCompassMode = false;   // kein Kompass -> Pfeil scannt
let noCompassTO = null;
let motionStarted = false;
let diff = G.DEFAULT_DIFF;   // Schwierigkeit (localStorage)
let elternDeg = 0;           // Eltern-Modus: gewählte Richtung
let customPending = null;    // Eltern-Modus: Hunt wartet auf ersten GPS-Fix
let spriteRel = null;        // Fang: Sprite-Richtung relativ zum Kompass
let catchClassic = false;    // Fang: Fallback ohne Gyro (Sprite auf Screen)
let orientSeen = false;      // kam im Fang schon ein Orientierungs-Event?
let scanStream = null, scanRAF = null, scanCanvas = null, scanFound = false, lastQrToast = 0;
let avatar = null;           // eigener Schlumpf (Slot-Auswahl)
let island = null;           // Insel-Bebauung
let inselEdit = false, pickedTile = null, wanderTimer = null;

/* ---------- v5: Sprachführung ---------- */
let voiceOn = localStorage.getItem('schlumpfVoice') !== '0';
let lastDirCat = null, lastBucket = null, lastSpeakAt = 0, unlockSpoken = false;
function speak(text) {
  if (!voiceOn || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE'; u.pitch = 1.7; u.rate = 1.05; // hohe Schlumpf-Stimme
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (e) {}
}
function toggleVoice() {
  voiceOn = !voiceOn;
  localStorage.setItem('schlumpfVoice', voiceOn ? '1' : '0');
  $('voiceBtn').textContent = voiceOn ? '🔊' : '🔇';
  if (!voiceOn && 'speechSynthesis' in window) speechSynthesis.cancel();
  else if (voiceOn) speak(G.SPEECH.start);
}
function voiceReset() {
  lastDirCat = null; lastBucket = null; lastSpeakAt = 0; unlockSpoken = false;
  $('mascotBubble').textContent = 'Bereit zur Suche!';
  $('mascotDir').textContent = '🧭';
  $('navMascotWrap').className = '';
}

/* ---------- v6: Avatar ---------- */
/* Kalibrierte Anker (visuell getestet): [Breite%, Links%, Wert%, Ankermodus]
   Hut wird an der UNTERKANTE verankert (sitzzt so auf jeder Kopfform). */
const AVATAR_ANCHORS = {
  ruecken: { default: [.60, .00, .24, 'top'], schirm: [.55, .20, .02, 'top'], fluegel: [.62, .19, .16, 'top'], rucksack: [.55, .00, .26, 'top'] },
  hut:     { default: [.56, .22, .75, 'bottom'], zipfel: [.56, .22, .75, 'bottom'], zauber: [.58, .21, .75, 'bottom'], kranz: [.64, .18, .73, 'bottom'], pilz: [.68, .16, .75, 'bottom'] },
  kopf:    { default: [.44, .28, .145, 'top'], bart: [.50, .25, .25, 'top'] },
  ober:    { default: [.66, .17, .32, 'top'] },
  unter:   { default: [.58, .21, .58, 'top'] },
  hand:    { default: [.34, .70, .40, 'top'], blume: [.30, .72, .42, 'top'], korb: [.34, .70, .48, 'top'] },
};
function loadAvatar() {
  try { avatar = JSON.parse(localStorage.getItem('schlumpfAvatar') || 'null'); } catch (e) { avatar = null; }
  if (!G.avatarValid(avatar)) avatar = G.avatarDefault();
}
function saveAvatarState() { localStorage.setItem('schlumpfAvatar', JSON.stringify(avatar)); cloudPush(); }
/* Avatar in ein Element rendern (gestapelte Ebenen mit kalibrierten Ankern) */
function renderAvatar(el, av) {
  el.innerHTML = '';
  const parts = [];
  if (av.ruecken) parts.push(['ruecken', av.ruecken]);
  parts.push([null, null]); // Basis
  for (const s of ['unter', 'ober', 'hand', 'kopf', 'hut']) if (av[s]) parts.push([s, av[s]]);
  for (const [slot, id] of parts) {
    const img = document.createElement('img');
    img.draggable = false;
    if (!slot) {
      img.src = 'assets/av/base.png';
      img.className = 'p-base';
    } else {
      img.src = G.avatarImg(slot, id);
      img.className = 'p-' + slot;
      const [w, l, v, mode] = (AVATAR_ANCHORS[slot] && (AVATAR_ANCHORS[slot][id] || AVATAR_ANCHORS[slot].default)) || [.5, .25, 0, 'top'];
      img.style.width = (w * 100) + '%';
      img.style.left = (l * 100) + '%';
      if (mode === 'bottom') img.style.bottom = (v * 100) + '%';
      else img.style.top = (v * 100) + '%';
    }
    el.appendChild(img);
  }
}
function renderMascots() {
  renderAvatar($('homeAvatar'), avatar);
  renderAvatar($('navMascot'), avatar);
}

/* ---------- Avatar-Editor ---------- */
let editAvatar = null, activeSlot = 'hut';
function openAvatar() {
  editAvatar = Object.assign({}, avatar);
  activeSlot = 'hut';
  renderSlotTabs(); renderOptGrid();
  renderAvatar($('avatarPreview'), editAvatar);
  show('avatar');
}
function closeAvatar() { show('home'); }
function renderSlotTabs() {
  const labels = { hut: '🎩 Hut', kopf: '😊 Kopf', ober: '🎽 Oberkörper', unter: '👖 Unterkörper', hand: '🖐️ In Hand', ruecken: '🎒 Rücken' };
  const t = $('slotTabs'); t.innerHTML = '';
  for (const s of G.AVATAR_SLOTS) {
    const b = document.createElement('button');
    b.textContent = labels[s];
    b.classList.toggle('sel', s === activeSlot);
    b.onclick = () => { activeSlot = s; renderSlotTabs(); renderOptGrid(); };
    t.appendChild(b);
  }
}
function renderOptGrid() {
  const g = $('optGrid'); g.innerHTML = '';
  // „Nichts"-Option
  const none = document.createElement('button');
  none.className = 'opt' + (editAvatar[activeSlot] == null ? ' sel' : '');
  none.innerHTML = '<div class="clear">—</div><div class="oname">Nichts</div>';
  none.onclick = () => { editAvatar[activeSlot] = null; renderOptGrid(); renderAvatar($('avatarPreview'), editAvatar); play('beep', .3); };
  g.appendChild(none);
  for (const p of G.AVATAR_PARTS[activeSlot]) {
    const b = document.createElement('button');
    b.className = 'opt' + (editAvatar[activeSlot] === p.id ? ' sel' : '');
    b.innerHTML = `<img src="${G.avatarImg(activeSlot, p.id)}" alt="${p.name}"><div class="oname">${p.name}</div>`;
    b.onclick = () => { editAvatar[activeSlot] = p.id; renderOptGrid(); renderAvatar($('avatarPreview'), editAvatar); play('beep', .3); };
    g.appendChild(b);
  }
}
function avatarRandom() {
  for (const s of G.AVATAR_SLOTS) {
    const pool = [null, ...G.AVATAR_PARTS[s].map(p => p.id)];
    editAvatar[s] = pool[Math.floor(Math.random() * pool.length)];
  }
  renderOptGrid(); renderAvatar($('avatarPreview'), editAvatar);
  play('sparkle', .6);
}
function saveAvatar() {
  avatar = Object.assign({}, editAvatar);
  saveAvatarState(); renderMascots();
  play('fanfare', .8);
  toast('💾 Dein Schlumpf ist fertig!');
  show('home');
}

/* ---------- v6: Schlumpfinsel ---------- */
function loadIsland() {
  try { island = JSON.parse(localStorage.getItem('schlumpfInsel') || 'null'); } catch (e) { island = null; }
  if (!island || !island.tiles) island = G.islandEmpty();
}
function saveIsland() { localStorage.setItem('schlumpfInsel', JSON.stringify(island)); cloudPush(); }
function openInsel() {
  renderIsland();
  show('insel');
  startWander();
}
function closeInsel() {
  clearInterval(wanderTimer); wanderTimer = null;
  $('tileModal').classList.remove('open');
  inselEdit = false; $('insel').classList.remove('edit');
  show('home');
}
function toggleInselEdit() {
  inselEdit = !inselEdit;
  $('insel').classList.toggle('edit', inselEdit);
  toast(inselEdit ? '✏️ Tippe ein freies Feld zum Bauen' : 'Fertig gebaut!');
  play('beep', .4);
}
function renderIsland() {
  const grid = $('inselGrid'); grid.innerHTML = '';
  for (let i = 0; i < G.ISLAND_TILES; i++) {
    const t = document.createElement('div');
    const itemId = island.tiles[i];
    t.className = 'tile' + (itemId ? '' : ' empty');
    if (itemId) {
      const it = G.itemById(itemId);
      const img = document.createElement('img');
      img.src = it.img; img.alt = it.name; img.draggable = false;
      t.appendChild(img);
    }
    t.addEventListener('pointerdown', () => onTileTap(i));
    grid.appendChild(t);
  }
  const n = G.islandInhabitants(coll);
  $('inselInfo').textContent = `🏝️ Bewohner: ${n} · Bauten: ${Object.keys(island.tiles).length}`;
  renderBewohner(n);
}
function renderBewohner(n) {
  const layer = $('bewohnerLayer'); layer.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const b = document.createElement('img');
    b.src = 'assets/schlumpf.png';
    b.className = 'bewohner';
    b.style.left = (20 + Math.random() * 55) + '%';
    b.style.top = (30 + Math.random() * 45) + '%';
    b.draggable = false;
    layer.appendChild(b);
  }
}
function startWander() {
  clearInterval(wanderTimer);
  wanderTimer = setInterval(() => {
    document.querySelectorAll('#bewohnerLayer .bewohner').forEach(b => {
      b.style.left = (20 + Math.random() * 55) + '%';
      b.style.top = (30 + Math.random() * 45) + '%';
    });
  }, 2600);
}
function onTileTap(idx) {
  if (!inselEdit) return;
  pickedTile = idx;
  const picker = $('tilePicker'); picker.innerHTML = '';
  const owned = G.ITEMS.filter(it => (coll[it.id] || 0) > 0);
  if (owned.length === 0) {
    picker.innerHTML = '<p style="grid-column:1/-1;font-weight:800;color:#7286a0">Noch nichts gefunden — erst suchen gehen! 🔭</p>';
  }
  for (const it of owned) {
    const b = document.createElement('button');
    b.className = 'opt';
    b.innerHTML = `<img src="${it.img}" alt="${it.name}"><div class="oname">${it.name}</div>`;
    b.onclick = () => {
      const ni = G.islandPlace(island, coll, pickedTile, it.id);
      if (ni) { island = ni; saveIsland(); renderIsland(); play('sparkle', .6); }
      $('tileModal').classList.remove('open');
    };
    picker.appendChild(b);
  }
  $('tileClear').style.display = island.tiles[idx] ? '' : 'none';
  $('tileModal').classList.add('open');
}
function clearTile() {
  const ni = G.islandRemove(island, pickedTile);
  if (ni) { island = ni; saveIsland(); renderIsland(); }
  $('tileModal').classList.remove('open');
}

/* ---------- Sounds ---------- */
const sfx = {};
['beep', 'giggle', 'fanfare', 'sparkle', 'huch'].forEach(n => {
  sfx[n] = new Audio(n + '.mp3');
  sfx[n].preload = 'auto';
});
function play(n, vol = 1) {
  try { const a = sfx[n]; a.volume = vol; a.currentTime = 0; a.play().catch(() => {}); } catch (e) {}
}
function unlockAudio() { try { sfx.beep.volume = 0.01; sfx.beep.play().then(() => sfx.beep.pause()).catch(() => {}); } catch (e) {} }

/* ---------- Sammlung ---------- */
function loadColl() {
  try { coll = JSON.parse(localStorage.getItem('schlumpfSammlung') || '{}'); } catch (e) { coll = {}; }
}
function saveColl() { localStorage.setItem('schlumpfSammlung', JSON.stringify(coll)); cloudPush(); }

/* ---------- v5: Konto & Cloud-Sync ---------- */
let apiToken = localStorage.getItem('schlumpfToken') || null;
let apiUser = localStorage.getItem('schlumpfUser') || null;
let pushTimer = null;
function apiBase() { return (localStorage.getItem('schlumpfApi') || '').replace(/\/$/, ''); }
async function api(path, opts = {}) {
  return fetch(apiBase() + '/api' + path, Object.assign({}, opts, {
    headers: Object.assign({ 'Content-Type': 'application/json' }, apiToken ? { Authorization: 'Bearer ' + apiToken } : {}),
  }));
}
function setSyncStatus(t) { const el = $('syncStatus'); if (el) el.textContent = t; }
function cloudPush() {
  if (!apiToken) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    try {
      const r = await api('/state', { method: 'PUT', body: JSON.stringify({ state: { collection: coll, diff, avatar, island } }) });
      setSyncStatus(r.ok ? '☁️ In der Cloud gespeichert.' : '⚠️ Nur lokal gespeichert (Server meldet Fehler).');
    } catch (e) { setSyncStatus('⚠️ Nur lokal gespeichert (Server nicht erreichbar).'); }
  }, 1500);
}
async function cloudPull() {
  try {
    const r = await api('/state');
    if (!r.ok) return;
    const { state } = await r.json();
    if (state && state.collection) {
      coll = G.mergeCollections(coll, state.collection);
      if (state.diff && G.DIFFS[state.diff]) { diff = state.diff; localStorage.setItem('schlumpfDiff', diff); renderDiff(); }
      if (state.avatar && G.avatarValid(state.avatar) && !localStorage.getItem('schlumpfAvatar')) {
        avatar = state.avatar;
        localStorage.setItem('schlumpfAvatar', JSON.stringify(avatar));
        renderMascots();
      }
      if (state.island && state.island.tiles && !localStorage.getItem('schlumpfInsel')) {
        island = state.island;
        localStorage.setItem('schlumpfInsel', JSON.stringify(island));
      }
      saveColl(); renderChip();
    }
  } catch (e) {}
}
function openKonto() { renderKonto(); show('konto'); }
function renderKonto() {
  const loggedIn = !!apiUser;
  $('kontoStatus').textContent = loggedIn ? `Eingeloggt als ${apiUser}` : 'Nicht eingeloggt';
  $('kontoForm').style.display = loggedIn ? 'none' : '';
  $('kontoLogged').style.display = loggedIn ? '' : 'none';
  if (!loggedIn) setSyncStatus('Ohne Konto bleibt die Sammlung nur auf diesem Gerät.');
}
async function authRequest(path, name, pin, email, okMsg) {
  name = (name || '').trim();
  if (name.length < 2) { toast('Name fehlt (mind. 2 Zeichen)'); return false; }
  if (!/^\d{4}$/.test(pin)) { toast('PIN = 4 Ziffern'); return false; }
  const body = { name, pin };
  if (email && email.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast('⚠️ E-Mail sieht komisch aus'); return false; }
    body.email = email.trim();
  }
  try {
    const r = await api(path, { method: 'POST', body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { toast('⚠️ ' + (data.error || 'Fehler ' + r.status)); return false; }
    apiToken = data.token; apiUser = data.name;
    localStorage.setItem('schlumpfToken', apiToken);
    localStorage.setItem('schlumpfUser', apiUser);
    toast(okMsg);
    await cloudPull();
    renderKonto();
    setSyncStatus('☁️ Verbunden. Sammlung wird synchronisiert.');
    return true;
  } catch (e) {
    toast('⚠️ Server nicht erreichbar — bleibt lokal');
    return false;
  }
}
function doRegister() { authRequest('/register', $('kontoName').value, $('kontoPin').value, $('kontoMail').value, '🎉 Konto erstellt!'); }
function doLogin() { authRequest('/login', $('kontoName').value, $('kontoPin').value, null, '👋 Willkommen zurück!'); }

/* ---------- v6: Onboarding ---------- */
function startAsGuest() {
  localStorage.setItem('schlumpfOnboarded', '1');
  play('fanfare', .6);
  toast('🎒 Los geht\'s, kleiner Sucher!');
  show('home');
}
async function startRegister() {
  const okGo = await authRequest('/register', $('startName').value, $('startPin').value, $('startMail').value, '🎉 Konto erstellt!');
  if (okGo) { localStorage.setItem('schlumpfOnboarded', '1'); show('home'); }
}
async function startLogin() {
  const okGo = await authRequest('/login', $('startName').value, $('startPin').value, null, '👋 Willkommen zurück!');
  if (okGo) { localStorage.setItem('schlumpfOnboarded', '1'); show('home'); }
}
async function doLogout() {
  try { await api('/logout', { method: 'POST' }); } catch (e) {}
  apiToken = null; apiUser = null;
  localStorage.removeItem('schlumpfToken'); localStorage.removeItem('schlumpfUser');
  renderKonto(); toast('Abgemeldet — Sammlung bleibt lokal.');
}
function saveApiBase() {
  localStorage.setItem('schlumpfApi', $('apiBaseInput').value.trim());
  toast('💾 Server-Adresse gespeichert');
}
function collStats() {
  let species = 0, total = 0;
  for (const k in coll) if (coll[k] > 0) { species++; total += coll[k]; }
  return { species, total };
}
function renderChip() {
  const s = collStats();
  $('chipText').textContent = `${s.species} von ${G.ITEMS.length} Arten`;
  $('chipCount').textContent = `· ${s.total} gefangen`;
  $('catchChip').textContent = s.total;
}

/* ---------- View-Wechsel ---------- */
function show(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $(id).classList.add('active');
}
function toast(msg, ms = 1100) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._to); t._to = setTimeout(() => t.classList.remove('show'), ms);
}

/* ============================================================
   SUCHE / RADAR
   ============================================================ */
/* Gemeinsame Jagd-Initialisierung (Radar & Eltern-Modus) */
function beginHunt() {
  unlockAudio();
  cameFrom = 'home';
  huntStartAt = Date.now();
  autoToastDone = false;
  voiceReset();
  stepsWalked = 0;
  stepDetect = G.makeStepDetector();
  gravLp = 0;
  noCompassMode = false;
  clearTimeout(noCompassTO);
  noCompassTO = setTimeout(() => {
    if (heading == null && gpsHeading == null) noCompassMode = true;
  }, 5000);
  startMotion();
  $('gpsNote').textContent = 'GPS sucht …';
  show('radar');
}

function ensureGps() {
  if (watchId != null || !navigator.geolocation) return;
  let gotFirst = false;
  navigator.geolocation.getCurrentPosition(p => {
    gotFirst = true;
    onPos(p);
    /* Watcher ohne distanceFilter (manche Android-Builds schlucken ihn sonst) */
    watchId = navigator.geolocation.watchPosition(onPos, geoErr,
      { enableHighAccuracy: true, maximumAge: 1500 });
  }, geoErr, { enableHighAccuracy: true, timeout: 9000, maximumAge: 5000 });
  setTimeout(() => { if (!gotFirst && !pos && !demoMode) enterDemo('GPS braucht zu lange — Übungsmodus an!'); }, 10000);
  /* Zusatz-Polling, falls der Watcher schweigt */
  clearInterval(navPoll);
  navPoll = setInterval(() => {
    if (!$('radar').classList.contains('active') || demoMode) return;
    navigator.geolocation.getCurrentPosition(onPos, () => {},
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 1500 });
    updateNav(true); // auch ohne neuen Fix: Notiz/Gnadenregel aktualisieren
  }, 2500);
}

function startHunt() {
  beginHunt();
  if (demoMode) { demoStart(); scheduleTick(); return; }
  if (!navigator.geolocation) { enterDemo('Kein GPS auf diesem Gerät — Übungsmodus an!'); scheduleTick(); return; }
  if (pos) { newTarget(pos); updateNav(true); }
  ensureGps();
  startOrientation();
  scheduleTick();
}

/* ---------- Schwierigkeit ---------- */
function setDiff(d) {
  diff = d;
  localStorage.setItem('schlumpfDiff', d);
  renderDiff();
}
function renderDiff() {
  const D = G.DIFFS[diff];
  $('diffSel').value = diff;
  $('searchDesc').textContent = `${D.label}: ${D.min}–${D.max} m entfernt`;
}
function geoErr() { if (!pos && !demoMode) enterDemo('Kein GPS-Signal — Übungsmodus an! Tipp den Pfeil zum Laufen.'); }

function enterDemo(msg) {
  demoMode = true;
  demoStart();
  toast('🧪 ' + msg, 2600);
}

/* Demo: Startpunkt fest (Berlin-Nähe), Schritte per Tipp auf den Pfeil */
function demoStart() {
  fakePos = fakePos || { lat: 52.5200, lon: 13.4050 };
  pos = null;
  huntStartAt = Date.now();
  autoToastDone = false;
  voiceReset();
  stepsWalked = 0;
  stepDetect = G.makeStepDetector();
  noCompassMode = false;
  newTarget(fakePos);
  $('gpsNote').textContent = 'Übungsmodus — tipp den Pfeil zum Laufen';
  updateNav(true);
}

function newTarget(from) {
  const D = G.DIFFS[diff];
  hunt = G.newHunt(Math.random, D.min, D.max);
  target = G.destinationPoint(from, hunt.bearing, hunt.distance);
  startPos = { lat: from.lat, lon: from.lon };
  remaining = hunt.distance;
  lastProgress = 0;
}

/* Positions-Fixes: glätten, grob ungenaue verwerfen */
function onPos(p) {
  const acc = p.coords.accuracy || 99;
  lastPosTime = Date.now();
  const usable = !(pos && acc > 40 && (pos.acc || 99) <= 25);
  if (usable) {
    if (pos) pos = {
      lat: pos.lat + (p.coords.latitude - pos.lat) * 0.5,
      lon: pos.lon + (p.coords.longitude - pos.lon) * 0.5,
      acc,
    };
    else pos = { lat: p.coords.latitude, lon: p.coords.longitude, acc };
  }
  if (p.coords.heading != null && !isNaN(p.coords.heading)) gpsHeading = p.coords.heading;
  if (!target && pos) {
    if (customPending) { const f = customPending; customPending = null; f(pos); }
    else newTarget(pos);
  }
  updateNav(true);
}

/* ---------- Schrittzähler (Beschleunigungssensor) ---------- */
function startMotion() {
  if (motionStarted) return;
  motionStarted = true;
  try {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().catch(() => {}); // iOS
    }
  } catch (e) {}
  window.addEventListener('devicemotion', onMotion, true);
}
function onMotion(e) {
  if (!$('radar').classList.contains('active') || !hunt) return;
  let dyn = null;
  const ag = e.accelerationIncludingGravity;
  if (ag && ag.x != null) {
    const mag = Math.hypot(ag.x || 0, ag.y || 0, ag.z || 0);
    gravLp = gravLp === 0 ? mag : gravLp + 0.15 * (mag - gravLp);
    dyn = mag - gravLp;
  } else if (e.acceleration && e.acceleration.x != null) {
    dyn = Math.hypot(e.acceleration.x || 0, e.acceleration.y || 0, e.acceleration.z || 0);
  }
  if (dyn == null || !stepDetect) return;
  const now = (typeof e.timeStamp === 'number' && e.timeStamp > 0) ? e.timeStamp : Date.now();
  if (stepDetect(dyn, now)) {
    stepsWalked++;
    updateNav(true);
  }
}

/* ---------- Kompass ---------- */
let orientStarted = false;
function startOrientation() {
  if (orientStarted) return;
  orientStarted = true;
  const h = e => {
    const hd = G.headingFromEvent(e);
    if (hd != null) {
      heading = G.smoothHeading(heading, hd, 0.25);
      orientSeen = true;
      if ($('catch').classList.contains('active')) {
        if (catchClassic && spriteItem) {
          catchClassic = false;
          if (spriteRel == null) spriteRel = G.randomSpriteAngle(Math.random);
        }
        updateSpriteView();
      } else {
        updateNav();
      }
    }
  };
  window.addEventListener('deviceorientationabsolute', h, true);
  window.addEventListener('deviceorientation', h, true);
}

/* ---------- Radar-Anzeige ---------- */
function currentPos() { return demoMode ? fakePos : pos; }

/* force=true bei diskreten Updates (GPS-Fix, Demo-Schritt), gedrosselt nur bei Kompass-Events */
function updateNav(force) {
  if (!$('radar').classList.contains('active')) return;
  const now = Date.now();
  if (!force && now - navLastUpdate < 100) return;
  navLastUpdate = now;

  const cp = currentPos();
  if (!cp || !target || !startPos) return;

  /* v3: Fortschritt = bestes Signal aus GPS-Credit und Schritten */
  const gpsP = G.huntProgress(startPos, cp, hunt).progress;
  const stepP = G.stepProgress(stepsWalked, G.CHILD_STEP_M, hunt.distance);
  const p = G.combinedProgress(gpsP, stepP);
  remaining = hunt.distance * (1 - p);
  lastProgress = p;
  const elapsed = Date.now() - huntStartAt;
  const allowed = G.catchAllowed(p, elapsed);

  const brg = G.bearingDeg(cp, target);
  const head = heading != null ? heading : gpsHeading;
  const ang = head != null ? G.normDelta(brg - head) : brg;
  if (noCompassMode && head == null) {
    $('arrow').classList.add('scanning'); // kein Kompass: Pfeil scannt langsam
  } else {
    $('arrow').classList.remove('scanning');
    $('arrow').style.transform = `translate(-50%,-58%) rotate(${ang}deg)`;
  }
  $('distLbl').textContent = Math.max(0, Math.round(remaining)) + ' m';

  G.dotsOf(p, 6).forEach((on, i) => $('navDots').children[i].classList.toggle('on', on));

  const sc = G.scaleOf(p);
  const fillH = Math.round(p * 100);
  $('thermoFill').style.height = fillH + '%';
  $('thermoMarker').style.bottom = `calc(${fillH}% - 8px)`;
  $('thermoMarker').textContent = p >= 0.85 ? '🔥' : p >= 0.45 ? '🌤️' : '🧊';
  $('scaleLbl').textContent = sc.label.replace(/\s*\S*$/, '');
  $('scaleLbl').style.color = sc.color;

  if (allowed) {
    $('navStatus').textContent = p >= 0.8
      ? 'Ganz nah! Fernglas raus! 👀'
      : 'Der Schlumpf wurde müde — Fernglas raus! 🥱';
    if (!autoToastDone) { autoToastDone = true; toast('📸 Der Schlumpf ist nah — Fernglas auf!', 2200); play('giggle', 0.7); }
  } else if (remaining < 3) {
    $('navStatus').textContent = 'Schau dich um — hier muss es sein!';
  } else if (noCompassMode && head == null && !demoMode) {
    $('navStatus').textContent = 'Lauf einfach los — die Schritte zählen! 👣';
  } else {
    $('navStatus').textContent = head == null && !demoMode ? 'Kompass sucht — einfach laufen!' : 'Folge dem Pfeil!';
  }

  if (!demoMode) {
    const gpsTxt = pos ? `GPS ±${Math.round(pos.acc || 0)} m` : 'GPS sucht …';
    $('gpsNote').textContent = `👣 ${stepsWalked} Schritte · ${gpsTxt}`;
  }

  /* ---------- v5: Sprachführung + Maskottchen ---------- */
  {
    const nowS = Date.now();
    const bucket = G.distBucket(remaining);
    if (lastBucket === null && isFinite(remaining)) {
      speak(G.SPEECH.far(Math.max(5, bucket)));
      $('mascotBubble').textContent = G.SPEECH.far(Math.max(5, bucket));
      lastBucket = bucket; lastSpeakAt = nowS;
    } else if (bucket < lastBucket && (bucket === 15 || bucket === 10 || bucket === 5)) {
      speak(G.SPEECH.near(bucket));
      $('mascotBubble').textContent = G.SPEECH.near(bucket);
      lastBucket = bucket; lastSpeakAt = nowS;
    }
    if (head != null) {
      const cat = G.dirCategory(ang);
      const catLine = G.SPEECH[cat];
      if (cat !== lastDirCat) { speak(catLine); lastDirCat = cat; lastSpeakAt = nowS; }
      else if (nowS - lastSpeakAt > 9000 && !allowed) { speak(catLine); lastSpeakAt = nowS; }
      $('navMascotWrap').className = cat === 'straight' ? '' : cat;
      $('mascotDir').textContent = { straight: '⬆️', left: '👈', right: '👉', back: '🔄' }[cat];
      if (nowS - lastSpeakAt <= 4000) $('mascotBubble').textContent = catLine;
    } else if (!allowed) {
      $('mascotBubble').textContent = 'Lauf los — ich sage dir, wohin!';
      $('mascotDir').textContent = '🧭';
    }
    if (allowed && !unlockSpoken) {
      unlockSpoken = true;
      speak(G.SPEECH.unlock);
      $('mascotBubble').textContent = 'Der Schlumpf ist ganz nah!';
      $('mascotDir').textContent = '🎯';
    }
  }
  $('catchBtn').classList.toggle('ready', allowed);
}

/* Piep-Takt: näher = schneller */
function scheduleTick() {
  clearTimeout(tickTO);
  if (!$('radar').classList.contains('active')) return;
  play('beep', 0.5);
  const r = isFinite(remaining) ? remaining : 50;
  tickTO = setTimeout(scheduleTick, G.tickMs(r));
}

/* Demo: 5 schnelle Tipps auf die Scheibe schalten den Übungsmodus um,
   im Übungsmodus läuft jeder Tipp 5 m in Zielrichtung */
function fakeWalk(m) {
  if (!target) return;
  fakePos = G.destinationPoint(fakePos, hunt.bearing, m);
  updateNav(true);
}
$('disc').addEventListener('pointerdown', () => {
  const now = Date.now();
  if (now - demoTapT > 900) demoTapCount = 0;
  demoTapT = now; demoTapCount++;
  if (demoTapCount >= 5) demoTapCount = 0, demoMode ? null : enterDemo('Übungsmodus an! Tipp den Pfeil zum Laufen.');
});
$('arrow').addEventListener('pointerdown', e => {
  e.stopPropagation();
  if (!demoMode) return;
  fakeWalk(5);
  play('beep', 0.4);
});

function reroll() {
  const cp = currentPos();
  if (!cp) { if (!demoMode) { demoMode = true; demoStart(); } return; }
  newTarget(cp);
  updateNav(true);
  toast('🎲 Neues Ziel versteckt!');
}
function quitHunt() {
  clearTimeout(tickTO);
  clearTimeout(noCompassTO);
  noCompassMode = false;
  clearInterval(navPoll); navPoll = null;
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  show('home'); renderChip();
}
function nextHunt() {
  $('catchModal').classList.remove('open');
  cleanupCatch();
  startHunt();
}

/* ============================================================
   FANG / FERNGLAS
   ============================================================ */
function enterCatch() {
  const elapsed = Date.now() - huntStartAt;
  if (!demoMode && !G.catchAllowed(lastProgress, elapsed)) { toast('❄️ Noch zu weit weg — ein paar Schritte noch!'); return; }
  show('catch');
  $('catch').classList.toggle('demo-cam', demoMode);
  renderChip();
  // Mini-Skala übernehmen
  setMiniThermo(lastProgress);
  $('catchHint').textContent = 'Suche den Schlumpf …';
  if (!demoMode) startCamera(); else $('camError').style.display = 'none';
  // Sprite erscheint nach kurzer Suche
  spriteItem = G.pickItem(Math.random);
  dodgesLeft = spriteItem.dodges;
  spriteRel = null;
  catchClassic = false;
  orientSeen = false;
  spriteSpawnTO = setTimeout(spawnSprite, demoMode ? 600 : 1500 + Math.random() * 2200);
}
function setMiniThermo(p) {
  const sc = G.scaleOf(p);
  $('miniThermoFill').style.height = Math.round(p * 100) + '%';
  $('miniThermoMarker').style.bottom = `calc(${Math.round(p * 100)}% - 8px)`;
  $('miniThermoMarker').textContent = p >= 0.85 ? '🔥' : p >= 0.45 ? '🌤️' : '🧊';
  $('miniScaleLbl').textContent = sc.label.replace(/\s*\S*$/, '');
}

async function startCamera() {
  if (stream) return;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    $('cam').srcObject = stream;
    $('camError').style.display = 'none';
    try {
      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities();
      if (caps.zoom) {
        zoomCaps = caps; zoomVal = caps.zoom.min;
        $('zoomIn').style.display = ''; $('zoomOut').style.display = ''; $('zoomPill').style.display = '';
      }
      if (!caps.torch) $('torchBtn').style.opacity = '.45';
    } catch (e) {}
  } catch (err) {
    $('camErrorText').textContent = 'Kamera nicht verfügbar oder nicht erlaubt. Du kannst stattdessen die Kamera-App öffnen!';
    $('camError').style.display = 'flex';
  }
}
async function toggleTorch() {
  if (!stream) return;
  torchOn = !torchOn;
  try {
    await stream.getVideoTracks()[0].applyConstraints({ advanced: [{ torch: torchOn }] });
    $('torchBtn').classList.toggle('on', torchOn);
  } catch (e) { torchOn = false; }
}
async function zoomBy(d) {
  if (!stream || !zoomCaps || !zoomCaps.zoom) return;
  zoomVal = Math.min(zoomCaps.zoom.max, Math.max(zoomCaps.zoom.min, zoomVal + d));
  try { await stream.getVideoTracks()[0].applyConstraints({ advanced: [{ zoom: zoomVal }] }); } catch (e) {}
  $('zoomPill').textContent = zoomVal.toFixed(1) + '×';
}
function snap() {
  if (!stream) { toast('📸 Nur mit Kamera!'); return; }
  const v = $('cam'), c = document.createElement('canvas');
  c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720;
  c.getContext('2d').drawImage(v, 0, 0);
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png'); a.download = 'schlumpf-foto.png'; a.click();
  toast('📸 Super Aufnahme!');
}
function openNativeCam() { $('nativeCam').click(); }

/* ---------- Sprite (Fang-Objekt, mit Schwenken) ---------- */
let forcedSpriteAngle = null; // Screenshot-/Test-Parameter

function randSpot() {
  return { left: 10 + Math.random() * 52, top: 20 + Math.random() * 38 }; // % der Ansicht
}
function placeClassic() {
  const s = $('sprite');
  const np = randSpot();
  s.style.left = np.left + '%'; s.style.top = np.top + '%';
  s.style.opacity = '1'; s.style.pointerEvents = '';
  $('edgeL').classList.remove('show'); $('edgeR').classList.remove('show');
}
function spawnSprite() {
  if (!$('catch').classList.contains('active')) return;
  const s = $('sprite');
  s.src = spriteItem.img;
  s.style.display = '';
  s.classList.remove('caught');
  play('giggle', 0.8);
  if (heading == null) {
    // kein Kompass/Gyro (noch): klassischer Modus, bei Sensor-Eintreffen Wechsel auf Schwenken
    catchClassic = true;
    placeClassic();
    $('catchHint').textContent = 'Da! Tippe den Schlumpf an! 👆';
  } else {
    spriteRel = forcedSpriteAngle != null ? forcedSpriteAngle : G.randomSpriteAngle(Math.random);
    updateSpriteView();
  }
  hopTimer = setInterval(() => {
    if (catchClassic) { placeClassic(); }
    else if (spriteRel != null) { spriteRel += (Math.random() * 24 - 12); updateSpriteView(); } // Zappeln ±12°
  }, 2300);
}
function updateSpriteView() {
  const s = $('sprite');
  if (catchClassic || spriteRel == null || heading == null) return;
  const v = G.catchView(spriteRel - heading);
  if (v.visible) {
    s.style.left = (50 + v.x * 38) + '%';
    s.style.top = '32%';
    s.style.opacity = '1'; s.style.pointerEvents = '';
    $('edgeL').classList.remove('show'); $('edgeR').classList.remove('show');
    $('catchHint').textContent = 'Da! Tippe den Schlumpf an! 👆';
  } else {
    s.style.opacity = '0'; s.style.pointerEvents = 'none';
    if (v.side === 'left') {
      $('edgeL').classList.add('show'); $('edgeR').classList.remove('show');
      $('catchHint').textContent = 'Schwenk nach links! 👈';
    } else {
      $('edgeR').classList.add('show'); $('edgeL').classList.remove('show');
      $('catchHint').textContent = 'Schwenk nach rechts! 👉';
    }
  }
}
$('sprite').addEventListener('pointerdown', e => {
  e.stopPropagation();
  if (!spriteItem) return;
  if (dodgesLeft > 0) {
    dodgesLeft--;
    play('huch', 0.9);
    if (!catchClassic && heading != null) {
      spriteRel = heading + G.dodgeAngle(Math.random); // springt zur Seite — wieder schwenken!
      updateSpriteView();
    } else {
      placeClassic();
    }
    toast(dodgesLeft > 0 ? '💨 Fast! Der zappelt!' : '💨 Noch einmal!');
  } else {
    doCatch(e.clientX, e.clientY);
  }
});
function doCatch(x, y) {
  clearInterval(hopTimer);
  const s = $('sprite');
  s.classList.add('caught');
  play('fanfare', 1);
  speak(G.SPEECH.caught);
  confetti(x || innerWidth / 2, y || innerHeight / 2);
  const prevRank = G.rankOf(coll[spriteItem.id] || 0).rank;
  coll[spriteItem.id] = (coll[spriteItem.id] || 0) + 1;
  const newRank = G.rankOf(coll[spriteItem.id]).rank;
  saveColl(); renderChip();
  if (newRank > prevRank) setTimeout(() => play('sparkle', 1), 550);
  setTimeout(() => {
    $('cmImg').src = spriteItem.img;
    $('cmName').textContent = spriteItem.name;
    $('cmStars').textContent = '★'.repeat(spriteItem.rarity);
    $('cmFact').textContent = spriteItem.fact + (newRank > prevRank ? ` 🏅 ${G.RANKS[newRank].name}-Rang erreicht!` : '');
    $('catchModal').classList.add('open');
    s.style.display = 'none';
  }, 620);
}
function confetti(x, y) {
  const em = ['✨', '⭐', '🍄', '🌟', '💛'];
  for (let i = 0; i < 22; i++) {
    const c = document.createElement('span');
    c.className = 'conf';
    c.textContent = em[Math.floor(Math.random() * em.length)];
    c.style.left = (x - 40 + Math.random() * 80) + 'px';
    c.style.top = (y - 20 + Math.random() * 40) + 'px';
    c.style.animationDelay = (Math.random() * 0.25) + 's';
    c.style.fontSize = (18 + Math.random() * 18) + 'px';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 1900);
  }
}
function cleanupCatch() {
  clearTimeout(spriteSpawnTO); clearInterval(hopTimer);
  $('sprite').style.display = 'none';
  spriteItem = null;
  spriteRel = null; catchClassic = false; forcedSpriteAngle = null;
  $('edgeL').classList.remove('show'); $('edgeR').classList.remove('show');
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; $('cam').srcObject = null; }
  torchOn = false; $('torchBtn').classList.remove('on');
  zoomCaps = null; $('zoomIn').style.display = 'none'; $('zoomOut').style.display = 'none'; $('zoomPill').style.display = 'none';
}
function leaveCatch() { cleanupCatch(); show('radar'); scheduleTick(); }

/* ============================================================
   SAMMELBUCH
   ============================================================ */
function openBuch() { cameFrom = document.querySelector('.view.active').id; renderBuch(); show('buch'); }
function openBuchFromModal() { $('catchModal').classList.remove('open'); cleanupCatch(); cameFrom = 'home'; renderBuch(); show('buch'); }
function closeBuch() {
  show(cameFrom || 'home');
  if (cameFrom === 'radar') scheduleTick();
}
function renderBuch() {
  const s = collStats();
  $('buchSub').textContent = `${s.species} von ${G.ITEMS.length} Arten gefunden · ${s.total} gefangen`;
  const g = $('buchGrid'); g.innerHTML = '';
  for (const it of G.ITEMS) {
    const n = coll[it.id] || 0;
    const cell = document.createElement('div');
    if (n > 0) {
      const rp = G.rankProgress(n);
      cell.className = `cell r${it.rarity}` + (rp.rank.css ? ' ' + rp.rank.css : '');
      cell.innerHTML = `<img src="${it.img}" alt="${it.name}">
        <div class="nm">${it.name}</div>
        <div class="st">${'★'.repeat(it.rarity)}</div>
        ${n > 1 ? `<span class="cnt">×${n}</span>` : ''}
        <div class="rankbar"><i style="width:${Math.round(rp.progress * 100)}%"></i></div>
        <div class="ranklbl">${rp.next ? `${n}/${rp.nextAt} → ${rp.next.name}` : '🏆 Gold-Rang!'}</div>`;
      cell.onclick = () => {
        $('imImg').src = it.img; $('imName').textContent = it.name;
        $('imStars').textContent = '★'.repeat(it.rarity); $('imFact').textContent = it.fact;
        $('infoModal').classList.add('open');
      };
    } else {
      cell.className = 'cell locked';
      cell.innerHTML = `<div class="q">?</div><div class="nm">???</div><div class="st" style="color:#b9c6d8">${'★'.repeat(it.rarity)}</div>`;
    }
    g.appendChild(cell);
  }
}

/* ============================================================
   FUSSSPUR-KARTE
   ============================================================ */
function openTracks() { show('tracks'); }
function closeTracks() { show('home'); }
function pickTrack(el) {
  document.querySelectorAll('.track').forEach(t => t.classList.remove('glow'));
  el.classList.add('glow');
  $('trackMsg').textContent = el.querySelector('.fact').textContent;
  if (el.querySelector('h3').textContent.includes('Schlumpf')) play('giggle', 0.8);
}

/* ============================================================
   QR-SCAN (gedruckte Pack-Karten)
   ============================================================ */
async function openScan() {
  unlockAudio();
  scanFound = false;
  show('scan');
  if (demoMode) return; // Demo/Screenshot: nur Rahmen zeigen
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    $('scanCam').srcObject = scanStream;
    $('scanError').style.display = 'none';
    scanCanvas = document.createElement('canvas');
    scanLoop();
  } catch (e) {
    $('scanError').style.display = 'flex';
  }
}
function scanLoop() {
  if (!$('scan').classList.contains('active')) return;
  const v = $('scanCam');
  if (v.readyState >= 2 && v.videoWidth > 0 && !scanFound) {
    const w = Math.min(v.videoWidth, 720);
    const h = Math.round(w * v.videoHeight / v.videoWidth);
    scanCanvas.width = w; scanCanvas.height = h;
    const ctx = scanCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(v, 0, 0, w, h);
    try {
      const img = ctx.getImageData(0, 0, w, h);
      const code = window.jsQR ? jsQR(img.data, w, h, { inversionAttempts: 'attemptBoth' }) : null;
      if (code && code.data) onQr(code.data);
    } catch (e) {}
  }
  scanRAF = requestAnimationFrame(scanLoop);
}
function onQr(text) {
  const id = G.parseQrToken(text);
  if (!id) {
    const now = Date.now();
    if (now - lastQrToast > 3000) { lastQrToast = now; toast('🤔 Das ist kein Schlumpf-Code'); }
    return;
  }
  scanFound = true;
  const it = G.itemById(id);
  play('sparkle', 1);
  const prevRank = G.rankOf(coll[id] || 0).rank;
  coll[id] = (coll[id] || 0) + 1;
  const newRank = G.rankOf(coll[id]).rank;
  saveColl(); renderChip();
  confetti(innerWidth / 2, innerHeight * 0.44);
  setTimeout(() => {
    $('cmImg').src = it.img;
    $('cmName').textContent = it.name;
    $('cmStars').textContent = '★'.repeat(it.rarity);
    $('cmFact').textContent = 'Per Geheim-Scan gefunden! ' + it.fact + (newRank > prevRank ? ` 🏅 ${G.RANKS[newRank].name}-Rang erreicht!` : '');
    leaveScan(true);
    $('catchModal').classList.add('open');
  }, 700);
}
function leaveScan(silent) {
  cancelAnimationFrame(scanRAF); scanRAF = null;
  if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; $('scanCam').srcObject = null; }
  if (!silent) show('home');
}

/* ============================================================
   ELTERN-MODUS (Verstecken mit eigener Distanz/Richtung)
   ============================================================ */
function pickDir(deg, el) {
  elternDeg = deg;
  document.querySelectorAll('#dirGrid button').forEach(b => b.classList.toggle('sel', b === el));
}
function startCustomHunt() {
  beginHunt();
  const distM = parseFloat($('elternDist').value);
  const apply = start => {
    hunt = { bearing: elternDeg, distance: distM };
    target = G.destinationPoint(start, hunt.bearing, hunt.distance);
    startPos = { lat: start.lat, lon: start.lon };
    remaining = hunt.distance; lastProgress = 0;
    updateNav(true);
  };
  if (demoMode) { fakePos = fakePos || { lat: 52.52, lon: 13.405 }; apply(fakePos); $('gpsNote').textContent = 'Übungsmodus — tipp den Pfeil zum Laufen'; }
  else if (pos) apply(pos);
  else {
    customPending = apply;
    if (!navigator.geolocation) {
      demoMode = true; customPending = null;
      fakePos = fakePos || { lat: 52.52, lon: 13.405 };
      apply(fakePos);
      $('gpsNote').textContent = 'Übungsmodus — tipp den Pfeil zum Laufen';
    }
  }
  if (!demoMode) { ensureGps(); startOrientation(); }
  scheduleTick();
}
(function init() {
  loadColl(); loadAvatar(); loadIsland(); renderChip(); renderMascots();
  diff = localStorage.getItem('schlumpfDiff') || G.DEFAULT_DIFF;
  renderDiff();
  $('voiceBtn').textContent = voiceOn ? '🔊' : '🔇';
  $('apiBaseInput').value = localStorage.getItem('schlumpfApi') || '';
  document.querySelector('#dirGrid button').classList.add('sel');

  // PWA: Service Worker (nicht bei file://)
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Eltern-Ecke: lange auf die Fußzeile drücken
  let footT = null;
  $('homeFoot').addEventListener('pointerdown', () => { footT = setTimeout(() => show('eltern'), 800); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => $('homeFoot').addEventListener(ev, () => clearTimeout(footT)));

  const q = new URLSearchParams(location.search);
  if (q.get('demo') === '1') demoMode = true;
  const scr = q.get('screen');
  if (scr === 'radar') {
    demoMode = true; show('radar'); demoStart();
    const w = parseFloat(q.get('walk') || '0');
    if (w > 0) fakeWalk(w);
    const st = parseInt(q.get('steps') || '0', 10);
    if (st > 0) { stepsWalked = st; updateNav(true); }
  } else if (scr === 'catch') {
    demoMode = true; demoStart();
    fakePos = G.destinationPoint(target, (hunt.bearing + 180) % 360, 3);
    remaining = 3;
    const sa = q.get('spriteang');
    if (sa != null) { forcedSpriteAngle = parseFloat(sa); heading = 0; } // Schwenk-Screenshot
    enterCatch();
  } else if (scr === 'buch') {
    if (Object.keys(coll).length === 0) coll = { pilze: 2, geraet: 1, schlumpfhaus: 1, kuchen: 4, goldnuss: 6, schlumpf: 10 };
    renderBuch(); show('buch');
  } else if (scr === 'tracks') {
    show('tracks');
  } else if (scr === 'scan') {
    demoMode = true; openScan();
  } else if (scr === 'eltern') {
    show('eltern');
  } else if (scr === 'konto') {
    openKonto();
  } else if (scr === 'avatar') {
    openAvatar();
  } else if (scr === 'insel') {
    openInsel();
  } else if (scr === 'start') {
    show('start');
  } else if (scr === 'home') {
    show('home');
  } else if (!localStorage.getItem('schlumpfOnboarded')) {
    show('start');
  } else {
    show('home');
  }
  if (q.get('debug') === '1') {
    setTimeout(() => {
      const out = {};
      for (const id of ['navMascotWrap', 'navMascot', 'disc', 'radar', 'homeAvatar']) {
        const el = $(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        out[id] = {
          rect: [Math.round(r.width), Math.round(r.height)],
          w: cs.width, h: cs.height, ar: cs.aspectRatio, mq: matchMedia('(orientation:landscape)').matches,
        };
      }
      const div = document.createElement('div');
      div.id = 'debugOut';
      div.textContent = JSON.stringify(out);
      document.body.appendChild(div);
    }, 800);
  }
})();
