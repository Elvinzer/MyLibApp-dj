# MyLib

Votre bibliothèque musicale personnelle sur Mac : import YouTube / SoundCloud,
lecture locale, BPM global et de sélection, playlists et export MP3. Aucun compte.

## Lancer l’application

Double-cliquez sur **MyLib.app** dans `/Applications`, ou sur son raccourci
**MyLib.app** sur le Bureau. Vous pouvez glisser l’application dans le Dock.
Elle lance les services en arrière-plan et ouvre votre navigateur habituel,
sans VS Code ni fenêtre de terminal. Recliquez sur l’icône pour rouvrir l’interface.
Le menu MyLib → Quitter MyLib arrête les services qu’elle a démarrés.

L’application utilise sa propre copie des fichiers d’exécution dans
`~/Library/Application Support/MyLibApp/Runtime/`. Elle reste utilisable si le
dossier de développement est fermé ou déplacé. Vos morceaux et playlists restent
stockés dans le dossier de données, en dehors de l’application et du runtime.
Node.js, Python Homebrew et FFmpeg déjà installés sur ce Mac restent nécessaires ;
ce bundle est une installation locale, pas un installeur portable pour un autre Mac.

### Mises à jour au lancement

À chaque lancement ou réouverture depuis le Dock/Bureau, MyLib compare le code
local du projet avec sa version installée. Si une modification est détectée,
une fenêtre propose **Mettre à jour et ouvrir** ou **Plus tard**. La préparation
se fait en arrière-plan avec un indicateur, puis MyLib redémarre automatiquement.
Aucun terminal et aucune commande ne sont nécessaires.

La mise à jour prépare une copie isolée, installe les dépendances modifiées,
construit la version production et vérifie son démarrage avant de la valider.
En cas d'échec de compilation ou de démarrage, l'ancienne version est conservée
ou restaurée. La bibliothèque, les fichiers audio et les playlists ne sont
jamais remplacés par le mécanisme de mise à jour. Deux mises à jour simultanées
sont empêchées par un verrou.

Les changements sont détectés par le contenu des fichiers de l'app, du moteur
audio, du lanceur et des dépendances. Les seules modifications de documentation,
de tests et de caches ne déclenchent pas d'alerte. Si le dossier de développement
est déplacé ou indisponible, l'app installée continue de fonctionner ; il faut
recréer le bundle depuis le nouveau dossier pour rétablir ce lien de mise à jour.
Les outils Swift déjà installés sur ce Mac sont utilisés pour reconstruire le
lanceur natif lors d'une mise à jour.

Pour une réinstallation manuelle : quitter MyLib, puis exécuter `npm run build`
et `npm run package:mac` depuis le projet. Les copies de préparation utilisent
les clones APFS afin de partager les blocs disque non modifiés.

`MyLib.command` reste disponible comme lanceur alternatif pour le développement.
Fermer un onglet ne supprime aucune musique.

## Première installation

Prérequis : macOS Apple Silicon, Node 24+, Python 3.13, FFmpeg et ffprobe.
Avec Homebrew : `brew install node python@3.13 ffmpeg`.
Le navigateur recommandé est Chrome ou Safari à jour.

Double-cliquez sur **Installer.command**. Il prépare `.venv`, installe les versions
Python de `requirements.lock`, exécute `npm ci` et construit l’interface.
Les dépendances ne sont pas installées silencieusement à chaque lancement.

Pour développer : `npm run dev`. Le mode dev utilise Next.js 16.4.1 et Turbopack.
Le build production utilise `.next-build`, séparé du cache `.next` du serveur dev.
Si aucun build n’existe, le lanceur utilise le serveur de développement.

## Utilisation

1. Collez l’URL d’un morceau ou d’une vidéo, puis cliquez sur **Importer**.
   Le traitement continue pendant que vous explorez le reste de la bibliothèque.
2. Cliquez sur la pochette pour écouter ou sur le titre pour ouvrir son analyse.
3. Déplacez les poignées sur la forme d’onde, ou utilisez les champs début/fin en
   secondes. La sélection est actualisée pendant le geste ; aucun bouton de
   recalcul. Le zoom facilite la navigation sur les sets.
4. **Écouter la sélection** démarre au début du passage. Activez **Boucle** pour
   répéter ce passage. Sans boucle, la lecture continue normalement.
5. Le bouton dossier ajoute à une ou plusieurs playlists, avec création en place.
   Dans une playlist, faites glisser les morceaux ou utilisez monter/descendre.
6. **MP3 complet** télécharge le morceau entier, même lorsqu’un passage est
   sélectionné. Le navigateur choisit l’emplacement habituel de téléchargement.
7. **Afficher dans le Finder** ouvre le dossier du morceau avec son fichier
   source sélectionné.

Le lecteur reste actif pendant la navigation. Espace bascule lecture/pause
hors champs et dialogues. Les poignées répondent aux flèches (1 s), Maj+flèche
(10 s), Début/Fin ; les champs temps constituent une autre alternative au drag.
La file d’une playlist est prise en instantané au lancement ; ses modifications
s’appliquent à la prochaine lecture.

## Comprendre le BPM

Le BPM est **estimé**. L’analyse utilise des attaques rythmiques sur des fenêtres
d’environ 8 s espacées d’une seconde. Une fenêtre intègre du contexte autour des
bornes choisies. Un passage de moins de 8 s, du silence ou un rythme peu régulier
peut ne pas donner de résultat fiable. Les corrections ÷2 et ×2 aident à lever
les ambiguïtés musicales ; elles ne changent pas la vitesse de lecture.

Le BPM global est une moyenne des estimations locales valides. La plage
habituelle exclut les extrêmes (percentiles 10–90), ce ne sont pas les minimum et
maximum absolus. Un set à tempo changeant est signalé comme variable. Le BPM de
sélection est indépendant du global. La correction globale est conservée ;
la correction locale est remise à zéro au changement de morceau.

## Styles et recommandations DJ

Le style est estimé automatiquement à partir de trois extraits du fichier audio
local. Il apparaît près du titre ; **Corriger** permet de choisir un style et de
revenir à l'estimation. Votre correction est conservée après redémarrage ou
réanalyse. Un morceau ambigu peut afficher **Style à confirmer**. Les remixes et
les sets ne sont pas toujours décrits précisément par cette estimation.

Sous l'analyse du rythme, **À mixer ensuite** propose des titres de votre
bibliothèque : cinq au départ, puis **Voir davantage**. Les styles identiques
passent en premier, puis les styles voisins reconnus, puis les autres titres au
tempo proche. Le filtre **Même style** garde uniquement les styles communs.
Chaque ligne explique sa correspondance et permet l'écoute, l'ouverture du
détail ou l'ajout à une playlist. L'écoute garde la page d'analyse ouverte.

La référence est le **Morceau complet** par défaut ; **Ma sélection** utilise le
BPM du passage choisi, actualisé après déplacement des bornes. La tolérance
initiale est ±5 BPM, réglable à ±2 ou ±10. Les corrections ÷2/×2 sont respectées,
sans rapprochement automatique entre 80 et 160 BPM. Un passage trop court ou
incertain ne bascule pas automatiquement vers le BPM global.

Les morceaux sans audio disponible ou au BPM absent, incertain ou variable sont
exclus des suggestions. Sans style fiable, la recherche par tempo reste
utilisable ; le filtre strict devient disponible après analyse ou correction.
Le tempo et le style aident à choisir : ils ne garantissent ni la compatibilité
harmonique ni une transition réussie.

Le modèle Discogs-EffNet (environ 18 Mo) est fourni avec l'installation et la mise
à jour ; son téléchargement est vérifié. Les analyses fonctionnent ensuite hors
réseau et n'envoient aucun audio. L'enrichissement des morceaux déjà importés se
fait progressivement sans retéléchargement. Une erreur d'analyse de style ne
bloque pas la lecture ni les BPM ; **Réessayer l'analyse** permet de la reprendre.
Le modèle MTG/UPF est sous CC BY-NC-SA 4.0 pour cet usage personnel non commercial
(attribution et licence dans `backend/models/`).

L’export MP3 utilise la source locale et un encodage VBR haute qualité. Il
n’améliore pas la qualité de la source. Le titre, l’auteur connu, la pochette et
le BPM global arrondi sont inclus lorsqu’ils sont disponibles. Sans BPM valide,
le fichier est exporté sans ce champ. Le nom téléchargé suit le format
`nomArtiste_nomTitre_nomStyle_valeurBpmMoyen.mp3` ; les espaces et signes de
ponctuation sont remplacés par des `_`, le BPM effectif est arrondi à une
décimale et les valeurs inconnues sont indiquées dans le nom. Aucun extrait
audio n’est créé en V1. Dans `media/`, la source conserve son extension d’origine
et reprend ce nom de base ; le fichier de lecture local porte le préfixe
`preview_`. Ces noms sont actualisés après l’analyse et les corrections de BPM
ou de style.

## Titres similaires et préparation d’un set

Depuis la fiche d’un morceau, cliquez sur **Titres similaires**. **Ma bibliothèque**
propose des fichiers déjà présents, selon le style, l’artiste et le tempo corrigé.
**Découvrir** explore le catalogue iTunes par artiste et mots-clés de style.
Il s’agit de suggestions de catalogue : leur sonorité n’est pas comparée par une
analyse audio et leur BPM reste inconnu avant import et analyse.

**Affiner** permet de privilégier le morceau, l’artiste ou le style, de choisir
une tolérance de tempo pour les titres analysés et de préciser une recherche.
Ce dernier champ est utile lorsque l’auteur importé correspond à une chaîne
YouTube plutôt qu’à l’artiste. Les homonymes de titres ne sont pas considérés
comme des correspondances d’artistes.

**Retenir** conserve une idée dans **Ma sélection**, sur ce Mac et après
redémarrage. Cette action ne change pas l’écoute. Les extraits disponibles
s’écoutent dans le lecteur unique, sur demande, avec leur lien iTunes.
Ils sont diffusés depuis Apple et ne sont ni téléchargés ni conservés.

Une découverte peut rester dans votre sélection sans import. Pour obtenir un
fichier dans MyLib, ouvrez sa source, puis **Importer un lien** dans la sélection
et indiquez le lien YouTube, SoundCloud ou Spotify de la version choisie.
Un lien iTunes n’est pas un fichier importable. Un fichier déjà présent est
réutilisé ; l’import associé affiche sa progression, son annulation ou sa reprise.

**Enregistrer en playlist** ajoute les fichiers disponibles à une playlist
existante ou nouvelle, sans doublons. Les idées indisponibles restent retenues.
**Annuler l’ajout** retire uniquement les membres ajoutés par cette action et
préserve ceux qui étaient déjà dans la playlist. Rekordbox n’est pas intégré.

## Données et confidentialité

Les services écoutent uniquement sur `127.0.0.1`. Le service audio utilise un
secret de session interne, sans identifiant à fournir par l’utilisateur. La
bibliothèque se trouve dans :

`~/Library/Application Support/MyLibApp/`

Elle contient `library.sqlite`, `media/`, `analysis/`, `exports/`, `tmp/` et des
journaux bornés dans `logs/`. Le dossier de code et ses builds ne contiennent pas
la bibliothèque. Sauvegardez le dossier entier, services arrêtés, pour la conserver.
Les médias, analyses et sélections fonctionnent hors réseau après import.
Le réseau sert aux imports et à **Découvrir** : ouvrir cet onglet envoie les
termes de recherche (artiste, style ou précision saisie) au catalogue iTunes.
Aucun fichier audio de la bibliothèque n’est envoyé. L’écoute d’un extrait
se connecte directement au serveur Apple ; son audio n’est pas stocké.

Supprimer une playlist garde les fichiers. Supprimer un morceau du Mac retire
son audio, son analyse et ses appartenances ; une confirmation indique cet impact.
Les MP3 déjà téléchargés par le navigateur restent intacts.

## En cas de problème

- Un traitement interrompu peut être repris depuis sa ligne ; une analyse échouée
  ne supprime pas un média déjà prêt.
- Un lien de playlist seule, un direct en cours, une vidéo privée ou une source
  demandant une connexion YouTube/SoundCloud ne sont pas pris en charge.
- Les plateformes peuvent changer leur accès. Vérifiez les journaux audio et
  mettez yt-dlp à jour si nécessaire : `.venv/bin/python -m pip install -U yt-dlp`.
  Après une mise à jour, revalidez les imports et mettez `requirements.lock` à jour.
- En cas de disque plein, libérez de l’espace et reprenez le traitement.
- Si un port est utilisé par une autre application, le lanceur choisit un port libre.
- Si un prérequis est absent, réexécutez l’installation ; aucun processus étranger
  ne sera arrêté par le lanceur.

## Validation

- `npm test` : agrégation JS et tests Python métier/audio.
- `npm run typecheck` et `npm run build` : TypeScript et build production.
- `tests/test_dj.py` (inclus dans `npm test`) : classement DJ, corrections,
  sélection, persistance, queue, modèle absent, installation atomique et
  inférence réelle hors réseau.
- `.venv/bin/python tests/style_benchmark.py` : modèle réel sur les trois morceaux
  de validation et deux fichiers synthétiques de 2 h ; ne mesure pas une précision
  musicale générale. Le corpus attendu est décrit dans le script.
- `node tests/dj-browser.mjs` : parcours DJ desktop/mobile avec agent-browser et
  serveur dev ; exige une bibliothèque isolée contenant les fixtures DJ et
  refuse de s'exécuter directement sur votre bibliothèque personnelle.

Pour reproduire le parcours DJ sur une copie isolée des trois titres de
validation : `.venv/bin/python scripts/create-dj-test-library.py`, puis lancer
le serveur avec `MYLIB_DATA="$PWD/.test-data/dj-browser" npm run dev` (arrêter le
serveur de ce checkout auparavant, en conservant `.next`). Les titres
« Transition test » appartiennent uniquement à cette copie de test.

- `.venv/bin/python tests/benchmark_audio.py` : analyse reproductible d’un set
  synthétique de 2 h, mémoire maximale et résultats dans `.runtime/`.
- `node tests/browser.mjs` : parcours UI avec agent-browser et serveur lancé,
  après import des deux liens YouTube/SoundCloud fournis pour la validation.
  `--reimport` réimporte ces deux sources (supprime leurs entrées de test existantes).

Les exigences et tâches sont sous
`openspec/changes/create-local-music-library/` ; le bilan de validation décrit
les vérifications réellement exécutées et leurs limites.


## Spotify

Collez un lien de morceau `open.spotify.com/track/...` dans le champ d’import.
Les liens partagés et `intl-fr/track/...` sont acceptés ; albums et playlists ne
sont pas importés. Connectez un compte Premium avec le bouton Spotify, puis
relancez l’import : le lien reste dans le champ pendant la connexion.
L’autorisation affiche « Spotify for Desktop », identité du client utilisé par
librespot. Une demande expire après 30 minutes ; le bouton permet de la relancer.

Le fichier audio provient directement de Spotify, sans recherche de remplacement
sur YouTube. Après import, lecture, analyse BPM/style, Finder et export MP3
fonctionnent localement. Les exports gardent le format
`artiste_titre_style_bpm.mp3`. Un nouvel import du même lien retrouve le morceau.

La session réutilisable est conservée dans le dossier privé `spotify/` de la
bibliothèque (dossier 700, identifiants 600). « Déconnecter » la supprime et annule
les imports Spotify en cours ; les morceaux déjà importés restent disponibles.
Ne partagez pas ce dossier ni ses identifiants. Le port local 5588 doit être libre
pendant la connexion.

Le moteur [librespot-python](https://github.com/kokarare1212/librespot-python)
est installé au commit fixé dans `requirements-spotify.lock`, dans
`.spotify-venv`, séparément du moteur d’analyse musicale pour isoler leurs versions
de Protobuf. `Installer.command` et `npm run package:mac` le préparent via
`scripts/install-spotify.py`. L’accès dépend du fonctionnement de Spotify et du
client librespot. Les tests `tests/test_spotify.py` vérifient la validation des
liens, la confidentialité, le callback OAuth, les erreurs et l’export local.
