## 1. Préparer et lever les risques techniques

- [x] 1.1 Vérifier les versions disponibles de Next.js (16.3+ avec Turbopack), Node, Python, agent-browser, yt-dlp, son runtime JavaScript et FFmpeg/ffprobe ; verrouiller les dépendances compatibles et documenter les prérequis.
- [x] 1.2 Créer des fixtures reproductibles : 90/128/174 BPM, silence, ambiguïtés demi/double et séquence 120→140 ; sélectionner des liens publics autorisés YouTube et SoundCloud pour les essais réels.
- [x] 1.3 Prototyper l'analyse locale par fenêtres et sa désambiguïsation ; mesurer exactitude et traitement par blocs sur un set de 2 h, consigner Mac de référence et paramètres versionnés.
- [x] 1.4 Valider l'agrégation d'une sélection pré-calculée en <= 200 ms au p95, y compris changements rapides et transition de tempo ; ajuster l'algorithme avant intégration UI sans dégrader silencieusement les critères.

## 2. Installer les fondations locales

- [x] 2.1 Initialiser Next.js/TypeScript et le service Python isolé avec worker, configuration loopback, healthchecks et façade de même origine.
- [x] 2.2 Créer le stockage sous Application Support, le schéma SQLite versionné et migrations pour morceaux, analyses, playlists, appartenances et traitements ; exclure données et secrets du suivi.
- [x] 2.3 Implémenter validation Host/Origin, secret interne entre services, résolution médias par identifiants, garde des chemins et lancement de sous-processus sans shell ; vérifier les requêtes non autorisées.
- [x] 2.4 Implémenter file persistée à concurrence bornée, progression par étape, annulation et réconciliation des tâches interrompues au démarrage.

## 3. Récupérer et conserver les médias

- [x] 3.1 Valider/normaliser les liens YouTube et SoundCloud, contrôler redirections/hôtes et identité de source ; refuser playlist seule/live et importer une seule vidéo lorsque le lien comporte aussi une playlist.
- [x] 3.2 Intégrer yt-dlp et FFmpeg/ffprobe, métadonnées et pochettes ; produire un média lisible, une durée et des pics multi-résolution sans exposer de fichiers incomplets.
- [x] 3.3 Rendre lecture et export disponibles dès la préparation, indépendamment de l'analyse ; traiter indisponibilité, connexion tierce requise, timeouts, permissions et disque plein avec reprise adaptée.
- [x] 3.4 Garantir les doublons transactionnels sur source/id, y compris imports simultanés ; nettoyer annulations et temporaires et tester reprise après arrêt.
- [x] 3.5 Fournir consultation, recherche titre/auteur, tris et suppression confirmée avec retrait des playlists, arrêt du titre joué et nettoyage reprenable des fichiers internes.

## 4. Intégrer l'analyse BPM

- [x] 4.1 Persister la série temporelle versionnée, BPM global moyen pondéré, étendue robuste et états stable/variable/incertain ; exclure les passages sans support rythmique.
- [x] 4.2 Exposer les données compactes et l'agrégation locale de sélection, avec protection contre résultats périmés et Web Worker si nécessaire.
- [x] 4.3 Implémenter bornes contraintes, seuil de durée fiable, erreurs explicites et aide sur résolution ; synchroniser valeurs pendant drag et saisie clavier sans requête de recalcul serveur.
- [x] 4.4 Implémenter ÷2, ×2 et réinitialisation indépendants pour global/sélection, persistance globale et invalidation de l'export à changement de BPM.

## 5. Construire l'interface et le lecteur

- [x] 5.1 Créer les tokens sombres, typographie système, icônes cohérentes, sidebar, en-tête d'import et lecteur fixe ; vérifier les contrastes plutôt que les supposer.
- [x] 5.2 Construire bibliothèque, recherche/tris, lignes à pochettes et formes d'onde compactes, états vides/chargement/erreur et progression fidèle de l'import.
- [x] 5.3 Implémenter un lecteur audio unique dans le layout persistant : lecture/pause, déplacement, volume, position restaurée en pause, erreurs et streaming HTTP Range.
- [x] 5.4 Créer le détail avec forme d'onde agrandie, zoom/défilement, tête de lecture et deux poignées distinctes ; champs début/fin et panneau BPM global/sélection mis à jour automatiquement.
- [x] 5.5 Implémenter Écouter la sélection et boucle explicite avec adaptation des bornes pendant lecture ; vérifier la poursuite normale hors boucle.
- [x] 5.6 Ajouter focus visible, labels et états accessibles, raccourcis non intrusifs, reduced-motion et annonces BPM modérées ; tester le clavier, les rôles/noms/annonces destinés à VoiceOver dans l’arbre d’accessibilité et les fenêtres 768/1024/1440 px avec zoom texte 200 %.

## 6. Organiser les playlists

- [x] 6.1 Implémenter création, renommage et suppression confirmée des playlists, sans suppression des morceaux.
- [x] 6.2 Ajouter le popover multi-playlists avec création en place, appartenance idempotente et retrait sans copie ni suppression de média.
- [x] 6.3 Implémenter ordre transactionnel par drag et commandes monter/descendre, persistance et recherche n'altérant pas l'ordre.
- [x] 6.4 Brancher lecture enchaînée sur instantané de playlist, précédent/suivant, fin de file et retrait des titres supprimés de la bibliothèque.

## 7. Exporter et lancer au quotidien

- [x] 7.1 Produire le MP3 complet haute qualité depuis le média local avec titre, auteur connu, pochette et TBPM global corrigé arrondi si valide ; vérifier les tags et la durée avec un outil de lecture des métadonnées.
- [x] 7.2 Ajouter téléchargement navigateur, noms sûrs, progression, cache versionné et reprise d'export ; vérifier export sans BPM, hors réseau et après changement de correction.
- [x] 7.3 Fournir le lanceur macOS et son raccourci avec healthcheck, réutilisation de la bonne instance, gestion des ports et dépendances manquantes, sans arrêter de processus étrangers.
- [x] 7.4 Documenter installation initiale, lancement/arrêt, emplacement des données, estimation BPM et limites des sources ; distinguer clairement installation et usage sans terminal.

## 8. Vérifier la V1 avec preuves

- [x] 8.1 Exécuter les tests ciblés métier/audio : doublons, annulation/reprise, suppression, transactions playlists, exactitude locale/globale, silence et export ; corriger les écarts aux six specs.
- [x] 8.2 Parcourir dans le navigateur import réel YouTube et SoundCloud, lecture persistante, sélection dynamique, boucle, playlists et téléchargement MP3 ; consigner les liens de test et les limites rencontrées sans déclarer un mock comme succès réel.
- [x] 8.3 Mesurer sur le Mac de référence la latence p95 de sélection et la mémoire sur un set de 2 h ; vérifier fluidité pendant analyse et taille bornée des données navigateur.
- [x] 8.4 Vérifier relance hors réseau avec données conservées, suppression isolée des playlists, cas média absent et dépendance manquante, et lancement répété du raccourci.
- [x] 8.5 Effectuer next-dev-loop sur le dev server : compilation, erreurs serveur/client, interactions et état React ; vérifier la navigation clavier, le focus et les tailles de fenêtre avec captures de l'interface.
- [x] 8.6 Rédiger un bilan de validation avec commandes, résultats, captures, mesures et limites restantes ; ne cocher que les tâches effectivement réalisées.

## 9. Mise à jour locale depuis l'application macOS

- [x] 9.1 Détecter les différences de contenu du code et des dépendances avec un manifeste installé, en excluant documentation, tests et caches.
- [x] 9.2 Proposer une mise à jour ou son report au lancement et à la réouverture, afficher une progression native et relancer l'app après succès.
- [x] 9.3 Préparer et compiler dans une copie isolée, contrôler les dépendances modifiées et ne pas remplacer les données utilisateur.
- [x] 9.4 Installer runtime et bundle de façon coordonnée avec vérification de santé, restauration et exclusion des mises à jour concurrentes.
- [x] 9.5 Tester détection, source absente, restauration, échec avant compilation, verrou, compilation Swift et mise à jour complète réelle ; installer la version correspondante.
