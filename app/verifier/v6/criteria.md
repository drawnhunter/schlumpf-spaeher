# Akzeptanzkriterien v6 — „PWA, Querformat, Onboarding, Avatar, Insel, mehr Funde"

Anlass: Nutzerwünsche nach Feldtest v3/v4-Stand.

## Funktional
- F29: **PWA**: manifest.webmanifest (landscape, standalone), Icons (192/512/maskable),
  Service Worker (Precache Kern + Runtime-Cache; /api immer Netz). Installierbar auf
  Android („App installieren") und iOS (Startbildschirm).
- F30: **Querformat-Redesign**: alle Views querformat-tauglich (Grid/Flex-Umbruch per
  Media Query), beide Drehrichtungen. Home-Inhalt scrollt, wenn er höher als der
  Viewport ist (Bugfix: Geheim-Scan-Karte war abgeschnitten).
- F31: **Onboarding**: erster Start zeigt „Als Gast spielen" ODER Login/Register mit
  optionalem E-Mail-Feld; Entscheidung wird gespeichert (schlumpfOnboarded).
- F32: **E-Mail optional** bei Registrierung (Backend: Validierung, Spalte email,
  Login liefert sie zurück). Klient validiert Format clientseitig.
- F33: **Avatar-Baukasten**: 6 Slots (hut/kopf/ober/unter/hand/ruecken), 3–4 Teile je
  Slot, gestapelte Darstellung (Rücken hinter Basis), Editor mit Slot-Tabs + Zufall,
  Avatar = Home- und Radar-Maskottchen, persistent + Cloud-Sync.
- F34: **Schlumpfinsel**: 6×4-Felder auf generiertem Insel-Hintergrund, Platzieren
  nur mit besessenen Items, Entfernen per Modal, Bewohner = gefangene Schlümpfe
  (Waldschlumpf + Editions-Schlümpfe, max. 5), wandern per Intervall. Sync im state.
- F35: **Mehr Funde**: 6 neue Radar-Items (amulett, gluehwurm, tautropfen, beeren,
  moos, kastanie) → 20 Sammelobjekte insgesamt; QR-Erweiterungs-Pack (A4) für die 6.
- F36: **Schwierigkeit als Dropdown** (ersetzt die drei Chips aus v4).
- F37: **Schrift Baloo 2 (OFL)**, lokal gebündelt, offline.

## Technisch
- T1''''': `node verifier/v6/test_game_v6.mjs` Exit 0 (Avatar-Katalog, Insel-Logik,
  20 Items, Regressionen).
- T2''''': `node verifier/v6/check_v6_assets.mjs` Exit 0 (Font, Icons, Manifest, SW,
  av/* 21 Dateien, neue Item-Bilder, insel_bg.jpg).
- T3''''': Backend-Integration (v5-Test, mit E-Mail-Fällen) Exit 0.
- T4''''': v5/v4/v3/v1-Suiten (außer dokumentierter v1-Ausnahme) grün.
- T5''''': Screenshots **quer** (880×412): start, home, radar, avatar, insel, buch.
