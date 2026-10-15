## Why

MyLib affiche le tempo des morceaux mais ne permet pas encore de trouver rapidement un prochain titre cohérent pour un mix DJ. Exploiter les fichiers audio et les BPM déjà disponibles permettrait de proposer des transitions au sein de la bibliothèque personnelle.

## What Changes

- Estimer automatiquement le style à partir de l'audio local, afficher un résultat prudent et permettre sa correction manuelle.
- Ajouter « À mixer ensuite » sous l'analyse du rythme : cinq recommandations initiales, écoute, ajout à une playlist et accès au détail.
- Rechercher exclusivement dans la bibliothèque pour cette version, avec styles voisins par défaut et filtre « Même style ».
- Utiliser le BPM corrigé du morceau complet par défaut, ou explicitement celui du passage sélectionné ; tolérance initiale ±5 BPM, réglable à ±2 ou ±10.
- Classer les candidats par proximité de style puis par écart de tempo, expliquer les correspondances et gérer les données incertaines ou absentes.
- Conserver le langage visuel sombre et menthe de l'app, avec une liste lisible, responsive et accessible.

## Capabilities

### New Capabilities
- `music-style-analysis`: Analyse locale du style, incertitude, persistance, correction et traitement de la bibliothèque existante.
- `dj-track-recommendations`: Sélection et présentation de morceaux de la bibliothèque selon style et tempo de référence.

### Modified Capabilities
Aucune. Les capacités ci-dessus sont des ajouts ; les comportements actuels de lecture, sélection, correction du tempo et export sont conservés.

## Impact

- Backend Python : analyse de style en arrière-plan, stockage des résultats et corrections, classement et endpoints dédiés.
- Interface Next.js : types de données, style près du titre, nouveau bloc sous l'analyse, intégration des actions existantes.
- Installation macOS : modèle préentraîné et moteur d'inférence à sélectionner après validation de précision, performance, compatibilité Apple Silicon/Python et conditions de distribution.
- Bibliothèque existante : enrichissement progressif, sans réimport des médias ni recalcul imposé du tempo.
- Hors périmètre : découverte YouTube/SoundCloud, tonalité/Camelot, changement de vitesse, beatmatching automatique et garantie de transition harmonique.
- L'implémentation et les tests ont été autorisés après validation de la proposition.
