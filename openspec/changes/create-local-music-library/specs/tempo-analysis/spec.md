## Purpose

Estimer le tempo global et local des morceaux et des sets, puis afficher automatiquement les résultats de la plage sélectionnée sans interrompre la lecture.

## ADDED Requirements

### Requirement: BPM global automatique

L'application SHALL calculer à l'import un BPM moyen estimé à partir des passages rythmiquement exploitables et afficher une plage habituelle estimée ainsi qu'un état stable, variable ou incertain. Le silence MUST être exclu plutôt que présenté à 0 BPM.

#### Scenario: Tempo constant
- **WHEN** un morceau synthétique stable à 128 BPM est analysé
- **THEN** le BPM global est à moins de 2 BPM de 128 après désambiguïsation et est libellé comme estimation

#### Scenario: Set variable
- **WHEN** un fichier à deux passages 120 et 140 BPM est analysé
- **THEN** le résultat global indique une variation et les valeurs des deux passages ne sont pas remplacées par un seul tempo partout

#### Scenario: Silence
- **WHEN** un média ne fournit pas de support rythmique suffisant
- **THEN** le résultat indique un rythme non déterminable plutôt qu'une valeur certaine ou 0 BPM

### Requirement: Sélection dynamique

L'application SHALL proposer deux bornes temporelles sur la forme d'onde et afficher début, fin, durée et BPM estimé de la sélection. Le résultat MUST se mettre à jour pendant le déplacement, sans bouton, rechargement, nouvelle récupération ou attente de relâchement.

#### Scenario: Déplacement continu
- **WHEN** l'analyse est prête et une poignée est déplacée
- **THEN** le surlignage et les temps suivent le geste et la dernière valeur BPM est affichée sous 200 ms au p95 sur un set de 2 h sur le Mac de référence documenté

#### Scenario: Changement rapide
- **WHEN** plusieurs changements de bornes se succèdent rapidement
- **THEN** seul le résultat correspondant aux dernières bornes reste affiché

#### Scenario: Deux tempos
- **WHEN** la sélection passe de la première moitié 120 BPM à la seconde moitié 140 BPM d'une fixture
- **THEN** le résultat suit le tempo de chaque moitié avec une erreur maximale de 2 BPM sur les passages stables après désambiguïsation, et le BPM global reste visible et inchangé

### Requirement: Bornes et fiabilité

Les bornes MUST rester dans la durée du morceau avec début inférieur à fin et au moins 1 s entre elles. Une sélection inférieure à 8 s ou sans rythme exploitable SHALL indiquer une durée insuffisante ou un rythme incertain au lieu d'afficher une certitude. La résolution d'analyse MUST être expliquée dans une aide accessible.

#### Scenario: Passage trop court
- **WHEN** une sélection de 3 s est définie
- **THEN** sa durée est affichée et le panneau indique que la plage est trop courte pour une estimation fiable

#### Scenario: Sélection hors limites
- **WHEN** une borne est déplacée au-delà du fichier ou de l'autre borne
- **THEN** la borne est limitée à une valeur valide sans inversion de la sélection

#### Scenario: Sélection mixte
- **WHEN** la sélection traverse un changement réel de tempo
- **THEN** le panneau peut afficher un tempo moyen estimé avec l'état variable plutôt que présenter un tempo constant certain

### Requirement: Corrections de tempo

L'application SHALL proposer ÷2, ×2 et réinitialisation avec facteurs limités à 0.5, 1 et 2. La correction globale MUST être persistée et utilisée pour l'export ; celle de la sélection MUST rester indépendante et être remise à zéro au changement de morceau.

#### Scenario: Correction globale
- **WHEN** 128 BPM est corrigé en 64 BPM puis l'app relancée
- **THEN** 64 BPM est conservé comme valeur globale corrigée sans modifier les données brutes de l'analyse

#### Scenario: Correction locale
- **WHEN** le BPM de la sélection est doublé
- **THEN** seule sa valeur affichée change et le BPM global/export reste inchangé
