## Why

MyLib permet d'écouter sa bibliothèque mais ne permet pas d'adapter le rendu au casque, aux enceintes ou aux préférences de la personne. Un égaliseur avec presets et réglages personnels apporte cette souplesse tout en gardant une écoute simple.

## What Changes

- Ajouter un égaliseur global à dix bandes, ajustable pendant l'écoute, avec activation indépendante et conservation des réglages.
- Fournir des presets Neutre, Rock, Techno, House, Hip-hop, Pop, Voix, Basses renforcées, Basses réduites et Aigus adoucis ; calibrer leurs courbes par écoute avant livraison.
- Permettre de créer, renommer et supprimer des presets personnels sans modifier les presets fournis.
- Intégrer au lecteur un panneau donnant la priorité aux presets et révélant les réglages avancés à la demande, adapté au mobile et accessible au clavier.
- Distinguer fermeture, désactivation et remise à plat ; signaler les réglages modifiés et gérer la marge de niveau audio.
- Prévoir une revue UX/design sur maquette et une vérification des parcours dans l'application.

## Capabilities

### New Capabilities

- `player-equalizer`: traitement audio global, presets, persistance locale et interface accessible de personnalisation du son.

### Modified Capabilities

Aucune.

## Impact

Lecteur persistant dans `app/library.tsx`, styles dans `app/globals.css`, futur module de traitement Web Audio et stockage local des préférences. Vérifier la compatibilité des extraits distants et du conteneur macOS. Aucun traitement des fichiers originaux, des exports ou de l'analyse BPM/style ; aucun changement automatique de preset selon le genre. Le classement de la bibliothèque reste une évolution distincte.
