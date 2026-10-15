## Purpose

Offrir une interface française de bibliothèque musicale agréable sur Mac, centrée sur les formes d’onde et accessible sans compte ni apprentissage imposé.

## ADDED Requirements

### Requirement: Structure visuelle

L'application SHALL utiliser une interface sombre cohérente avec navigation latérale, bibliothèque à pochettes, détail de morceau et lecteur persistant. L'état consulté et le morceau joué MUST être distinguables. Les fonctions sociales de la capture de référence MUST rester hors de la V1.

#### Scenario: Première bibliothèque vide
- **WHEN** aucun morceau n'est importé
- **THEN** un état vide explique l'import et propose immédiatement le champ de lien sans onboarding ni login

#### Scenario: Détail
- **WHEN** un morceau est ouvert
- **THEN** sa forme d'onde agrandie, les bornes, BPM global et BPM sélection sont identifiables sans ouvrir plusieurs menus

### Requirement: Actions et retours état

Les actions principales SHALL rester explicites et les actions secondaires regroupées dans un menu accessible. Chargement, succès, indisponibilité et erreur MUST avoir des retours adaptés, sans effacement des entrées utiles ni pourcentages inventés.

#### Scenario: Erreur import
- **WHEN** un import échoue
- **THEN** une erreur persistante proche de l'import conserve le lien et indique une action de reprise adaptée

#### Scenario: Ajout playlist
- **WHEN** un titre est ajouté à une playlist
- **THEN** un retour de succès confirme la playlist concernée sans interrompre la lecture ni changer de page

### Requirement: Clavier et accessibilité

Toutes les fonctions SHALL être opérables au clavier et les gestes de drag MUST avoir une alternative. Les deux bornes MUST avoir noms, valeurs et contrôles accessibles. Contraste texte MUST atteindre 4.5:1 et états/focus 3:1 ; reduced-motion MUST être respecté. Les informations MUST ne pas reposer seulement sur la couleur.

#### Scenario: Sélection sans souris
- **WHEN** l'utilisateur ajuste les bornes avec le clavier ou les champs horaires
- **THEN** la sélection et son BPM se mettent à jour automatiquement comme au drag

#### Scenario: Lecteur clavier
- **WHEN** Espace est pressé hors champ éditable et dialogue
- **THEN** la lecture est basculée sans détourner les raccourcis des champs et du système

#### Scenario: VoiceOver
- **WHEN** le résultat de sélection change rapidement
- **THEN** les contrôles restent nommés et les annonces du résultat attendent la stabilisation au lieu de saturer la lecture vocale

### Requirement: Confort dans une fenêtre Mac

L'interface SHALL rester utilisable à 1024×768 et 1440×900, à une largeur de fenêtre de 768 px et avec un zoom texte de 200 %. Le lecteur fixe MUST ne masquer aucun contrôle ni focus. Les polices et composants indispensables MUST fonctionner hors réseau après installation.

#### Scenario: Petite fenêtre
- **WHEN** la fenêtre est réduite à 768 px de large
- **THEN** la navigation se replie si nécessaire et lecture, sélection, import et playlists restent accessibles

#### Scenario: Focus près du bas
- **WHEN** le focus rejoint une action en bas de liste
- **THEN** l'action reste visible au-dessus du lecteur fixe
