## Why

L’utilisateur souhaite importer un lien de morceau Spotify avec son compte Premium et télécharger son audio en MP3 dans MyLibApp. Un essai réel sur « 50 DUB » a confirmé la récupération directe de l’audio et la conversion en MP3.

## What Changes

- Accepter les liens individuels Spotify et dédupliquer leur identifiant.
- Proposer une connexion Spotify dans le navigateur, une déconnexion et des états explicites.
- Récupérer l’audio directement avec librespot-python, dans un environnement isolé.
- Réutiliser lecture locale, BPM, style, Finder et nommage des exports MP3.

## Capabilities

### New Capabilities
- `spotify-import`: connexion locale et import direct d’un morceau Spotify Premium.

### Modified Capabilities

Aucune spec principale publiée à modifier.

## Impact

Backend Python et worker séparé, interface d’import Next.js, dépendances verrouillées séparées, installation et packaging macOS. Les playlists Spotify et la synchronisation de compte sont hors périmètre.
