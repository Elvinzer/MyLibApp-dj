# Installer et lancer MyLib sur Mac

**Français** · [English](installation.en.md) · [Retour à l’accueil](../README.md)

Ce guide part de zéro. Vous n’avez pas besoin de savoir programmer.
MyLib s’installe sur votre propre Mac et ouvre son interface dans votre navigateur.
Il n’y a pas de site à héberger ni de compte MyLib à créer.

## 1. Vérifier votre Mac

Ouvrez le menu ** → À propos de ce Mac**.

- **Puce** : Apple M1, M2, M3 ou génération suivante.
- **macOS** : 15 ou plus récent pour les outils Homebrew utilisés ici.

Prévoyez une connexion Internet, plusieurs gigaoctets d’espace libre pour les
outils et davantage pour votre musique. La première installation peut prendre
plusieurs minutes. Windows, Linux et les Mac Intel ne sont pas couverts par ce guide.

## 2. Ouvrir le Terminal

Appuyez sur **Commande + Espace**, écrivez **Terminal**, puis appuyez sur Entrée.
Le Terminal permet de demander à votre Mac d’exécuter une commande écrite.

Dans ce guide, copiez les commandes dans les encadrés, collez-les dans le
Terminal et appuyez sur **Entrée**. Attendez que la commande se termine avant de
passer à la suivante. N’écrivez pas les trois accents qui entourent les encadrés.

## 3. Installer les outils nécessaires, une seule fois

### Homebrew

Homebrew installe les outils dont MyLib a besoin. Allez sur le site officiel
[brew.sh](https://brew.sh/) et suivez **Install Homebrew**. Vous pouvez utiliser
l’installateur `.pkg` proposé par ce site ou la commande d’installation affichée.

Si un mot de passe est demandé, il s’agit du mot de passe de votre session Mac.
Aucun caractère ne s’affiche lorsque vous le tapez : c’est normal. Validez avec Entrée.

À la fin, suivez les éventuelles **Next steps** affichées par Homebrew pour
l’ajouter au Terminal. Fermez puis rouvrez le Terminal si nécessaire, puis vérifiez :

```sh
brew --version
```

Un numéro de version doit s’afficher. Si vous voyez `command not found`, reprenez
les **Next steps** de l’installation de Homebrew.

### Node.js, Python et FFmpeg

Copiez cette commande :

```sh
brew install node python@3.13 ffmpeg
```

Ces trois outils servent respectivement à ouvrir l’interface, analyser la musique
et lire/convertir les fichiers. Vous n’avez pas besoin d’apprendre à les utiliser.
Le projet utilise **Node.js 24 ou plus récent** et **Python 3.13 précisément**.
L’installateur choisit `python3.13`, même si une autre version de Python existe déjà.
La [fiche Homebrew de Python 3.13](https://formulae.brew.sh/formula/python@3.13)
décrit l’installation de cette version.

Vérifiez qu’ils sont disponibles :

```sh
node --version
python3.13 --version
ffmpeg -version
```

Pour Node, le premier nombre après `v` doit être au moins 24. Pour Python, le
résultat doit commencer par `Python 3.13`. FFmpeg affiche plusieurs lignes : c’est normal.

## 4. Télécharger MyLib sans utiliser Git

1. Ouvrez [le dépôt MyLibApp-dj](https://github.com/Elvinzer/MyLibApp-dj).
2. Cliquez sur le bouton vert **Code**, puis sur **Download ZIP**.
3. Dans le Finder, ouvrez **Téléchargements** et double-cliquez sur le ZIP pour
   le décompresser, si macOS ne l’a pas déjà fait.
4. Déplacez le dossier obtenu, généralement `MyLibApp-dj-main`, dans **Documents**.
   Vous pouvez le renommer `MyLibApp-dj`. Gardez ce dossier ; il contient les scripts
   d’installation et sert aux futures mises à jour.

Un compte GitHub n’est pas nécessaire pour télécharger le ZIP.
Ne cherchez pas un fichier `.app` à l’intérieur : vous allez le créer sur votre Mac.

## 5. Installer MyLib

Dans le Terminal :

1. Écrivez `cd `, avec **un espace après cd**, sans appuyer sur Entrée.
2. Faites glisser le dossier MyLibApp-dj depuis le Finder vers le Terminal.
3. Appuyez sur Entrée. Le Terminal travaille maintenant dans ce dossier.
4. Copiez cette commande et validez :

```sh
zsh Installer.command
```

L’installation télécharge les dépendances, le modèle d’analyse et prépare
l’interface. Gardez la fenêtre ouverte. Le message final indique que MyLib est
installée. Vous pouvez aussi double-cliquer sur `Installer.command` dans le
Finder ; la commande ci-dessus reste utile si macOS refuse d’ouvrir ce type de fichier.

Si une erreur apparaît, arrêtez-vous à cette étape et consultez le dépannage
ci-dessous. Ne lancez pas les commandes suivantes tant que l’installation n’a pas réussi.

## 6. Faire le premier lancement

Dans le même Terminal et le même dossier :

```sh
zsh MyLib.command
```

Le navigateur s’ouvre automatiquement avec MyLib. Si ce n’est pas le cas,
copiez l’adresse indiquée après **MyLibApp est prête**, par exemple
`http://127.0.0.1:3000`, dans la barre d’adresse de votre navigateur.
Le numéro peut changer : utilisez l’adresse réellement affichée.

**Gardez le Terminal ouvert tant que vous utilisez ce mode de lancement.**
Pour arrêter MyLib, cliquez dans le Terminal et appuyez sur **Ctrl+C**.
Fermer seulement l’onglet du navigateur n’arrête pas les services et ne supprime pas votre musique.

Pour les prochains lancements dans ce mode, double-cliquez sur **MyLib.command**.
Vous n’avez pas à relancer l’installateur à chaque fois.

## 7. Facultatif : créer l’application pour le Dock

Cette étape évite de garder une fenêtre Terminal ouverte au quotidien.
Après avoir arrêté le lancement précédent avec Ctrl+C, installez les outils
Apple nécessaires à la création du raccourci natif :

```sh
xcode-select --install
```

Suivez la fenêtre Apple et attendez la fin. Si les outils sont déjà installés,
le Terminal vous l’indiquera ; vous pouvez continuer.
Le logiciel Xcode complet n’est pas nécessaire : il s’agit de ses outils en ligne de commande.

Toujours dans le dossier du projet :

```sh
npm run package:mac
```

Attendez le message **Application installée : /Applications/MyLib.app**.
Ouvrez alors **Finder → Applications → MyLib**, ou son raccourci sur le Bureau.
Vous pouvez la glisser dans le Dock. MyLib ouvre le navigateur et gère ses services
en arrière-plan. **MyLib → Quitter MyLib** les arrête lorsqu’ils ont été démarrés par l’application.

Le bundle est construit pour votre Mac ; ne le copiez pas comme installateur
sur un autre ordinateur. Les outils Node.js, Python et FFmpeg restent nécessaires.
Il s’agit d’une application construite localement, pas d’une application notariée
par Apple. Si macOS la bloque, consultez les
[instructions de sécurité Apple](https://support.apple.com/102445) et vérifiez
la provenance du projet ; le lancement par `MyLib.command` reste disponible.

Si l’écriture dans `/Applications` est refusée, vous pouvez installer uniquement
pour votre session Mac :

```sh
MYLIB_APP_DEST="$HOME/Applications/MyLib.app" npm run package:mac
```

Dans ce cas, ouvrez le dossier `~/Applications` avec **Finder → Aller → Aller au
dossier…**. Aucun raccourci sur le Bureau n’est créé automatiquement pour ce chemin alternatif.

## 8. Importer et préparer votre premier set

| Bouton | Son rôle |
|---|---|
| Importer | Ajouter un morceau depuis son lien individuel YouTube, SoundCloud ou Spotify |
| Écouter | Lire un fichier disponible dans MyLib |
| Corriger | Modifier le style estimé ; ÷2 et ×2 corrigent une ambiguïté de tempo |
| Titres similaires | Chercher autour d’un morceau de votre bibliothèque |
| Ma bibliothèque / Découvrir | Séparer les fichiers possédés du catalogue externe iTunes |
| Affiner | Choisir morceau, artiste ou style et régler la proximité de tempo locale |
| Retenir / Ma sélection | Garder des idées au fil des écoutes, même après redémarrage |
| Importer un lien | Associer à une découverte le lien de la version à récupérer |
| Enregistrer en playlist | Ajouter les fichiers disponibles à une playlist existante ou nouvelle |
| MP3 complet | Exporter le morceau entier, indépendamment de la sélection dans la forme d’onde |

Pour Spotify, un compte **Premium** est nécessaire. Cliquez sur **Connecter
Spotify**, suivez la connexion dans votre navigateur, puis relancez l’import
avec le lien conservé. L’autorisation apparaît sous **Spotify for Desktop**,
nom du client utilisé. Ne collez jamais votre mot de passe Spotify dans MyLib.

Les liens d’albums, de playlists, les directs et les contenus privés ne sont pas
pris en charge. L’accès peut dépendre du pays, du compte et des évolutions de la plateforme.
Importez uniquement des contenus que vous êtes autorisé à récupérer.

Les BPM et styles sont des estimations. Les suggestions iTunes reposent sur les
métadonnées ; écoutez-les avant de préparer vos transitions. Les extraits iTunes
ne deviennent pas des fichiers locaux. Aucun raccordement à Rekordbox n’est fourni.

## 9. Mettre à jour

Le bouton de mise à jour de l’application compare votre **dossier local** à la
copie installée. Il ne télécharge pas automatiquement une nouvelle version depuis GitHub.

Pour une mise à jour depuis le dépôt public :

1. Quittez MyLib.
2. Téléchargez la nouvelle archive ZIP depuis GitHub et décompressez-la.
3. Ouvrez le Terminal dans ce nouveau dossier, comme à l’étape 5.
4. Exécutez `zsh Installer.command`.
5. Si vous utilisez l’application du Dock, exécutez `npm run package:mac`.
6. Rouvrez MyLib. Vos morceaux et playlists sont conservés dans leur dossier séparé.

Si vous avez utilisé Git, vous pouvez faire `git pull --ff-only` dans le dossier
existant à la place du nouveau téléchargement, puis exécuter les mêmes commandes.

## 10. Sauvegarder et trouver de l’aide

Vos données sont dans `~/Library/Application Support/MyLibApp/`.
Dans le Finder : **Aller → Aller au dossier…**, puis collez ce chemin.
Quittez MyLib avant de copier ce dossier sur votre disque de sauvegarde.
Le sous-dossier `spotify/` contient votre session : **ne le publiez pas et ne le partagez pas**.

| Problème | Que faire |
|---|---|
| `command not found: brew`, `node` ou `ffmpeg` | Reprenez l’étape 3, notamment les Next steps de Homebrew, puis rouvrez le Terminal. |
| Python 3.13 est demandé | Exécutez `brew install python@3.13`, puis relancez `zsh Installer.command`. Une autre version ne remplace pas ce prérequis. |
| `no such file: Installer.command` | Le Terminal n’est pas dans le bon dossier. Refaites l’étape 5 avec le glisser-déposer du dossier décompressé. |
| Téléchargement interrompu pendant l’installation | Vérifiez la connexion et l’espace disque, puis relancez `zsh Installer.command`. |
| `Failed to fetch` ou connexion interrompue | Rouvrez MyLib et utilisez la nouvelle adresse qu’elle affiche. Un ancien onglet peut viser un serveur arrêté. Réessayez avec le lien conservé. |
| Spotify ne se connecte pas | Vérifiez Premium, terminez la connexion dans le navigateur et réessayez. La fenêtre d’autorisation expire après 30 minutes ; le port local 5588 doit être libre. |
| Import en erreur | Utilisez Reprendre / Réessayer dans MyLib. Certains liens ou contenus ne sont pas accessibles au moteur d’import. |
| Installation du raccourci impossible | Vérifiez l’installation des outils Apple et que le premier installateur a terminé. Continuez avec MyLib.command en attendant. |

Pour demander de l’aide, ouvrez un [ticket GitHub](https://github.com/Elvinzer/MyLibApp-dj/issues)
avec votre version de macOS, l’étape concernée et le message exact. Les journaux
sont dans le sous-dossier `logs/` des données ; relisez-les et retirez toute
information privée avant de les partager. Ne joignez pas votre bibliothèque,
vos identifiants ou le dossier `spotify/`.

Pour les détails d’analyse et les commandes de développement, consultez le
[guide technique](technical.fr.md).
