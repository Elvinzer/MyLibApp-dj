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
   C’est la fenêtre du navigateur qui affiche MyLib ; gardez aussi la fenêtre
   Terminal ouverte en arrière-plan.

Le code de l’application se trouve dans `~/Applications/MyLibApp`. Les morceaux,
playlists, analyses et réglages de connexion Spotify restent dans
`~/Library/Application Support/MyLibApp/`.

## Retrouver et relancer MyLib

Après l’installation, le code se trouve dans **Applications → MyLibApp**, à
l’intérieur de votre dossier personnel. Ce n’est pas le dossier Applications
principal du Mac.

Pour les prochains lancements, dans le Finder :

1. Choisissez **Aller → Dossier de départ**.
2. Ouvrez le dossier **Applications**, puis **MyLibApp**.
3. Double-cliquez sur **MyLib.command**. Une fenêtre Terminal démarre MyLib et
   votre navigateur affiche l’application.

Si vous ne voyez pas **Applications**, choisissez **Aller → Aller au dossier…**,
collez `~/Applications/MyLibApp`, puis appuyez sur Entrée. Vous pouvez aussi
utiliser le raccourci **Maj + Commande + G** dans le Finder et coller ce chemin.

Gardez la fenêtre Terminal ouverte pendant l’écoute. Fermer seulement l’onglet du
navigateur ne suffit pas à arrêter MyLib. Pour arrêter MyLib, cliquez dans la
fenêtre Terminal et appuyez sur **Ctrl+C**.

## Mettre à jour ou réparer

1. Si MyLib est ouverte, cliquez dans sa fenêtre Terminal et appuyez sur
   **Ctrl+C** pour l’arrêter.
2. Dans Terminal, copiez et exécutez de nouveau la même commande :

   ```sh
   curl -fsSL https://raw.githubusercontent.com/Elvinzer/MyLibApp-dj/main/scripts/install-mac.sh | /bin/bash
   ```

Elle récupère la version la plus récente du projet, réinstalle ses dépendances
et relance MyLib. Vos morceaux, playlists, analyses et connexions Spotify restent
conservés. Cette commande peut également réparer une installation interrompue.

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
