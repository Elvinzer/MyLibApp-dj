## Purpose

Fournir une écoute continue des médias locaux et une navigation précise dans leur forme d’onde, avec sélection et boucle de passages.

## ADDED Requirements

### Requirement: Lecteur persistant

L'application SHALL fournir un seul lecteur avec lecture/pause, temps écoulé/durée, déplacement, volume, précédent et suivant lorsque disponibles. La navigation interne MUST conserver la lecture ; aucun audio MUST démarrer sans action de lecture initiale.

#### Scenario: Navigation pendant lecture
- **WHEN** un morceau joue et l'utilisateur ouvre une autre playlist ou un détail
- **THEN** la même lecture continue à la même position avec un état visible dans le lecteur fixe

#### Scenario: Rechargement
- **WHEN** la page est rechargée après une lecture
- **THEN** le titre et la position peuvent être restaurés mais le lecteur reste en pause

#### Scenario: Erreur média
- **WHEN** un média manque ou ne peut être décodé
- **THEN** une erreur est visible et les commandes ne prétendent pas que le morceau joue

### Requirement: Forme onde et navigation

L'application SHALL afficher une forme d'onde navigable, une tête de lecture et une sélection visuellement distinctes. Un set de 2 h MUST être consultable sans charger son audio décodé intégral dans la mémoire du navigateur. Zoom et déplacement temporel SHALL permettre d'ajuster les bornes.

#### Scenario: Chercher un instant
- **WHEN** l'utilisateur clique dans la forme d'onde
- **THEN** la tête de lecture rejoint l'instant choisi sans modifier les bornes

#### Scenario: Modifier sélection
- **WHEN** l'utilisateur déplace une poignée
- **THEN** la sélection change sans déplacer implicitement la tête de lecture hors du comportement de boucle actif

### Requirement: Lecture et boucle de sélection

L'application SHALL proposer Écouter la sélection et un contrôle explicite de boucle. Sans boucle, la lecture MUST continuer au-delà de la sélection jusqu'à la fin du morceau.

#### Scenario: Boucle active
- **WHEN** la tête atteint la fin d'une sélection dont la boucle est active
- **THEN** la lecture revient au début de cette sélection

#### Scenario: Bornes pendant boucle
- **WHEN** les bornes changent pendant la lecture en boucle
- **THEN** les nouvelles limites sont utilisées et une tête hors sélection revient au début

#### Scenario: Boucle désactivée
- **WHEN** la tête atteint la fin de sélection sans boucle
- **THEN** la lecture continue normalement sans retour automatique
