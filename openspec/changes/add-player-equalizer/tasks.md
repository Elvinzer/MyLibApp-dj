## 1. Conception UX et faisabilité

- [x] 1.1 Lire les guides Next.js locaux pertinents et les skills UI/UX et next-dev-loop avant toute modification applicative.
- [x] 1.2 Produire une maquette desktop/mobile couvrant activation, presets, bandes repliées/dépliées, état modifié et gestion des presets personnels.
- [x] 1.3 Faire revoir la maquette par un agent dédié UX/design ; vérifier distinction fermer/désactiver/remettre à plat, accès mobile, clavier et zoom, puis intégrer les corrections.
- [x] 1.4 Réaliser un spike Web Audio dans l'environnement cible : initialisation sur geste, effets React répétés, fichiers locaux, CORS des extraits, repli direct et reprise local/extrait/local ; documenter le routage retenu.

## 2. Traitement audio et presets

- [x] 2.1 Créer le moteur à dix bandes avec cycle de vie stable, rampes de transition et activation indépendante sans perte de position ni de boucle.
- [x] 2.2 Implémenter la compensation selon la réponse cumulée et la protection de niveau ; mesurer les crêtes sur signaux plein niveau et multitonaux, puis documenter les limites.
- [x] 2.3 Définir les dix presets et leurs descriptions ; calibrer les courbes sur un corpus musical varié et consigner les écoutes et limites.
- [x] 2.4 Implémenter et vérifier la lecture directe de secours pour les sources ou environnements incompatibles, avec indication explicite et restauration du traitement au retour local.

## 3. État et interface

- [x] 3.1 Ajouter la persistance locale versionnée, validation des données, état modifié et gestion explicite des erreurs de stockage.
- [x] 3.2 Ajouter création, renommage, remplacement explicite et suppression des presets personnels, avec validation des noms et conservation de la courbe après suppression du preset actif.
- [x] 3.3 Intégrer le bouton permanent et le panneau responsive validé, avec presets prioritaires et dix bandes accessibles à la demande.
- [x] 3.4 Intégrer les contrôles clavier et numériques, focus et fermeture, indication d'activation et de compensation, ainsi que les comportements distincts de fermeture, désactivation et remise à plat.

## 4. Vérification

- [x] 4.1 Vérifier par tests ciblés le moteur audio, les transitions, la compensation, la restauration des préférences et les erreurs de stockage ; vérifier que les fichiers et analyses ne sont pas modifiés.
- [x] 4.2 Effectuer la vérification runtime avec `/_next/mcp` et agent-browser conformément au skill next-dev-loop : compilation, erreurs runtime, comportements React et interactions concernées. Si les prérequis manquent, le signaler et arrêter cette vérification sans la déclarer réussie.
- [x] 4.3 Faire revoir les parcours réalisés par un agent dédié UX/design : choisir un preset, comparer avant/après, modifier une bande, enregistrer et restaurer ; vérifier mobile, clavier, focus, contraste et zoom à 200 %.
- [x] 4.4 Vérifier dans le conteneur macOS lecture/pause, changement de morceau, navigation temporelle, boucle, volume, suspension/reprise et transitions avec extraits distants ; documenter les résultats et limites réelles avant livraison.
