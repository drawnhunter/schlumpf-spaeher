# Akzeptanzkriterien v3 — „Schrittzähler statt reines GPS"

Anlass: Nutzerfeedback — Meter-Anzeige und Skala reagierten beim Gehen nicht
(GPS-Ungenauigkeit ±10–20 m schluckt 10–25-m-Distanzen). Gnadenregel (40 s) wurde
als funktionierend bestätigt.

## Änderungen gegenüber v2
- F14: **Schrittzähler** via Beschleunigungssensor (devicemotion, Peak-Detektion auf
  gravitationsbereinigter Magnitude). Kinderschritt = 0,55 m (`CHILD_STEP_M`).
- F15: Fortschritt = **max(GPS-Credit, Schritt-Fortschritt)** (`combinedProgress`) —
  GPS bleibt Bonus, Schritte sind der verlässliche Hauptkanal.
- F16: Kompass-Fallback: ohne Kompassdaten nach 5 s rotiert der Pfeil als „Scan"
  (CSS), Statustext „Lauf einfach los — die Schritte zählen!". Richtung ist dann
  frei wählbar.
- F17: Statuszeile zeigt live Schritte + GPS-Genauigkeit („👣 n Schritte · GPS ±X m").
- F18: Screenshot-Parameter `steps=N` simuliert N Schritte.
- Unverändert: Gnadenregel 40 s, Freigabe bei ≥ 80 %, Übungsmodus (Pfeil-Tipps).

## Technisch
- T1'': `node verifier/v3/test_game_v3.mjs` Exit 0 — Detektor mit synthetischem
  2-Hz-Gehsignal (8–12 Schritte in 5 s), Ruhe = 0 Schritte, Refraktärzeit blockiert
  Doppelzählung, `stepProgress`/`combinedProgress` korrekt.
- T2'': v2- und v1-Suiten (außer dokumentierter v1-Ausnahme) weiterhin grün.
- T3'': `check_assets.mjs` grün.
- T4'': Screenshot `?demo=1&screen=radar&steps=20` zeigt sichtbaren Fortschritt
  (Punkte teilweise grün, Skala über Eiskalt).
