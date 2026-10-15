## Purpose

Permettre de récupérer et conserver sur le Mac une bibliothèque personnelle de morceaux et de sets, sans compte, avec un traitement observable et reprenable.

## ADDED Requirements

### Requirement: Accès local sans compte

L'application SHALL ouvrir directement la bibliothèque sans inscription, connexion, abonnement ou onboarding bloquant. Les services MUST être accessibles uniquement depuis le Mac.

#### Scenario: Premier lancement
- **WHEN** le lanceur démarre une installation prête
- **THEN** le navigateur ouvre la bibliothèque et le champ d'import sans demander de compte

#### Scenario: Services locaux
- **WHEN** les services sont démarrés
- **THEN** ils écoutent sur loopback et ne sont pas exposés sur le réseau local

### Requirement: Lancement quotidien

Un raccourci macOS SHALL démarrer ou retrouver l'instance de cette installation et ouvrir son URL après vérification de disponibilité. Un prérequis absent MUST produire une explication exploitable.

#### Scenario: Double lancement
- **WHEN** le raccourci est ouvert alors que cette installation fonctionne
- **THEN** l'app existante est ouverte sans dupliquer les services ni interrompre un autre processus

#### Scenario: Installation incomplète
- **WHEN** une dépendance nécessaire est absente
- **THEN** le lancement indique ce qui manque et comment terminer la préparation sans afficher une bibliothèque fictivement prête

### Requirement: Import individuel et identité

L'application SHALL accepter un lien individuel YouTube ou SoundCloud accessible, récupérer son audio et ses métadonnées et créer une entrée persistante. Un même identifiant de source MUST produire au plus une entrée, y compris pendant un import concurrent. Les liens de playlist seule et les lives en cours MUST être refusés avec explication.

#### Scenario: Import réussi
- **WHEN** un lien public pris en charge est importé
- **THEN** le titre, la pochette disponible, la durée et la source sont affichés avec un média local

#### Scenario: Doublon
- **WHEN** un lien court ou canonique désigne un titre déjà présent ou en cours
- **THEN** l'entrée existante est retrouvée sans télécharger une seconde copie

#### Scenario: Vidéo dans une playlist
- **WHEN** un lien contient une vidéo et un paramètre de playlist
- **THEN** seule cette vidéo est importée

#### Scenario: Lien refusé
- **WHEN** un lien est invalide, hors plateforme, privé, indisponible ou nécessite une connexion
- **THEN** un message spécifique explique l'échec, conserve le lien saisi et ne crée pas de morceau prêt

### Requirement: Progression et récupération

L'application SHALL afficher validation, récupération, préparation, analyse et état final sans bloquer la navigation. Elle MUST proposer annulation et reprise selon l'état ; les pourcentages inconnus MUST rester indéterminés.

#### Scenario: Analyse en cours
- **WHEN** le média est prêt mais son analyse ne l'est pas
- **THEN** la lecture et l'export sont utilisables et le BPM reste explicitement en analyse

#### Scenario: Échec analyse
- **WHEN** l'analyse échoue après préparation du média
- **THEN** le fichier reste lisible et exportable et une action de reprise est affichée

#### Scenario: Redémarrage interrompu
- **WHEN** l'app redémarre après interruption d'un traitement
- **THEN** le traitement est identifié comme interrompu et reprenable sans succès fictif ni fichier corrompu présenté comme prêt

#### Scenario: Annulation
- **WHEN** l'utilisateur annule un import avant disponibilité du média
- **THEN** le traitement s'arrête et les fichiers incomplets sont nettoyés sans entrée prête fantôme

### Requirement: Bibliothèque persistante et suppression

L'application SHALL conserver médias, métadonnées, résultats et playlists entre lancements et permettre recherche titre/auteur et tri ajout, titre ou BPM. Supprimer un morceau MUST nécessiter une confirmation indiquant son retrait des playlists et l'effacement local.

#### Scenario: Mode hors réseau
- **WHEN** le réseau est coupé après import et l'app est relancée
- **THEN** les titres conservés restent consultables, lisibles, analysables depuis les résultats locaux et exportables

#### Scenario: Suppression confirmée
- **WHEN** l'utilisateur confirme la suppression d'un morceau
- **THEN** ce morceau disparaît de la bibliothèque et de toutes les playlists et ses fichiers internes sont nettoyés sans toucher aux exports déjà téléchargés

#### Scenario: Échec disque
- **WHEN** le disque est plein ou un fichier est inaccessible
- **THEN** une erreur explicite est affichée et les autres morceaux restent utilisables


### Requirement: Mise à jour locale proposée au lancement

L'application SHALL détecter les changements du code de son projet au lancement et à la réouverture, puis proposer Mettre à jour et ouvrir ou Plus tard. La mise à jour MUST se préparer sans terminal, conserver les médias et playlists et relancer l'app après validation. Les modifications de documentation et de cache MUST ne pas déclencher de mise à jour.

#### Scenario: Code modifié
- **WHEN** une modification fonctionnelle existe dans le projet et l'app est ouverte ou rouverte
- **THEN** une proposition de mise à jour apparaît et son acceptation prépare, installe et relance la nouvelle version sans commande utilisateur

#### Scenario: Reporter la mise à jour
- **WHEN** l'utilisateur choisit Plus tard
- **THEN** l'ancienne version s'ouvre et la proposition peut réapparaître au prochain lancement ou à la prochaine réouverture

#### Scenario: Dossier source absent
- **WHEN** le projet de développement est indisponible
- **THEN** la version installée continue de s'ouvrir sans bloquer l'accès à la bibliothèque

#### Scenario: Échec de mise à jour
- **WHEN** la compilation ou la vérification de démarrage échoue
- **THEN** la version précédente reste disponible ou est restaurée, une erreur compréhensible est affichée et les médias et playlists restent intacts

#### Scenario: Mise à jour déjà en cours
- **WHEN** une seconde tentative intervient pendant la préparation ou l'installation
- **THEN** aucun second remplacement concurrent ne peut démarrer
