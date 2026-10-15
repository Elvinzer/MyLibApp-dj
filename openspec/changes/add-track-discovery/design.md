## Context
Voir proposal.md et ../../ux/track-discovery/README.md. Client Next 16.4 React 19, backend local FastAPI, bibliothèque SQLite JSON.
## Goals / Non-Goals
**Goals:** rendre les maquettes fonctionnelles et conserver sélection, critères et écoute.
**Non-Goals:** Rekordbox, tonalité/énergie inventée, téléchargement d’extraits promotionnels.
## Decisions
- Module backend discovery, routeur ajouté au backend existant. SQLite conserve les idées et associations aux imports. Écriture transactionnelle des playlists, annulation limitée aux ajouts effectués.
- Catalogue public iTunes, recherche artiste et style selon référence. Recherche éditoriale et métadonnées, sans prétendre une similarité audio. BPM externes inconnus. Déduplication stricte de version/titre/artiste et identité de catalogue.
- Extraits Apple streamés dans le lecteur unique, jamais stockés, attribution et lien iTunes visibles. Les liens catalogue sont validés. Métadonnées mises en cache brièvement ; délais réseau bornés et échec séparé de la bibliothèque.
- Import : ouverture de la source et association explicite d’un lien YouTube/SoundCloud/Spotify, car une page iTunes ne fournit pas de fichier importable. Pas de téléchargement automatique d’une version trouvée approximativement.
- Recherche locale par style/voisinage, artiste ou titre ; tempo corrigé stable si connu et raisons distinctes. Les filtres existants de recommandations par passage restent disponibles sur la fiche.
- Composant discovery conservé monté pour préserver onglets, résultats et positions ; requêtes annulées/ignorées quand obsolètes. Sélection serveur, aucun rendu par tick du lecteur.
## Risks / Trade-offs
- [Catalogue non sémantique] → explications honnêtes et plusieurs requêtes bornées, aucun score de compatibilité.
- [Artiste des imports parfois un nom de chaîne] → critères de recherche modifiables par l’utilisateur.
- [Version externe non possédée] → association explicite par lien, sans rapprochement flou.
- [Défaillance réseau] → locaux et sélection utilisables, reprise explicite.
## Migration Plan
Table additionnelle sans modification destructive ; champs import facultatifs. Les anciens clients ignorent les idées. Préserver .next actif, build isolé .next-build.
