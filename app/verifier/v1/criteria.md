# Akzeptanzkriterien v1 — App-Release v2

## Funktional
- F1: Ziel wird zufällig festgelegt (Peilung 0–360°, Distanz 20–50 m) — Funktion `newHunt` im Code vorhanden, deterministisch testbar mit injiziertem RNG.
- F2: Navigation: Pfeil zeigt Richtung zum Ziel (Bearing minus Heading), Fortschritts-Punkte (6) wechseln von rot zu grün mit wachsendem Fortschritt (`dotsOf`).
- F3: Kalt-Warm-Skala: `scaleOf` bildet Fortschritt 0→1 auf Stufen Eiskalt…GLÜHEND mit Farben ab.
- F4: Bei Restdistanz ≤ Fang-Radius wird der Fernglas/Kamera-Button freigeschaltet (`catchReady`).
- F5: Fernglas-Overlay ist deutlich heller als v1 (Sichtfeld): Shadow-Opacity ≤ 0.55, Linsen größer (≥ 44vw).
- F6: Fang: Sprite erscheint nach kurzer Verzögerung, Ausweichen je nach Seltenheit (0/1/2 Mal), Fang fügt Item dem Sammelbuch hinzu (localStorage).
- F7: Sammelbuch: 10 Sammelobjekte definiert (id, name, img, rarity 1–3), gewichtete Auswahl (`pickItem`) — häufig 60 %, selten 28 %, legendär 12 % (± Toleranz, Monte-Carlo-Test).
- F8: Übungsmodus ohne GPS (Tippen auf Pfeil simuliert Schritte), damit drinnen testbar.
- F9: Fußspur-Karte aus v1 bleibt erhalten.

## Technisch
- T1: `node verifier/v1/test_game.mjs` läuft fehlerfrei (Exit 0).
- T2: `node verifier/v1/check_assets.mjs` — alle in HTML/JS referenzierten Assets existieren (Exit 0).
- T3: `node --check` auf app.js und game.js ohne Fehler.
- T4: Headless-Screenshots der Ansichten home/radar/catch/buch sind nicht leer und enthalten erwartete Elemente (manuelle Sichtprüfung der PNGs).
- T5: Keine externen CDN-Abhängigkeiten (offline-fähig).
