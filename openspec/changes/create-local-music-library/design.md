## Context

Voir `proposal.md` pour la motivation et le périmètre. Le dépôt ne contient pas encore d'application. L'utilisateur travaille sur son Mac uniquement et a validé les choix fonctionnels de la V1. La capture SoundCloud sert de référence pour la hiérarchie pochette / lecture / forme d'onde ; elle ne demande pas de reproduire les fonctions sociales.

## Goals / Non-Goals

**Goals:** séparer les traitements audio coûteux de la navigation ; rendre la sélection BPM immédiate une fois l'analyse prête ; conserver les médias, les résultats et les playlists entre les lancements ; fournir un lancement quotidien simple et une interface française soignée sans compte.

**Non-Goals:** hébergement distant, client audio macOS entièrement natif ou distribution signée/notariée, synchronisation, authentification applicative ou tierce, import de playlists distantes, téléchargement parallèle massif, découpage/export d'extraits, détection de tonalité, tagging avancé et édition audio. Aucun maintien du service après mise en veille du Mac n'est promis.

## Decisions

### 1. Deux processus locaux, une seule interface

Next.js App Router / React / TypeScript fournit l'interface et une façade HTTP de même origine. Un service Python local (FastAPI et un worker séparé du thread HTTP) possède la base SQLite et les opérations métier/audio. Une seule tâche lourde s'exécute à la fois ; les tâches supplémentaires attendent en file persistée. La navigation et la lecture restent disponibles pendant le travail.

Les deux services écoutent exclusivement sur loopback. Le navigateur communique uniquement avec Next.js ; le service Python exige un secret éphémère injecté par le lanceur, invisible à l'interface. Vérifier Host/Origin pour les écritures, interdire un CORS permissif et limiter les routes médias aux identifiants de bibliothèque. Cela ne crée aucun compte ni écran de connexion.

Alternative : tout exécuter dans les routes Next.js, plus simple initialement mais fragile pour les longs jobs et l'analyse Python. Alternative native : coût de packaging inutile pour la V1. Next.js doit être 16.3+ avec Turbopack pour next-dev-loop ; vérifier sa disponibilité au démarrage de l'implémentation, sans dégrader silencieusement ce prérequis.

### 2. Stockage persistant indépendant du dépôt

Utiliser `~/Library/Application Support/MyLibApp/` pour la base, les médias, pochettes, analyses versionnées et journaux bornés. Répertoire `tmp/` pour les téléchargements et conversions incomplets. Les noms internes utilisent des UUID et non les titres ; les noms d'export sont nettoyés. Ajouter SQLite et ce dossier aux exclusions de suivi si le chemin est surchargé vers le projet pour les tests.

Schéma logique :
- Track : id, source/provider, sourceId, canonicalUrl, titre, auteur ou nom de chaîne (sans le confondre avec un artiste vérifié), durée, dates, état média, chemins internes.
- Analysis : trackId, version d'algorithme, état, tempo brut/global, correction globale (0.5/1/2), étendue robuste, données temporelles compactes, support rythmique et niveau de fiabilité.
- Playlist : id, nom, dates.
- PlaylistTrack : playlistId, trackId, position ; unicité d'un morceau dans une même playlist.
- Job : id, trackId, type, étape, progression éventuelle, état, erreur présentable, dates.

Unicité provider + sourceId, y compris pour un import en cours, avec contrainte transactionnelle. Deux sources distinctes contenant le même audio restent deux entrées en V1. SQLite appartient au service Python pour éviter les écritures concurrentes entre runtimes. La V1 regroupe les champs Track, Analysis résumée et Job dans un document JSON transactionnel par morceau (id et identité source indexés), plutôt que multiplier les tables ; la série d’analyse reste un fichier versionné. Les playlists et appartenances restent relationnelles.

Supprimer une playlist ne supprime jamais un fichier. Retirer d'une playlist ne retire pas de la bibliothèque. La suppression d'un morceau de la bibliothèque exige confirmation, retire toutes ses appartenances et ses fichiers locaux ; un fichier MP3 déjà exporté reste intact. Prévoir une tombstone et reprise du nettoyage pour une suppression partiellement échouée.

### 3. Import robuste, lecture dès que possible

Valider une URL HTTPS YouTube/youtu.be ou SoundCloud et normaliser l'identité avec l'extracteur. Ne pas suivre un lien vers un hôte arbitraire fourni par l'utilisateur ; contrôler les redirections de résolution et ne jamais accéder aux adresses privées/link-local. Pour une vidéo avec paramètre de playlist, importer uniquement la vidéo. Refuser une URL de playlist seule ou un live en cours avec une explication.

Pipeline : validation → métadonnées → récupération audio → préparation du média/forme d'onde → analyse rythmique → prêt. yt-dlp récupère l'audio disponible ; FFmpeg/ffprobe le prépare. Utiliser des sous-processus avec arguments structurés, sans shell et sans interpolation de titre/URL dans une commande. Timeout de réseau, arrêt contrôlé et nettoyage des temporaires. Contrôler l'espace disque et les erreurs de permissions.

Conserver un média lisible localement dans un format que le navigateur cible décode. Il devient lisible dès la préparation terminée, sans attendre l'analyse ; si celle-ci échoue, conserver lecture et export, afficher une erreur et permettre sa reprise. Une importation annulée ne laisse pas de morceau fantôme. Au redémarrage, les jobs interrompus deviennent explicitement reprenables ; pas de succès fictif.

Exposer des états durables, lus par polling léger lorsque des tâches sont actives (environ 1 s, arrêté en l'absence de job). Afficher un pourcentage uniquement si la source le fournit ; sinon afficher une étape et une activité indéterminée. Ne pas bloquer le reste de l'app.

### 4. Analyse temporelle pré-calculée et agrégation instantanée

Python/librosa calcule hors du thread UI une enveloppe d'attaques et des hypothèses de tempo locales sur fenêtres chevauchantes (départ : fenêtres de 8 s, pas de 1 s), avec scores de régularité et support rythmique. Traitement des longs fichiers par blocs avec recouvrement ; conserver des index temporels plutôt qu'un décodage intégral dans le navigateur. Les paramètres définitifs et seuils sont versionnés et calibrés sur les fixtures.

L'algorithme regroupe les hypothèses cohérentes et réduit les sauts artificiels d'octave sans forcer tous les passages d'un set au même tempo. Les zones silencieuses ou sans support rythmique suffisant sont exclues. Le BPM global est la moyenne pondérée par la durée couverte des estimations locales valides, après résolution des ambiguïtés. L'étendue affichée est P10–P90 pondérée, libellée « plage habituelle estimée », pour éviter des extrêmes aberrants. Ce n'est pas une mesure exacte ; l'interface conserve « estimé » et signale un tempo variable.

Le navigateur charge la série compacte et agrège uniquement les fenêtres dont le centre appartient à la sélection, pondérées par leur recouvrement. Une fenêtre peut intégrer du contexte autour des bornes : documenter cette résolution dans l'aide de l'analyse. Ne pas calculer une moyenne brute des timestamps de beats qui traverse un changement de tempo. Afficher l'absence de résultat plutôt qu'un faux 0 BPM.

Les poignées et les temps sont mis à jour à chaque frame ; le calcul est coalescé et exécuté dans un Web Worker si nécessaire. Cible contractuelle après chargement : dernière sélection affichée en <= 200 ms au p95 pour un set de 2 h sur le Mac de référence, et aucune réponse ancienne ne peut écraser une sélection plus récente. Aucun appel réseau, ré-extraction audio ou bouton de validation pendant le drag.

Sélection minimale physique : 1 s ; en dessous de 8 s ou si le support rythmique est insuffisant, afficher « plage trop courte » ou « rythme incertain » au lieu d'un BPM assuré. Sur une sélection valide, afficher la valeur et un état stable/incertain/variable ; aucune probabilité prétendument calibrée. Correction ÷2 / ×2 / réinitialiser limitée au facteur 0.5/1/2, indépendante pour le global et la sélection. Correction globale persistée et exportée ; correction de sélection remise à 1 au changement de morceau, non écrite dans le BPM global.

Alternative rejetée : relancer librosa à chaque mouvement, trop lent et source de courses. Un simple BPM global recopié dans la sélection ne satisfait pas la demande. Un spike d'exactitude et de performance précède l'interface finale.

### 5. Lecteur unique et formes d'onde pré-calculées

Un élément audio persistant à la racine de l’interface possède la lecture et sa file. Un canvas léger affiche des pics préparés côté service et agrégés à la résolution visible ; les lignes de bibliothèque n'instancient pas chacune un lecteur ou un décodeur. Le canvas et ses poignées accessibles remplacent wavesurfer.js : ils partagent directement le lecteur unique, évitent les décodeurs supplémentaires et facilitent la validation du drag sans effet de bord. Différencier clairement morceau consulté et morceau actuellement joué. Ouvrir un détail n'interrompt pas la lecture ; lancer un autre titre remplace explicitement le titre joué.

La vue détail agrandit la forme d'onde, ses deux poignées, les champs début/fin et le panneau BPM. Zoom et défilement facilitent la sélection sur un set. Clic sur la forme d'onde : déplacer la tête de lecture ; drag des poignées : modifier uniquement la sélection. Bouton « Écouter la sélection » : lecture depuis son début. Boucle explicitement activée : retour au début à la fin de la plage ; changer les bornes pendant la boucle adapte sa prochaine limite et ramène la tête dans la plage si nécessaire. Sans boucle, lecture jusqu'à la fin du morceau.

La file de lecture d'une playlist est prise en instantané au lancement. Les modifications de playlist prennent effet au prochain lancement, évitant les sauts imprévus. Un morceau supprimé de la bibliothèque est écarté de la file ; si c'est le titre joué, arrêter proprement. Fin de file : arrêt, pas de répétition implicite. Rechargement de la page : restaurer titre et position, en pause pour respecter le navigateur.

### 6. Direction UX et visuelle

Interface française desktop-first. Sidebar stable « Bibliothèque », playlists et action de création ; en-tête avec champ de lien et bouton « Importer » ; contenu principal pour liste ou détail ; lecteur fixe en bas, avec réserve d'espace pour ne masquer ni contenu ni focus.

```text
┌───────────────┬───────────────────────────────────────────────┐
│ MyLibApp      │ Lien YouTube ou SoundCloud…       [Importer] │
│ Bibliothèque  ├───────────────────────────────────────────────┤
│               │ Bibliothèque             Recherche / Tri     │
│ Playlists   + │ Pochette  Titre · durée    BPM    Actions     │
│ • Warm-up     │           ▂▅▇▅▃▆▂▅▃▇▅▃▆▂▅▃                    │
│ • Afro house  │                                               │
│               │ Détail : forme d'onde agrandie et sélection   │
│               │ [début] ◀━━━━━━━━━━━━━━━━━━━━▶ [fin]           │
│               │ Global 128       Sélection 130 BPM           │
├───────────────┴───────────────────────────────────────────────┤
│ Pochette · titre    précédent / lecture / suivant   volume    │
└───────────────────────────────────────────────────────────────┘
```

La vue liste et le détail sont des destinations distinctes, pas un empilement forcé dans chaque ligne. Bibliothèque triée par ajout récent, recherche titre/auteur, tris titre et BPM avec valeurs inconnues en dernier. La playlist conserve son ordre manuel ; une recherche n'altère pas cet ordre.

Tokens proposés : fond graphite #111214, surfaces #1B1D20, surface élevée #25282D, texte principal #F5F5F5, secondaire #B5BAC4, accent menthe #5EE0B0 avec texte sombre #10231A. Palette à mesurer lors du build ; séparation et sélection ne reposent pas uniquement sur la couleur. Typographie système macOS sans téléchargement de police, corps 16 px, chiffres tabulaires pour temps et BPM, rythme d'espacement 4/8 px. Icônes SVG d'une seule famille, pochettes prédominantes, décor discret et pas d'animations continues.

Interactions : action principale explicite ; actions secondaires en menu accessible, ajout à une playlist dans un popover multi-sélection avec création en place. Feedback local persistant pour les erreurs et messages brefs pour les succès. État vide avec import immédiatement disponible ; états de chargement à dimensions réservées ; aucun onboarding obligatoire. Suppression playlist via confirmation, suppression morceau via confirmation indiquant l'impact fichier/playlists. Ne pas afficher de vocabulaire de worker, job ou port dans le parcours normal.

Accessibilité : contraste texte >= 4.5:1, contrôles/focus >= 3:1, focus visible, labels, navigation clavier, contrôle clavier des deux bornes et champs temps comme alternative au drag, commandes monter/descendre pour le réordonnancement. Commandes principales de 40–44 px ; poignées visuellement fines avec zone saisissable élargie. Espace lecture/pause hors champs et dialogues ; ne pas détourner les raccourcis système. Messages BPM annoncés modérément après stabilisation pour ne pas saturer VoiceOver. Respect de reduced-motion ; transitions discrètes de 120–180 ms. Vérification à 1024×768 et 1440×900, fenêtre 768 px et zoom texte 200 % sans perte des fonctions principales.

Sources de décision : ui-ux-pro-max confirme les principes de focus, navigation clavier, contraste, stabilité de layout et retours d'état. Sa recherche globale renvoie une landing page et la recherche produit une app d'apprentissage : ces correspondances ne sont pas retenues. Palette, structure bibliothèque et contrôles audio ci-dessus sont des choix de conception adaptés au brief, pas des résultats prétendument validés par ces recherches.

### 7. Export et lancement

MP3 du morceau complet en VBR qualité élevée (FFmpeg/LAME q=2), produit depuis le média conservé, mis en cache par version du média et métadonnées. Ne pas promettre une qualité supérieure à la source. Écrire titre, auteur connu sans invention, pochette disponible et TBPM entier arrondi du BPM global corrigé si valide ; la précision décimale reste dans la bibliothèque. Sans BPM fiable, exporter sans TBPM et en informer l'utilisateur. Un résultat incertain reste identifiable comme estimé dans l'app. Changer de sélection ne change ni l'audio exporté ni son BPM global.

L'export est servi avec un nom nettoyé et Content-Disposition attachment ; le navigateur choisit son dossier habituel. Ne jamais écraser silencieusement un export existant ni enregistrer arbitrairement ailleurs sur le Mac.

Un lanceur macOS `.command`, accessible par raccourci, vérifie les dépendances, démarre/retrouve les services du projet et ouvre le navigateur après un healthcheck. Pas de terminal à manipuler pour l'usage normal. Première installation documentée séparément avec versions verrouillées et environnement Python isolé ; détecter les dépendances manquantes avec remède explicite. Vérifier aussi le runtime JavaScript et les composants requis par yt-dlp pour YouTube. Si le port choisi est occupé par un autre service, en choisir un libre et communiquer la bonne URL au lanceur ; ne tuer aucun processus étranger.

### 8. Validation avant livraison

Tests ciblés : identité source/doublons, transactions et ordre playlist, persistance/reprise, export/métadonnées, HTTP Range et suppression. Fixtures audio synthétiques reproductibles et fichiers autorisés pour tempo constant 90/128/174, silence, demi/double tempo et changement 120→140. Sur fixtures stables, erreur <= 2 BPM après désambiguïsation ; chaque moitié d'une fixture à deux tempos doit retourner son propre tempo, pas le global. Mesurer p95 du drag sur un set de 2 h et consigner modèle de Mac, durée d'import/analyse et mémoire. Une analyse longue peut prendre du temps, sa durée n'est pas confondue avec celle d'une sélection déjà indexée.

Validation de bout en bout dans le navigateur : import réel d'un lien public autorisé de chaque plateforme, erreurs source, lecteur persistant, sélection dynamique, boucle, playlists, export et relance hors réseau après import. Ne pas substituer des mocks à la preuve d'un import réel. Exécuter next-dev-loop avec le dev server et agent-browser, vérifier compilation, erreurs serveur/client et comportement React. Ne pas déclarer ces vérifications réussies pendant la phase de proposition.

Références techniques consultées : [yt-dlp](https://github.com/yt-dlp/yt-dlp#readme), [librosa tempo](https://librosa.org/doc/0.11.0/generated/librosa.feature.tempo.html), [librosa beat tracking](https://github.com/librosa/librosa/blob/main/librosa/beat.py), [wavesurfer.js](https://wavesurfer.xyz/examples/). Le support concret et les versions seront vérifiés pendant le spike.

## Risks / Trade-offs

- [Les plateformes changent ou refusent certains contenus] → version de yt-dlp vérifiable, erreurs explicites et reprise ; aucune garantie pour tous les liens.
- [Le tempo d'un set ou d'un passage peu percussif est ambigu] → données temporelles, statut incertain/variable, étendue robuste et corrections ; aucun BPM forcé sur le silence.
- [Les fenêtres ajoutent du contexte autour de la sélection] → bornes et résolution expliquées, durée minimale fiable et test d'une transition.
- [Fichiers longs et CPU/mémoire limités] → worker séparé, traitement par blocs, pics pré-calculés, une tâche lourde à la fois et benchmark 2 h.
- [L'encodage MP3 recomprime une source déjà compressée] → un export haute qualité sans promesse d'amélioration ; conserver le média source préparé pour éviter les encodages successifs.
- [Un service local sans login peut recevoir des requêtes d'autres sites] → loopback, vérification Host/Origin et secret entre services, sans UX de connexion.
- [Suppression et disque plein] → confirmation des impacts, transactions, temporaires et nettoyage repris ; conserver les médias valides lors d'un échec d'analyse.

## Migration Plan

Aucune donnée préexistante à migrer. Créer un schéma SQLite versionné, des migrations transactionnelles et une sauvegarde avant évolution future. Le lanceur ne stocke rien dans les artefacts build. Arrêter les processus pour mettre à jour ; revenir au code précédent sans supprimer les fichiers utilisateur. Ne jamais supprimer ou déplacer `.next` pendant `next dev` ; isoler le dossier de build production si nécessaire.

### Complément de distribution locale

Le lanceur `.command` est complété par un bundle AppKit Swift local, une icône
Dock et un raccourci Bureau. Le bundle lance une copie indépendante du runtime
production sous Application Support. Il conserve un accès navigateur, sans
modifier le lecteur web, les données ou les API. Sa signature ad hoc est locale,
sans distribution App Store ni notarisation.

### Mise à jour du lanceur installé

Le bundle conserve l'emplacement du projet source et un helper Python autonome.
Au lancement ou à la réouverture, le helper compare une empreinte SHA-256 des
sources et fichiers de dépendances au manifeste du runtime. L'app propose
l'installation ou son report ; un projet indisponible ne bloque pas le lancement.

Une mise à jour utilise un verrou de processus et une copie APFS isolée. Elle
reconstruit les dépendances modifiées, le build production et le bundle Swift,
puis prépare les deux artefacts avant de stopper le runtime installé. Les
remplacements coordonnés conservent des sauvegardes jusqu'au succès du test de
santé. L'échec restaure les deux artefacts. Les données restent hors de ces
répertoires. Un changement du projet pendant la préparation annule la promotion.
Après succès, l'ancien lanceur quitte et LaunchServices rouvre le nouveau bundle.
