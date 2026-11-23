# MyLibApp-dj

**Français** · [English](README.en.md)

MyLib est une bibliothèque musicale pour préparer vos sets DJ. Importez des
morceaux depuis YouTube, SoundCloud ou Spotify, écoutez-les dans votre navigateur,
repérez leur tempo (BPM), créez des playlists et exportez vos morceaux en MP3.

## Installer MyLib

- **Mac Apple Silicon (M1 ou plus récent), avec macOS 15 ou plus récent** —
  [Suivre le guide d’installation Mac](docs/installation.fr.md). Une commande
  installe MyLib et ouvre votre navigateur. Aucun compte GitHub ni connaissance
  en programmation ne sont nécessaires.
- **Windows, Linux ou Mac Intel** — Le dépôt ne fournit pas d’installateur
  pour ces plateformes. Le guide et la commande d’installation sont réservés
  aux Mac compatibles.

## Écouter votre premier morceau

1. Dans MyLib, collez le lien d’un morceau YouTube, SoundCloud ou Spotify.
2. Cliquez sur **Importer**. Pour Spotify, connectez d’abord votre compte
   **Spotify Premium** avec **Connecter Spotify**.
3. Quand le morceau est prêt, cliquez sur **Écouter**. Cliquez sur son titre
   pour voir sa forme d’onde, son tempo et son style estimés.

## Rouvrir, mettre à jour ou réparer MyLib

- Dans le Finder, appuyez sur **Maj + Commande + G**, collez
  `~/Applications/MyLibApp`, puis ouvrez **MyLib.command**.
- Laissez Terminal ouvert pendant l’utilisation. Pour quitter MyLib, cliquez
  dans Terminal et appuyez sur **Ctrl+C**.
- Pour mettre à jour ou réparer MyLib, quittez-la et relancez la commande
  du [guide d’installation](docs/installation.fr.md#mettre-à-jour-ou-réparer).
  Vos morceaux et playlists restent sur votre Mac.

## En savoir plus

- [Dépannage et sauvegarde](docs/installation.fr.md#en-cas-de-problème)
- [Fonctionnalités et commandes de développement](docs/technical.fr.md)
- [Signaler un problème](https://github.com/Elvinzer/MyLibApp-dj/issues)

Importez uniquement les contenus que vous êtes autorisé à récupérer. Le modèle
d’analyse de style est distribué par MTG/UPF sous
[CC BY-NC-SA 4.0](backend/models/LICENSE). Consultez son
[attribution](backend/models/README.md). La visibilité publique de ce dépôt ne
remplace pas une licence de réutilisation du code.
