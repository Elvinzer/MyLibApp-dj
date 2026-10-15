# MyLib — Titres similaires, étude UX et maquettes V1

Maquettes de conception réalisées avec `ui-ux-pro-max` et une revue indépendante par un agent chargé du design produit musical. Ce dossier contient des artefacts de design, sans modification de l’application.

## Voir les maquettes

Les PNG sont des aperçus. Ouvrir les SVG dans un navigateur pour parcourir les liens entre états. Ils représentent un prototype scénarisé : pas de lecture audio, de recherche, de téléchargement ni de persistance. Les titres, artistes et données sont fictifs.

| Écran | Maquette navigable | Aperçu |
|---|---|---|
| Départ depuis une fiche | [Fiche morceau](01-depart.svg) | — |
| Morceaux possédés | [Ma bibliothèque](02-bibliotheque.svg) | [PNG](02-bibliotheque.png) |
| Titres externes | [Découvrir](03-decouvrir.svg) | [PNG](03-decouvrir.png) |
| Référence et tempo | [Affiner](04-affiner.svg) | [PNG](04-affiner.png) |
| Retenir sans quitter la liste | [Titre retenu](17-retenu-local.svg) | [PNG](17-retenu-local.png) |
| Préparer une playlist | [Sélection locale](11-selection.svg) | [PNG](11-selection.png) |
| Garder une découverte | [Sélection externe](12-selection-externe.svg) | [PNG](12-selection-externe.png) |
| Petit écran | [Mobile, 390 px](10-mobile.svg) | [PNG](10-mobile.png) |

## Parcours à examiner

**Bibliothèque** : fiche → Titres similaires → écouter le premier résultat → revenir à Ma bibliothèque → Retenir le premier résultat → Voir la sélection → Enregistrer dans une playlist → Warm-up du samedi → confirmation.

**Découverte** : Découvrir → Retenir le premier résultat → Voir la sélection → statut À importer → Importer → état disponible → Enregistrer dans une playlist → Warm-up du samedi → confirmation.

Les autres lignes illustrent la composition ; les transitions utilisent le premier résultat. Les liens passent entre des états prédéfinis et ne mémorisent pas les interactions. La navigation mobile mène aux états desktop correspondants ; seule la vue de résultats mobile est maquettée à ce stade. Les réglages dans Affiner sont représentés graphiquement, sans formulaire fonctionnel.

## Direction retenue pour cette V1 de design

L’objectif utilisateur est de préparer une sélection autour d’un morceau, tout en pouvant écouter et retenir rapidement pendant un mix. Rekordbox reste hors périmètre.

1. Une action depuis la fiche, sans saisie préalable. La version exacte du morceau reste visible.
2. Deux onglets selon la disponibilité : Ma bibliothèque et Découvrir. Les sources externes ne deviennent pas de nouveaux onglets.
3. Des listes sobres : pochette, titre/version, artiste, raison étayée, BPM lorsqu’il est connu, écouter et retenir. Aucun pourcentage de compatibilité.
4. Retenir précède le choix d’une playlist. Cette action est réversible, sans navigation automatique dans le produit cible. La sélection conserve les idées externes avant acquisition.
5. Affiner contient deux décisions : prendre pour référence le morceau, l’artiste ou le style ; choisir la tolérance de tempo. Valeurs par défaut : morceau et ±5 BPM. Les BPM inconnus restent explicitement inconnus dans Découvrir.
6. Une playlist MyLib contient les médias disponibles. Les découvertes non importées restent dans la sélection ; dans une sélection mixte, proposer d’enregistrer les titres disponibles avec un libellé indiquant leur nombre, en conservant les autres idées.
7. Un seul lecteur, sans lecture automatique. Écouter remplace explicitement la piste du lecteur ; le morceau de référence reste accessible. Ni les onglets, ni les filtres, ni Retenir ne modifient la lecture.

L’import direct et les extraits sont des hypothèses de parcours. Les sources restent à étudier : afficher Importer uniquement si l’acquisition est réellement supportée, sinon Ouvrir sur [source] et permettre l’association ultérieure d’un fichier importé. Une connexion éventuelle se demande au moment où elle est nécessaire, sans bloquer les résultats locaux.

## Identité et hiérarchie

Continuité avec `app/globals.css` : fond #111214, surface #191b1e, surface relevée #24272b, texte #f5f5f5, secondaire #b5bac4, accent #5ee0b0. Typographie système, alignement des lignes, données de tempo compactes. La menthe signale l’action principale et les états actifs. Les pochettes géométriques sont des placeholders.

La recherche de design system du skill a fourni une direction Flat Design pertinente pour les surfaces et la sobriété. Ses propositions de structure marketing, de palette alternative et de typographie promotionnelle ont été écartées après examen du produit existant. Les principes d’options progressives et de conservation du contexte proviennent des références générales du skill ; la recherche « progressive disclosure » n’a pas renvoyé de correspondance pertinente. La recherche « loading feedback async » a bien fourni des recommandations de chargement stable et de prévention des doubles actions.

## États à couvrir dans le produit

| Situation | Comportement attendu et texte proposé |
|---|---|
| Recherche externe en cours | Garder Ma bibliothèque utilisable ; squelette stable dans Découvrir et « Recherche de nouveaux titres… ». |
| Aucun résultat local | « Aucun titre dans cette plage de tempo. » Action explicite « Élargir à ±10 BPM » ; accès à Découvrir. |
| Aucun résultat externe | « Aucun titre trouvé pour cette référence. » Action Affiner. |
| Service externe indisponible | « La découverte est momentanément indisponible. » Réessayer ; bibliothèque et sélection utilisables. |
| Extrait absent | Texte « Extrait indisponible » et action Ouvrir sur la source si possible ; Retenir reste disponible. |
| Import en cours | « Import en cours… », progression quand mesurable, annulation ; autres titres utilisables. |
| Import échoué | Garder l’idée dans la sélection ; message de cause et Réessayer. |
| Titre déjà possédé | « Déjà dans MyLib », accès au fichier local ; ne pas réimporter. Vérifier la version, pas seulement le titre. |
| Ajout à une playlist | Confirmation nommant la playlist, Annuler ; continuer l’exploration. |
| Sélection vide | « Vos prochaines idées commencent ici. » Action Continuer l’exploration. |
| Changement de référence | Conserver sélection et historique ; retour à la référence précédente avec sa position et ses critères. |

Ces états sont spécifiés ici, pas tous représentés visuellement dans cette V1.

## Revue UX et critères d’acceptation

La revue indépendante a identifié le risque de multiplier recherche, acquisition et gestion de playlists dans chaque ligne. La V1 adopte donc Retenir comme action commune aux deux sources, puis traite acquisition et playlist dans la sélection.

- Accéder aux suggestions depuis une fiche en une action, sans formulaire préalable.
- Écouter et retenir demandent chacun une action ; aucun contrôle essentiel au survol uniquement.
- Retenir laisse la liste et la lecture en place ; un retour visuel permet d’annuler.
- Changer d’onglet conserve la sélection, la lecture, les critères et la position propre à chaque liste.
- Distinguer fichier disponible, découverte, extrait et sélection sans dépendre de la couleur.
- Raisons de suggestion limitées aux données connues ; pas de groove, énergie ou tonalité inventés.
- Clavier complet, noms accessibles, focus visible, restauration du focus à la fermeture d’Affiner ou d’un dialogue.
- Cibles de 44 px minimum ; lecteur et éventuel bandeau de sélection ne masquent aucun contrôle au focus.
- Vérifier contraste des textes et contrôles, zoom, petits écrans et réduction des animations pendant l’implémentation.

## Vérification effectuée

- SVG analysés comme XML ; destinations internes contrôlées.
- Ouverture et rendu des vues principales dans Chromium via agent-browser.
- Navigation cliquée de Ma bibliothèque vers Découvrir, puis vers la sélection externe ; revue des liens et labels avec snapshot.
- Inspection visuelle des captures desktop 1440 × 1000 et mobile 390 × 1080 ; vérification complémentaire du parcours Retenir après revue.
- Contrastes textuels calculés pour les couleurs utilisées dans les vues principales.

Cela valide les artefacts et le parcours illustratif, pas une interface fonctionnelle, un audit d’accessibilité complet ou un test d’utilisabilité auprès d’un DJ. Le runtime Next.js et le moteur de recommandation n’ont pas été modifiés ni testés pour cette étude.

## Points à éprouver avant implémentation

Tester avec l’utilisateur trois tâches : retenir trois morceaux locaux, conserver une découverte sans l’importer, puis constituer une playlist de fichiers disponibles. Observer si la distinction sélection / playlist est comprise et si Affiner est trouvé sans explication. La qualité des recommandations, les catalogues externes et la disponibilité réelle des extraits feront l’objet d’une étude technique distincte.
