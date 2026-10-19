# MyLibApp-dj

**Français** · [English](README.en.md)

Votre bibliothèque musicale personnelle pour préparer vos sets sur Mac : import
YouTube, SoundCloud et Spotify, écoute locale, analyse du tempo (BPM), styles,
playlists, recherche de titres similaires et export MP3.

**Commencez ici : [installer et lancer MyLib](docs/installation.fr.md).**
Aucune connaissance en programmation ni aucun compte GitHub ne sont nécessaires.
Une seule commande installe MyLib et les outils dont elle a besoin ; l’application
démarre automatiquement à la fin.

## Ce qu’il vous faut

- Un **Mac avec une puce Apple Silicon** (M1, M2, M3 ou génération suivante).
- **macOS 15 ou plus récent**.
- Une connexion Internet pour installer les outils et importer des morceaux.
- Node.js, Python 3.13 et FFmpeg sont installés par la commande de configuration.
- Un compte **Spotify Premium uniquement si vous utilisez l’import Spotify**.

Windows, Linux et les Mac Intel ne sont pas des plateformes validées pour cette
version. L’installation récupère le code source public et configure MyLib sur
votre Mac.

## Installation rapide

Ouvrez Terminal, copiez cette ligne et appuyez sur Entrée :

```sh
curl -fsSL https://raw.githubusercontent.com/Elvinzer/MyLibApp-dj/main/scripts/install-mac.sh | /bin/bash
```

L’application démarre automatiquement. Pour la retrouver plus tard, dans le
Finder choisissez **Aller → Dossier de départ → Applications → MyLibApp**, puis
double-cliquez sur **MyLib.command**. Ce dossier Applications se trouve dans
votre dossier personnel. Laissez la fenêtre Terminal ouverte pendant l’écoute ;
**Ctrl+C** arrête MyLib. Selon votre Mac, Apple peut demander d’installer ses
outils de ligne de commande et Homebrew peut demander le mot de passe de votre
session. Le [guide d’installation](docs/installation.fr.md) illustre le parcours
et explique les mises à jour. Pour actualiser MyLib, arrêtez-la avec **Ctrl+C**
et relancez la même commande d’installation ; vos données sont conservées.

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

## Ajuster le son

Ouvrez **Égaliseur** dans le lecteur, activez-le et choisissez un preset
(Rock, Techno, House, Voix…). **Réglage personnalisé** donne accès aux dix
bandes, au clavier ou par saisie numérique. **Enregistrer sous…** conserve
votre propre preset ; un preset personnel peut être renommé, remplacé ou supprimé.

Désactiver permet de comparer sans perdre la courbe ; **Remettre à plat** remet
les bandes à zéro. Fermer le panneau conserve le réglage. Les préférences sont
conservées dans ce navigateur, pour cette adresse locale. Le niveau est ajusté
pour limiter la saturation. Si un extrait ne permet pas le traitement, il reste
lisible sans effet et MyLib le signale. Les fichiers et exports restent intacts.

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
