# MyLibApp-dj

**Français** · [English](README.en.md)

Votre bibliothèque musicale personnelle pour préparer vos sets sur Mac : import
YouTube, SoundCloud et Spotify, écoute locale, analyse du tempo (BPM), styles,
playlists, recherche de titres similaires et export MP3.

**Commencez ici : [installer et lancer MyLib, pas à pas](docs/installation.fr.md).**
Aucune connaissance en programmation et aucun compte GitHub ne sont nécessaires.
La préparation initiale nécessite quelques commandes guidées ; une fois le
raccourci Mac créé, l’application s’ouvre par double-clic.

## Ce qu’il vous faut

- Un **Mac avec une puce Apple Silicon** (M1, M2, M3 ou génération suivante).
- **macOS 15 ou plus récent** pour le parcours Homebrew documenté.
- Une connexion Internet pour installer les outils et importer des morceaux.
- **Node.js 24+**, **Python 3.13** et **FFmpeg** : le guide explique leur installation.
- Un compte **Spotify Premium uniquement si vous utilisez l’import Spotify**.

Windows, Linux et les Mac Intel ne sont pas des plateformes validées pour cette
version. Le dépôt contient le code source ; aucun installateur universel ou
application Mac précompilée n’est fourni.

## Installation rapide

Pour les personnes déjà à l’aise avec le Terminal :

```sh
# Après installation de Homebrew :
brew install node python@3.13 ffmpeg

git clone https://github.com/Elvinzer/MyLibApp-dj.git
cd MyLibApp-dj
zsh Installer.command
zsh MyLib.command
```

Le navigateur s’ouvre automatiquement. Gardez le Terminal ouvert pendant
l’utilisation et utilisez **Ctrl+C** pour arrêter l’application.

Pour créer ensuite **MyLib.app** dans Applications et un raccourci sur le Bureau :

```sh
xcode-select --install
# Attendez la fin de l’installation des outils Apple avant la commande suivante.
npm run package:mac
```

Si les outils Apple sont déjà installés, la première commande vous l’indiquera.
Le [guide détaillé](docs/installation.fr.md) explique chaque étape, y compris la
méthode sans Git avec le bouton **Code → Download ZIP** de GitHub.

## Premier morceau

1. Ouvrez MyLib et collez le lien d’un **morceau individuel** YouTube, SoundCloud
   ou Spotify, puis cliquez sur **Importer**.
2. Pour Spotify, utilisez **Connecter Spotify**, autorisez la connexion dans le
   navigateur, puis cliquez à nouveau sur **Importer**. Les liens `intl-fr`
   sont acceptés ; les albums et playlists ne le sont pas.
3. Attendez la préparation, puis cliquez sur **Écouter**. Cliquez sur le titre
   pour voir la forme d’onde, le tempo et le style estimés.
4. **Titres similaires** distingue **Ma bibliothèque** et **Découvrir**.
   **Affiner** permet de partir du morceau, de l’artiste ou du style.
5. **Retenir** garde une idée dans **Ma sélection**, même après redémarrage.
   Enregistrez ensuite les morceaux disponibles dans une playlist.
6. Utilisez **MP3 complet** pour exporter le fichier entier, ou **Afficher dans
   le Finder** pour retrouver sa source locale.

La découverte externe utilise les métadonnées du catalogue iTunes. Ses extraits
restent en streaming ; ses suggestions ne garantissent ni similarité sonore,
ni compatibilité harmonique. Un titre externe nécessite un lien d’import pris
en charge pour obtenir un fichier dans MyLib. Rekordbox n’est pas intégré.

## Où se trouve ma musique ?

Les fichiers et playlists restent sur votre Mac dans :

```text
~/Library/Application Support/MyLibApp/
```

Dans le Finder, choisissez **Aller → Aller au dossier…** et collez ce chemin.
Pour sauvegarder votre bibliothèque, quittez MyLib puis copiez ce dossier sur
un disque de sauvegarde. Les fichiers audio ne sont pas publiés sur GitHub.

L’analyse audio est locale. **Découvrir** envoie les mots-clés de recherche à
Apple ; les imports contactent la plateforme choisie. Les identifiants Spotify
restent dans le sous-dossier privé `spotify/` : ne le partagez pas.

## Aide et documentation

- [Installation, lancement, mises à jour et dépannage — français](docs/installation.fr.md)
- [Installation, launching, updates and troubleshooting — English](docs/installation.en.md)
- [Fonctionnement détaillé et commandes de développement — français](docs/technical.fr.md)
- [Signaler un problème](https://github.com/Elvinzer/MyLibApp-dj/issues) : indiquez
  la version de macOS, l’étape concernée et le message d’erreur, sans identifiants.

Pour développer : `npm run dev`. Pour vérifier le code : `npm test`,
`npm run typecheck`, `npm run build`. Les contrôles navigateur avancés utilisent
agent-browser, qui n’est pas nécessaire pour installer ou utiliser MyLib.

## Utilisation et composants tiers

Importez uniquement des contenus que vous êtes autorisé à récupérer et respectez
les conditions des plateformes. L’accès à celles-ci peut évoluer.

Le modèle de style est téléchargé et vérifié à l’installation ; ses poids ne
sont pas inclus dans Git. Il est distribué par MTG/UPF sous **CC BY-NC-SA 4.0**,
avec une restriction d’usage commercial : voir [son attribution](backend/models/README.md)
et [sa licence](backend/models/LICENSE). Le client Spotify et les autres
composants conservent leurs licences respectives. La visibilité publique de ce
dépôt ne remplace pas une licence de réutilisation du code du projet.
