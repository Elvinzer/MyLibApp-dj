## Why

Préparer sa musique depuis YouTube et SoundCloud demande aujourd'hui de jongler entre récupération audio, lecteur, estimation du tempo et classement. MyLibApp réunira ces usages dans une bibliothèque personnelle agréable, exécutée uniquement sur le Mac, sans compte ni connexion à un service applicatif.

## What Changes

- Importer un lien individuel YouTube ou SoundCloud, conserver le fichier sur le Mac et éviter les doublons d'une même source.
- Afficher pochette, titre, source, durée, forme d'onde et progression réelle du traitement pour les morceaux et sets.
- Estimer automatiquement un BPM moyen global et une étendue de tempos détectés, avec indication de fiabilité et correction ÷2 / ×2.
- Sélectionner un passage par deux poignées sur la forme d'onde et actualiser automatiquement son BPM pendant leur déplacement, sans bouton d'analyse ni rechargement.
- Écouter via un lecteur persistant, naviguer dans le morceau et boucler une sélection.
- Créer, renommer, supprimer des playlists et réordonner leurs morceaux ; un fichier peut appartenir à plusieurs playlists.
- Exporter le morceau complet en MP3, avec titre, pochette et BPM global disponible dans les métadonnées.
- Détecter les modifications du projet au lancement de l’app macOS et proposer leur installation, avec progression, conservation des données et restauration en cas d’échec.
- Fournir une interface française sombre, adaptée au bureau, inspirée de la hiérarchie de la capture SoundCloud, avec navigation clavier, états explicites et lancement par raccourci macOS.

## Capabilities

### New Capabilities

- `local-library`: lancement et stockage locaux, import, progression, bibliothèque, doublons, erreurs et suppression.
- `tempo-analysis`: analyse du tempo global et d'une sélection, réactivité, fiabilité et corrections.
- `audio-playback`: lecteur persistant, formes d'onde, navigation et boucle de sélection.
- `playlist-management`: gestion des playlists, appartenance, ordre et lecture enchaînée.
- `mp3-export`: export complet et métadonnées, qualité et gestion des erreurs.
- `desktop-experience`: interface moderne sans compte, navigation, accessibilité et retours d'état.

### Modified Capabilities

Aucune : le projet ne contient encore aucune spécification fonctionnelle.

## Impact

Création d'une application locale Next.js/React/TypeScript, d'un service Python de traitement audio, d'une base SQLite et d'un stockage de fichiers sous le profil macOS. Dépendances envisagées : yt-dlp, FFmpeg/ffprobe, librosa et wavesurfer.js. Les versions seront vérifiées et verrouillées à l'implémentation ; Next.js devra satisfaire le skill next-dev-loop (16.3+ avec Turbopack).

Le réseau sert à récupérer le contenu source ; lecture, analyse et playlists fonctionnent ensuite localement. Pas d'authentification applicative, de cloud, de synchronisation, d'import massif de playlists distantes, d'édition audio ni d'export de sélection en V1. Les contenus nécessitant une connexion, une protection ou un accès indisponible donnent une erreur explicite ; la V1 n'intègre pas de gestion de comptes tiers.
