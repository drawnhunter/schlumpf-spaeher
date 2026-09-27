# Verifier — Schlumpf-Späher App

Append-only Index der Prüfkriterien-Versionen. Jeder Lauf wird unter `runs/` protokolliert.

## v1 (2026-09-27, ~23:30)
- Datei: `v1/criteria.md`, Testskripte: `v1/test_game.mjs`, `v1/check_assets.mjs`
- Misst: (1) Korrektheit der reinen Spiellogik (Navigation: Haversine, Peilung, Zielpunkt, Kompass-Umrechnung, Fortschritt, Kalt-Warm-Skala, Tick-Intervall, gewichtete Sammel-Auswahl; Punkte rot→grün-Mapping), (2) Vollständigkeit aller referenzierten Assets, (3) Syntax-Check der JS-Dateien, (4) Vorhandensein der Kern-Features im DOM/JS (Marker-Strings), (5) visuelle Kontrolle der vier Ansichten via Headless-Screenshot (manuell bewertet, nicht automatisiert).
- Erste Version der Kriterien für App-Release v2.

## v2 (2026-09-27, ~23:55)
- Datei: `v2/criteria.md`, Testskript: `v2/test_game_v2.mjs`
- Anlass: Nutzerfeedback „im Suchmodus passiert nichts" — GPS zu streng für Kinder.
- Ändert v1: Distanz 20–50 m → **10–25 m**; Restdistanz-Modell → **Credit-Modell** (Zielrichtung voll, sonst 35 %); Fang-Radius 10 m → **Fortschritt ≥ 80 % oder 40-s-Gnadenregel**; neu: GPS-Polling/Glättung/Notiz mit Fix-Alter, Auto-Toast bei Freigabe, Screenshot-Parameter `walk=N`.
- Der v1-Test `newHunt rng=0 -> untere Grenze` gilt ab v2 als überholt (Kriterienänderung, dokumentiert). Alle anderen v1-Tests müssen weiterhin grün bleiben.

## v3 (2026-09-28, ~00:15)
- Datei: `v3/criteria.md`, Testskript: `v3/test_game_v3.mjs`
- Anlass: Nutzerfeedback — GPS-Fortschritt reagierte auf dem Gerät nicht sichtbar
  (GPS-Genauigkeit in der Größenordnung der Jagddistanz).
- Neu: **Schrittzähler via Beschleunigungssensor** als Haupt-Fortschrittskanal
  (Peak-Detektion, 0,55 m/Schritt), Fortschritt = max(GPS-Credit, Schritte),
  Kompass-Fallback mit scannendem Pfeil, Live-Schrittanzeige, Screenshot-Parameter
  `steps=N`. Gnadenregel (40 s) und 80-%-Freigabe unverändert.
- Ergänzt v2, ersetzt keine Kriterien.

## v4 (2026-09-28, ~01:05)
- Datei: `v4/criteria.md`, Tests: `v4/test_game_v4.mjs`, QR-E2E `v4/qr_e2e.html` (+ eingebettetes Testbild `qr_pilze.png`)
- Neu: Mini-Fang mit Schwenken (Sichtfenster 60°, Randpfeile, Ausweichsprünge, klassischer
  Fallback ohne Gyro), Rahmen-Ränge (3/6/10 → Bronze/Silber/Gold + Fortschrittsbalken),
  Schwierigkeitsstufen (8–15/15–30/35–60 m, persistent), QR-Editionen (4 qrOnly-Items,
  Token `SPAHER:ITEM:<id>`, jsQR lokal), Eltern-Ecke (eigene Distanz/Richtung),
  Sounds huch/sparkle. Druck-Packs als A4-PDF/PNG im Output-Ordner.
- Ergänzt v3, ersetzt keine Kriterien.

## v5 (2026-09-28, ~01:30)
- Datei: `v5/criteria.md`, Tests: `v5/test_game_v5.mjs`, `v5/test_backend.mjs`
- Neu: Sprachführung (Web Speech API, Richtungs-Kategorien, 5-m-Raster-Ansagen,
  Wiederholung nach 9 s, 🔊/🔇 persistent), Maskottchen mit Sprechblase + Richtungs-Pose,
  Backend `server/` (Express + SQLite, Token-Auth, State-Sync, statische App-Auslieferung),
  Client-Sync offline-first mit Merge (max je Art), Konto-View, Server-URL in Eltern-Ecke.
- Hinweis Backend-Test: Deps lokal in `/tmp/srv` installiert (Sandbox-Mount ohne Symlinks),
  Aufruf mit `NODE_PATH=/tmp/srv/node_modules`. Auf echter Hardware reicht `npm install`.
- Ergänzt v4, ersetzt keine Kriterien.
