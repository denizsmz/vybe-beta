VYBE PWA – Upload-Anleitung

Diese Dateien gemeinsam in das Stammverzeichnis eines Webhostings hochladen:

- index.html
- design.css
- manifest.webmanifest
- service-worker.js
- offline.html
- Ordner icons

GitHub Pages:
1. Neues öffentliches Repository erstellen.
2. Alle Inhalte dieses Ordners hochladen.
3. Settings > Pages öffnen.
4. Source: Deploy from a branch.
5. Branch: main, Ordner: / (root).
6. Speichern und den angezeigten Link öffnen.

iPhone:
Safari > Teilen > Zum Home-Bildschirm.

Android:
Chrome > Menü > App installieren oder Zum Startbildschirm hinzufügen.

Updates:
Bei einer neuen Version CACHE_VERSION in service-worker.js ändern,
zum Beispiel von vybe-pwa-v41 auf vybe-pwa-v42.

Design:
Neue Oberflächen-Regeln gehören in design.css. Dort stehen auch alle Farben,
Abstände, Rundungen und Bewegungen als zentrale Werte (Design-Tokens).
