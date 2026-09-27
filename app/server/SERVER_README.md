# Schlumpf-Späher — Server (Konten & Cloud-Sync)

Backend für die App: Konten (Name + 4-stellige PIN) und Fortschritts-Speicherung
(Sammlung, Schwierigkeit). Die App läuft offline-first: Ohne Server oder ohne Konto
bleibt alles lokal im Browser (localStorage) — der Sync ist reines Add-on.

## Stack
- Node.js ≥ 20, Express 4, better-sqlite3 (SQLite-Datei, WAL). Keine weiteren Dienste nötig.

## Start (Entwicklung)
```bash
cd server
npm install
PORT=4178 npm start
# App + API laufen dann gemeinsam auf http://localhost:4178
```

Der statische Server liefert die App aus dem Projekt-Root aus — ein Prozess für alles.

## Deployment auf PraxiOS (Ubuntu + Docker + Caddy)
Vorschlag (an eure Container-Konventionen anpassbar):

```dockerfile
FROM node:22-alpine
WORKDIR /srv
COPY package.json ./
RUN npm install --omit=dev
COPY . .
ENV PORT=4178 DB_PATH=/data/spaeher.db
VOLUME /data
EXPOSE 4178
CMD ["node", "server.js"]
```

- Container-Port 4178, in Caddy als eigener (Sub-)Pfad oder Subdomain, z. B.
  `schlumpf.pragma.example` → `localhost:4178` (Reverse-Proxy wie bei den anderen Projekten).
- Die SQLite-Datei liegt unter `/data/spaeher.db` (Volume mounten, wird in eure
  Backup-Routine `~/backups` aufgenommen).
- App und API **unter derselben Adresse** ausliefern → im Client keinerlei Konfiguration
  nötig. Nur wenn App und Server getrennt laufen, in der Eltern-Ecke die Server-Adresse
  eintragen (wird im Browser gespeichert).

## API
| Methode | Pfad | Body/Auth | Antwort |
|---|---|---|---|
| GET | `/api/health` | – | `{ ok, ts }` |
| POST | `/api/register` | `{ name, pin, email? }` | `{ token, name }` · 400 Validierung · 409 Name vergeben |
| POST | `/api/login` | `{ name, pin }` | `{ token, name, email }` · 401 falsch |
| GET | `/api/state` | Bearer | `{ state: null \| {...}, updatedAt? }` |
| PUT | `/api/state` | Bearer, `{ state }` | `{ ok }` |
| POST | `/api/logout` | Bearer | `{ ok }` |

`state` ist ein freies JSON-Objekt (aktuell `{ collection: {itemId: anzahl}, diff, avatar, island }`).
`email` ist bei der Registrierung optional (für späteren PIN-Reset durch Eltern/Admin).
PINs werden gesalzen gehasht (SHA-256), Tokens sind opake 48-stellige Hex-Strings.
Rate-Limits/HTTPS-Terminierung übernimmt Caddy.

## Datenschutz
Keine E-Mail, keine Tracker, keine Cookies — nur Name + PIN-Hash + Sammlungsstand.
Kinder-Konto bewusst minimal gehalten.
