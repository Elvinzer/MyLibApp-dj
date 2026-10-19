# Installer et lancer MyLib sur Mac

**Français** · [English](installation.en.md) · [Retour à l’accueil](../README.md)

Cette méthode est prévue pour les Mac Apple Silicon (M1 ou plus récent) avec
macOS 15 ou une version plus récente. Elle installe MyLib ainsi que Node.js,
Python, FFmpeg et les autres éléments nécessaires. Aucun compte GitHub, Git,
Homebrew ou Xcode à installer manuellement n’est nécessaire.

La première installation télécharge plusieurs outils et peut prendre un moment.
Prévoyez plusieurs gigaoctets d’espace libre et une connexion Internet.

## Première installation

1. Ouvrez **Terminal** : appuyez sur **Commande + Espace**, tapez « Terminal »
   et appuyez sur Entrée.
2. Copiez la ligne ci-dessous, collez-la dans Terminal, puis appuyez sur Entrée :

   ```sh
   curl -fsSL https://raw.githubusercontent.com/Elvinzer/MyLibApp-dj/main/scripts/install-mac.sh | /bin/bash
   ```

3. Laissez la fenêtre Terminal ouverte pendant l’installation. Suivez les
   éventuelles demandes de macOS ou de Homebrew :
   - Si une fenêtre Apple propose d’installer les outils de ligne de commande,
     cliquez sur **Installer** et attendez sa fin.
   - Si votre Mac demande le mot de passe de votre session, saisissez-le puis
     appuyez sur Entrée. **Rien ne s’affiche pendant la saisie** ; c’est normal.
   - L’installation télécharge Node.js, Python 3.13, FFmpeg, MyLib et son modèle
     d’analyse. Le Terminal affiche sa progression.
4. Quand l’installation est terminée, MyLib démarre et ouvre votre navigateur.

Le code de l’application se trouve dans `~/Applications/MyLibApp`. Les morceaux,
playlists, analyses et réglages de connexion Spotify restent dans
`~/Library/Application Support/MyLibApp/`.

## Utiliser MyLib

Gardez la fenêtre Terminal ouverte pendant l’écoute. Fermer seulement l’onglet du
navigateur ne suffit pas à arrêter MyLib. Pour arrêter MyLib, cliquez dans la
fenêtre Terminal et appuyez sur **Ctrl+C**.

Pour les lancements suivants, ouvrez dans le Finder le dossier
`~/Applications/MyLibApp`, puis double-cliquez sur **MyLib.command**. Si vous
ne trouvez pas ce dossier, choisissez dans le Finder **Aller → Aller au
dossier…**, saisissez `~/Applications/MyLibApp`, puis appuyez sur Entrée.

## Mettre à jour ou réparer

Relancez la même commande d’installation dans Terminal. Elle récupère la version
la plus récente du projet et réinstalle ses dépendances. Vos morceaux, playlists,
analyses et connexions Spotify restent conservés. Vous pouvez aussi relancer
cette commande si une installation a été interrompue.

Si MyLib est déjà ouverte, arrêtez-la avec **Ctrl+C** avant la mise à jour.

## En cas de problème

- **Une fenêtre Apple apparaît** : acceptez l’installation des outils de ligne
  de commande et attendez qu’elle se termine. Si Terminal indique que le délai
  est dépassé, relancez la même commande.
- **Homebrew demande votre mot de passe** : saisissez le mot de passe de votre
  session Mac. Aucun caractère ne s’affiche à l’écran pendant la saisie.
- **Le téléchargement s’interrompt** : vérifiez la connexion Internet et
  l’espace libre, puis relancez la même commande.
- **Le Terminal indique un dossier MyLib déjà présent** : il a trouvé
  `~/Applications/MyLibApp` sans son marqueur d’installation. Dans le Finder,
  ouvrez votre dossier de départ, puis `Applications`, renommez ou déplacez ce
  dossier existant, et relancez la commande. Aucun fichier n’a été supprimé.
- **MyLib ne démarre pas** : gardez le message d’erreur affiché dans Terminal et
  ouvrez un [ticket GitHub](https://github.com/Elvinzer/MyLibApp-dj/issues).
  Indiquez votre version de macOS et l’étape concernée, sans joindre vos
  identifiants ni le contenu de votre bibliothèque.

Pour sauvegarder votre bibliothèque, quittez MyLib puis copiez
`~/Library/Application Support/MyLibApp/` sur un disque de sauvegarde. Ne partagez
pas le sous-dossier `spotify/`, qui contient les informations de connexion.

Pour les détails d’utilisation et de développement, consultez le
[guide technique](technical.fr.md).
