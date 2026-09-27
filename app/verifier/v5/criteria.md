# Akzeptanzkriterien v5 — „Sprachführung + Cloud-Konten"

Anlass: Nutzerwünsche — sprechender Schlumpf-Guide im Radar; Server-Backend auf
PraxiOS mit Konten, damit Fortschritt geräteübergreifend gespeichert wird.

## Funktional
- F25: Sprachführung (Web Speech API, de-DE, hohe Stimme): Signal-Ansage mit
  Startdistanz, Richtungskommandos bei Kategoriewechsel (`dirCategory`:
  straight ±25°, back ≥115°, sonst links/rechts), Wiederholung alle 9 s,
  Meter-Ansagen im 5-m-Raster bei 15/10/5 m, Freigabe-Ansage, Fang-Ansage.
- F26: Maskottchen über dem Radar: zeigt per Neigung/Flip die Richtung,
  Sprechblase spiegelt die aktuelle Ansage (funktioniert auch stumm).
  Stimme umschaltbar (🔊/🔇, persistent).
- F27: Backend: Node/Express/SQLite mit Register/Login/State-API (Token-Auth,
  PIN gesalzen gehasht). Statische Auslieferung der App aus demselben Prozess.
- F28: Client-Sync offline-first: ohne Konto/Server rein lokal; mit Konto
  Debounce-Push bei Änderungen, Pull+Merge (max je Art) beim Login
  (`mergeCollections`), Server-URL in der Eltern-Ecke konfigurierbar.

## Technisch
- T1'''': `node verifier/v5/test_game_v5.mjs` Exit 0 (dirCategory-Grenzen,
  distBucket, mergeCollections, SPEECH-Texte vollständig).
- T2'''': `node verifier/v5/test_backend.mjs` Exit 0 — Integration gegen echten
  Serverprozess (ephemerer Port, temp-DB): Register/Duplikat/Login/State-Roundtrip/
  Auth-Fehler/Logout.
- T3'''': v4/v3/v2/v1-Suiten (außer dokumentierter v1-Ausnahme) grün.
- T4'''': Screenshots: Radar mit Maskottchen+Blase, Konto-View.
