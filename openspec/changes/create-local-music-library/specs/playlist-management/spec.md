## Purpose

Organiser les morceaux conservés sur le Mac dans plusieurs playlists persistantes et les écouter dans un ordre contrôlé par l’utilisateur.

## ADDED Requirements

### Requirement: Gestion playlists

L'application SHALL créer, renommer et supprimer des playlists persistantes avec un nom non vide. Supprimer une playlist MUST confirmer l'action et conserver les morceaux dans la bibliothèque.

#### Scenario: Créer et relancer
- **WHEN** une playlist est créée puis l'application relancée
- **THEN** son nom et son contenu sont conservés

#### Scenario: Supprimer playlist
- **WHEN** la suppression d'une playlist est confirmée
- **THEN** la playlist disparaît et ses morceaux restent accessibles dans la bibliothèque et les autres playlists

### Requirement: Appartenance multiple

Un morceau SHALL appartenir à plusieurs playlists sans copie de son audio. L'ajout répété à une même playlist MUST être idempotent. Retirer un morceau d'une playlist MUST conserver son fichier.

#### Scenario: Ajout multiple
- **WHEN** le même morceau est ajouté à deux playlists puis à nouveau à la première
- **THEN** chaque playlist contient une seule occurrence et le média n'est pas dupliqué

#### Scenario: Retrait
- **WHEN** un morceau est retiré d'une playlist
- **THEN** sa présence dans les autres playlists et la bibliothèque ne change pas

### Requirement: Ordre manuel

L'application SHALL permettre le réordonnancement par glisser-déposer et commandes accessibles monter/descendre, et conserver cet ordre. Une recherche MUST filtrer l'affichage sans modifier cet ordre.

#### Scenario: Ordre persistant
- **WHEN** un morceau est déplacé puis la playlist rouverte
- **THEN** il reste à sa nouvelle position

#### Scenario: Clavier
- **WHEN** l'utilisateur utilise la commande monter ou descendre au clavier
- **THEN** le morceau change d'une position avec focus préservé et retour accessible

### Requirement: Lecture enchaînée

Lancer une playlist SHALL jouer un instantané de son ordre puis enchaîner les titres jusqu'à la fin sans répétition implicite. Modifier ensuite la playlist MUST s'appliquer à la prochaine lecture. Un titre supprimé de la bibliothèque MUST être retiré de la file active.

#### Scenario: Enchaînement
- **WHEN** un titre se termine et un suivant existe dans la file
- **THEN** le suivant démarre et le lecteur met à jour titre et position

#### Scenario: Fin de file
- **WHEN** le dernier titre se termine
- **THEN** la lecture s'arrête

#### Scenario: Suppression titre joué
- **WHEN** le titre joué est supprimé de la bibliothèque après confirmation
- **THEN** la lecture s'arrête proprement et le lecteur ne référence plus un média effacé
