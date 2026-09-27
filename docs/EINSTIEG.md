# Einstieg für neue Chats — lies mich zuerst

> Hallo, neuer Chat! Du bist im Projekt **Schlumpf-Späher**, dem ersten Spiel der **Gamebox** (Gamestudio unter dem zukünftigen Dach **Skogen** 🌲). Diese Datei gibt dir den vollen Kontext, den du brauchst.

## Die Idee in einem Satz
GPS-Schnitzeljagd-App für kleine Kinder (ab ~4): Schlümpfe im Wald verstecken (Eltern drucken QR-Codes aus), Kinder scannen mit dem Handy — Radar, Kompass, Schrittzähler und Fanfare inklusive.

## Entstehungsgeschichte (wichtig für die Stimmung)
- 26.09.2026: Alexander war mit Freundin und dem 4-jährigen Sohn im Potsdamer Wald und versteckte 3D-gedruckte Schlümpfe zur Motivation.
- Daraus entstand die Idee, daraus baute ein Kimi-Agent in einem Vormittag die App (Versionen v1–v5, siehe `app/verifier/`).
- Die Gamebox als Studio-Marke und „SkoGen One" (Kids/Mini/Pro — das Gen = Konsolen-Generation-Wortspiel) wurden am selben Abend geboren.

## Tech-Stack
- **Frontend:** Reine Statik — `index.html`, `app.js` (UI/Elternbereich), `game.js` (Spiel-Engine), `jsQR.js` (lokal, kein CDN). Offline-first, Zustand in localStorage, Sounds im App-Root (`*.mp3`), Grafiken in `assets/` (Avatar-Teile in `assets/av/`).
- **PWA (seit v6):** `manifest.webmanifest` (landscape, standalone), `sw.js` (Precache Kern + Runtime-Cache, `/api` immer ans Netz), Icons in `assets/icons/`. Schrift: Baloo 2 (OFL) lokal in `assets/fonts/`.
- **v6-Features:** Onboarding (Gast/Konto, optionale E-Mail), Avatar-Baukasten (6 Slots, kalibrierte Anker in `app.js` AVATAR_ANCHORS), Schlumpfinsel (6×4 Felder, Bewohner wandern), 20 Sammelobjekte (6 neue Radar-Funde + 4 QR-Editionen), Schwierigkeit als Dropdown, Querformat-Redesign.
- **Backend:** Node/Express + better-sqlite3 in `app/server/` (API unter `/api/*`: register/login/state/logout, Token-Auth). Dient dem Cloud-Sync der Sammlung.
- **Verifikation:** `app/verifier/` enthält Kriterien-Cataloge und Testskripte (node) je Version — dort nach Änderungen immer gegenprüfen.

## Lokal starten
```bash
cd app/server && npm install
cd .. && node server/server.js   # oder: PORT=4178 node server/server.js
# App: http://localhost:4178
```
Test-Login: beliebiger Name + 4-stelliger PIN. In der Deploy-DB liegt ein Testaccount `axontest` (PIN 1234) — kann gelöscht werden.

## Produktiv-Deployment (läuft seit 27.09.2026)
- **Server:** `hazehunter@192.168.178.62` (PraxiOS-Server, Potsdam), Verzeichnis `/home/hazehunter/gamebox/schlumpf-spaeher/`
- **Container:** Docker, `docker-compose up -d`, Image `schlumpf-spaeher:1.0.0` (node:22-slim), Port **4178**, DB im Volume `./data` (SQLite `spaeher.db`)
- **Reverse Proxy:** Caddy (`/home/hazehunter/matrix/Caddyfile`), Host: `schlumpf-spaeher.the-swed.v6.rocks` → `192.168.178.62:4178`
- **Landingpage:** `the-swed.v6.rocks` (statisch unter `/home/hazehunter/matrix/sites/swed/`) mit Links zu allen Druckvorlagen
- **Druckvorlagen:** liegen im Repo unter `druckvorlagen/` und auf der Landingpage unter `/packs/`
- SSH-Key für Axon: `C:\Users\User\.ssh\axon_fedi_ed25519` (User hazehunter)

## DNS/Infrastruktur-Kontext (Stand 27.09.)
- Primär aktuell: **dynv6** (Zonen: praxios.dynv6.net, the-swed.v6.rocks, drvetter.v6.army, …) — Achtung: deren NS **ns1.dynv6.com hinkt zeitweise hinterher** (Flip-Flop), Let's-Encrypt-Validierung kann dadurch flaky sein. Server-Cron (5 Jobs, */5min) aktualisiert die IPs via `ipv4.icanhazip.com`.
- **deSEC** ist als neuer DNS-Provider vorgesehen: Account existiert, API-Token `desec_api` liegt im Windows Credential Manager. `dedyn.io`-Subdomains sind derzeit suspendiert → wir brauchen eine **eigene Domain** (Wunschname: `skogen.eu`, war leider vergeben — Alternativen in Arbeit). Ablauf: Domain kaufen → NS auf ns1.desec.io + ns2.desec.org → Axon migriert.
- dynv6 bleibt parallel als Fallback bestehen.
- Support/Bug-Tracking: **SupportHub** (https://support.praxios.dynv6.net, Repo `drawnhunter/praxios-supporthub`), API-Token `supporthub_api` im Credential Manager, Label-Vorschlag für dieses Projekt: `inbox-gamebox`.

## Wichtige Personen & Rollen
- **Alexander** (drawnhunter / „the swed"): Eigentümer, Product-Owner, Vibe-Coder mit Kimi K3. Entscheidet über Features, gibt Freigaben.
- **Axon** (KI-Assistent auf seinem Desktop): Deployment, Infrastruktur, Monitoring (stündlicher Praxis-DNS/HTTP-Monitor), Mail-Themen. Spricht Alexander mit „du" an, Antworten auf Deutsch.
- **„die Chats"** (weitere Kimi-Chat-Sessions + Dev-Gruppe): bauen Features nach Tickets im SupportHub (Bus).

## Zugänge (für Kimi-Chats auf diesem Rechner)
- **GitHub:** `gh` CLI ist authentifiziert (Account `drawnhunter`) — einfach `gh`-Befehle nutzen, kein Token nötig. Repo: https://github.com/drawnhunter/schlumpf-spaeher
- **SupportHub-Token:** liegt im Windows Credential Manager (`supporthub_api`). Auslesen per PowerShell (CredRead-P/Invoke, siehe `scripts/mail-sort.ps1` im OpenClaw-Workspace) — Token niemals in Chat/Files ausgeben, sondern direkt in Header/Body einsetzen. SupportHub-Relay: `POST https://support.praxios.dynv6.net/api/hub/agent/bus/issue` (JSON: token, titel, text, labels[]).

## Regeln & Konventionen
- Hauseigene Apps **nie** über den Browser bedienen — nur Agent-APIs/CLI.
- Fehlt ein API-Endpunkt → Bus-Ticket (Label `inbox-rewawi`/`inbox-pawawi`/…), nicht selbst Hacks bauen.
- Secrets nie in Code/Chat/Files — Windows Credential Manager (`rewawi_api`, `pawawi_vetter_api`, `supporthub_api`, `dynv6_api`, `desec_api`).
- Änderungen am Spielverhalten: immer im `app/verifier/`-Kriterienkatalog spiegeln (aktuelle Version: v6).
- Verifier lokal: `node app/verifier/v6/test_game_v6.mjs` u.ä.; Backend-Test braucht installierte Deps in `app/server` (npm install).
- Zielgruppe bedenken: UI für 4-Jährige (große Buttons, wenig Text) + Elternbereich (QR-Druck, Kind-Profile).

## Roadmap-Ideen (unsortiert, von Alexander/SkoGen-Abend)
- SkoGen One (Kids/Mini/Pro) als Geräte-/Modus-Konzept in der Gamebox
- Mehr Figuren/Sets (Ostern-, Halloween- und Erweiterungs-Pack existieren als Druckvorlagen; v6 brachte 6 neue Radar-Funde)
- v6 nachgewiesen (28.09.): Avatar-Baukasten, Schlumpfinsel, PWA-Installierbarkeit, Querformat, E-Mail optional bei Konto
- Mehrsprachigkeit, Fortschritts-Sticker, Foto-Beweis beim Fund
- Portal-Seite auf der Gamebox-Landingpage pro Kind/Gruppe

## Repo-Labels
bug 🐛 · idee 💡 · feature ✨ · qr-druck 🖨 · spiel-logik 🎮 · deployment 🚀 · feedback-kids 🧒 · skogen-one 🌲 · prio-hoch 🔴 · wartet-auf-alex ⏳
