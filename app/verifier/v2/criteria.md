# Akzeptanzkriterien v2 — „Kindgerechte Navigation" (ersetzt v1-F1/F2/F4)

Anlass: Nutzerfeedback — im Suchmodus passierte beim Gehen nichts (GPS zu streng,
Distanzen zu lang für 4–8-Jährige, keine Gnadenregel).

## Geändert gegenüber v1
- F1': Distanz nun **10–25 m** (war 20–50 m). `newHunt()`-Defaults geändert → v1-Test
  `newHunt rng=0 -> untere Grenze (>=20)` gilt ab v2 als überholt (siehe v2-Test).
- F2': Fortschritt = **Credit-Modell** statt reiner Restdistanz: Bewegung in Zielrichtung
  zählt voll, andere Bewegung zu 35 %. Funktion `huntProgress(start, cur, hunt)`.
- F4': Fang-Freigabe über `catchAllowed(progress, elapsed)`: **Fortschritt ≥ 80 % ODER
  40 s Gnadenregel** (ersetzt festen 10-m-Radius).

## Funktional
- F10: GPS-Robustheit: Watcher ohne distanceFilter + 2,5-s-Polling + Positions-Glättung
  (50 %) + Verwerfen grob ungenauer Fixes (> 40 m, wenn schon besserer Fix vorliegt).
- F11: GPS-Notiz zeigt Genauigkeit und Alter des letzten Fixes („±X m · vor Y s").
- F12: Bei Freigabe erscheint automatisch ein Toast + Sound (Eltern müssen nicht lesen).
- F13: Übungsmodus bleibt (5× auf Scheibe; Pfeil-Tipp = 5 m in Zielrichtung);
  Screenshot-Parameter `?demo=1&screen=radar&walk=N` simuliert N gelaufene Meter.

## Technisch
- T1': `node verifier/v2/test_game_v2.mjs` Exit 0 (Credit-Modell, Gnadenregel, Defaults).
- T2': v1-Testsuite weiterhin grün, **außer** den als überholt markierten newHunt-Grenzen
  (dokumentierte Kriterienänderung).
- T3': `node verifier/v1/check_assets.mjs` Exit 0 (Marker inkl. demoMode unverändert).
- T4': Screenshots mit walk=14 und walk=22 zeigen: Punkte teilweise/alle grün,
  Skala Warm/Heiß, Fang-Button bei walk=22 freigeschaltet.
