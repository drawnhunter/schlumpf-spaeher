# Akzeptanzkriterien v4 — „Fang-Schwenken, Ränge, QR-Editionen, Schwierigkeit"

Anlass: Nutzerwünsche nach erfolgreichem Feldtest.

## Funktional
- F19: Mini-Fang mit Schwenken: Sprite hängt an Blickrichtung (Kompass), Sichtfenster
  60°, sonst Randpfeil links/rechts (`catchView`). Ausweichen = Sprung zur anderen
  Seite. Fallback ohne Gyro: klassischer Tap-Modus.
- F20: Rahmen-Ränge pro Art: 3× Bronze, 6× Silber, 10× Gold (`rankOf`, `rankProgress`);
  Rang-Aufstieg mit Sound + Text in der Fang-Karte.
- F21: Schwierigkeitsstufen Kurz 8–15 m / Mittel 15–30 m / Expedition 35–60 m,
  persistent, auf dem Startscreen wählbar.
- F22: QR-System: Token-Format `SPAHER:ITEM:<id>`, 4 qrOnly-Editionen (Ostern/Halloween),
  Scan-Modus mit jsQR (lokal, offline), Druck-Packs als A4-PDF/PNG.
- F23: Eltern-Ecke (Langdruck auf Fußzeile): Distanz 5–100 m + Himmelsrichtung frei
  wählbar, startet Custom-Hunt; wartet bei Bedarf auf ersten GPS-Fix.
- F24: Neue Sounds: huch (Ausweichen), sparkle (QR/Rang).

## Technisch
- T1''': `node verifier/v4/test_game_v4.mjs` Exit 0.
- T2''': QR-E2E: `chromium --dump-dom verifier/v4/qr_e2e.html` liefert
  `DECODED:SPAHER:ITEM:pilze`.
- T3''': v3/v2/v1-Suiten (außer dokumentierter v1-Ausnahme) grün.
- T4''': Screenshots: home (Diff-Chips + Scan-Karte), catch mit spriteang=80 (Randpfeil),
  buch (Bronze/Silber/Gold-Rahmen + Fortschrittsbalken), eltern, scan.
