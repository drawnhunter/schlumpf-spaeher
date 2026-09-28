# Akzeptanzkriterien v7 — „Wichtel-Wacht, Wizard, Standalone, Design-Pass, Erzähler"

Anlass: Nutzerfeedback nach Feldtest v6 + drei Recherche-Berichte (Charakter-System,
Kids-UI-Analyse, Figuren-Sortiment + Rechtslage).

## Funktional
- F38: **Wichtel-Wacht**: 14 eigene sammelbare Waldgnome (6 häufig, 5 selten, 3 legendär),
  alle mit `gnome: true`-Flag, distinct von Peyo-Schlümpfen (keine Zipfelmütze, keine
  weiße Einheitskleidung, vielfältige Hautfarben). Items gesamt: **34** (überholt v6: 20).
- F39: **Insel-Bewohner** zählen alle Gnome (`islandInhabitants` summiert gnome-Flag,
  weiterhin max. 5). Überholt v6-F34 (nur schlumpf/oster/halloween).
- F40: **Wizard/Tutorial**: großer Avatar mit Sprechblase erklärt in 6 Schritten Spiel,
  Ziel und Funktionen; automatisch beim ersten Home-Besuch (Flag schlumpfWizard),
  jederzeit über „❓ Anleitung" wiederholbar.
- F41: **Standalone**: Querformat-Hinweis-Overlay bei Hochformat auf Telefonen
  (1×/Sitzung ablegbar), Install-Button bei beforeinstallprompt, Fullscreen-Versuch
  beim ersten Jagdstart, Wizard-Replay.
- F42: **Erzähler-Stimme**: deutsche Stimme wählen (bevorzugt weiblich/System), pitch
  1.08, rate 0.92 (ruhiger Erzähler statt Kindstimme).
- F43: **Design-Pass** (aus Kids-UI-Analyse): Knautsch-Buttons (0 6px 0 + Press-Versatz),
  Pop-Easing cubic-bezier(.34,1.56,.64,1), Wiggle-Affordanz auf „Neue Suche",
  Bounce-In für Fund-Modal, Sofort-Plopp bei Taps (120-ms-Sperre), Ding bei grünem
  Punkt, Stempel-Sound bei neuer Art. Kindgerechte Namen: Schatz-Radar, Mein Waldbuch,
  Anzieh-Ecke, Für Erwachsene.
- F44: **Avatar-Quick-Wins** (aus Charakter-Bericht): Boden-Kontaktschatten (::after),
  Kinn-AO-Overlay (::before, z 2.6), Atem-Animation (atmen, transform-origin unten) auf
  Bühnen-/Radar-Avatar, prefers-reduced-motion respektiert. Asset-Rework (Art-Bibel,
  Master-Bild, Vorkompositing) ist als eigene Produktionsrunde geplant — nicht Teil v7.
- F45: Neue Sounds: ding, plopp, stempel (lokal, offline).

## Technisch
- T1'''''': `node verifier/v7/test_game_v7.mjs` Exit 0 (34 Items, 14 Gnome,
  Inhabitants-Summe, Regressionen).
- T2'''''': `node verifier/v7/check_v7.mjs` Exit 0 (Wichtel-Bilder, Sounds,
  Wizard-/Standalone-/Rename-Marker, Avatar-Quick-Win-Marker).
- T3'''''': v6/v5/v4/v3/v1-Suiten (außer dokumentierter v1-Ausnahme und der
  v4-Itemzahl-Überholung, jetzt 34) grün.
- T4'''''': Screenshots: Wizard, Avatar mit Schatten, Wichtel-Kontaktblatt.
