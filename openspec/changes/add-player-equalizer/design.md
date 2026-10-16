## Context

Voir `proposal.md` pour la motivation. Le lecteur persistant de `app/library.tsx` utilise un élément audio partagé entre fichiers locaux et extraits distants, avec volume, navigation, recherche temporelle et boucle. Aucun graphe Web Audio n'existe. Le conteneur `.volume` est masqué sous 850 px : l'accès à l'égaliseur doit être indépendant.

La revue par un agent dédié UX/design recommande la divulgation progressive des bandes, des actions sans ambiguïté et des commandes mobiles différentes des colonnes desktop. Ce sont des recommandations de conception, pas des résultats de tests utilisateurs.

## Goals / Non-Goals

**Goals:** traitement temps réel local, état global stable, préservation de la lecture, commandes compréhensibles et accessibles.

**Non-Goals:** égaliseur paramétrique, effets spatiaux, profils de casque, égalisation automatique selon le style, attribution par morceau, modification des fichiers ou exports, synchronisation entre appareils.

## Decisions

### 1. Égaliseur graphique et moteur audio séparé

Prévoir un module client encapsulant une source Web Audio unique pour l'élément audio existant, dix filtres et un gain de compensation. Bandes proposées : 31,5 / 63 / 125 / 250 / 500 Hz puis 1 / 2 / 4 / 8 / 16 kHz, plage de −12 à +12 dB et pas de 0,5 dB. Le volume du lecteur garde son rôle.

Créer/réactiver le contexte dans un geste utilisateur ; ne jamais recréer la source au changement de morceau ni lors d'un rendu React. Prévoir un cycle de vie compatible avec les effets React répétés. Appliquer les variations par rampes courtes, y compris activation et désactivation. Le mode désactivé conserve les réglages mais fournit une réponse neutre. Alternative écartée : réencoder les médias, coûteux et incompatible avec l'ajustement instantané.

### 2. Niveau audio maîtrisé

Réduire automatiquement le gain avant filtrage en fonction de la réponse cumulée de la chaîne, avec une marge documentée et une détection de dépassement. Ne pas prendre seulement le plus grand curseur comme estimation : les bandes peuvent se cumuler. Définir et mesurer le comportement sur signaux proches du plein niveau, signaux multitonaux et musique avant livraison. Si une protection de crêtes complémentaire est nécessaire, la mesurer et la documenter ; ne pas présenter un compresseur standard comme une garantie absolue d'absence d'écrêtage.

La compensation peut rendre l'écoute moins forte : afficher « Niveau ajusté pour limiter la saturation ». Garder la comparaison activé/désactivé honnête, sans augmentation volontaire du volume du preset. Alternative écartée : préampli positif exposé d'emblée, qui rend les réglages plus complexes et augmente le risque de saturation.

### 3. Presets et persistance

Catalogue immuable et versionné de dix presets annoncés dans la proposition. Stocker localement un document versionné : activation, gains, preset de référence et presets personnels identifiés durablement. Démarrage initial désactivé et Neutre. Valider et borner toute donnée restaurée ; une donnée illisible ne bloque pas la lecture. Un échec d'enregistrement doit être signalé, les réglages en cours restant utilisables.

Après modification, afficher « Techno · modifié » ; la référence sert au libellé sans modifier le preset d'origine. « Enregistrer sous… » crée un preset ; modifier un preset personnel demande une action explicite pour le remplacer. Noms non vides et non ambigus avec le catalogue ou les autres presets personnels. Supprimer le preset actif garde la courbe courante comme réglage personnalisé. Préférer le stockage local au backend pour cette préférence d'écoute propre à l'appareil.

### 4. Parcours UX et présentation

Bouton nommé « Égaliseur » près du volume mais hors du conteneur masqué sur mobile, avec état actif textuellement accessible et indication visuelle autre que la couleur seule. Desktop : panneau ancré au-dessus du lecteur. Mobile : feuille modale avec contenu défilant et actions accessibles au-dessus des zones système. Employer les tokens existants plutôt qu'une esthétique de console indépendante.

```text
Égaliseur                              Fermer
[ Activé ]
Preset : [ Techno                     v ]
Renforce l'assise et l'impact rythmique.

[ Réglage personnalisé                 ]
  Graves           Médiums           Aigus
  Bandes, fréquences et valeurs en dB

[ Enregistrer sous… ] [ Remettre à plat ]
```

Les bandes sont repliées au premier affichage. Desktop : curseurs verticaux lisibles ; mobile : liste horizontale de réglages, sans dix colonnes serrées ni défilement latéral. Chaque bande possède un nom, une valeur en dB, une commande au clavier et une saisie numérique alternative au glisser. Réinitialiser une bande est une action explicite accessible.

Fermer conserve le traitement ; désactiver conserve la courbe ; remettre à plat met les bandes à zéro, sélectionne Neutre et garde l'état d'activation. Aucun bouton « Appliquer ». Changer le preset pendant que l'effet est désactivé prépare le réglage sans l'activer ; afficher « Activez pour écouter ce réglage ». Annuler une saisie de nom ne modifie pas le son.

Focus visible, cibles tactiles d'au moins 44 px, contraste vérifié, Escape pour fermer et retour du focus au déclencheur. Piéger le focus seulement dans une présentation réellement modale ; nommer le panneau et annoncer les erreurs sans annoncer chaque variation de curseur en boucle. Vérifier zoom à 200 %, absence de recouvrement par le lecteur et usage sans souris.

### 5. Sources distantes et défaillances

Vérifier les autorisations CORS des extraits avant de connecter une source distante au graphe : une source lisible dans un élément audio peut devenir silencieuse avec Web Audio. Privilégier une route média locale si elle respecte les contraintes du fournisseur ; sinon garder une voie de lecture directe distincte pour les extraits incompatibles et afficher explicitement « Égaliseur indisponible pour cet extrait ». Le traitement des fichiers locaux doit reprendre au retour vers la bibliothèque. Ne pas supposer qu'une déconnexion du graphe rétablit la lecture native d'un élément déjà connecté.

En cas d'indisponibilité Web Audio, maintenir une lecture sans effet et expliquer l'indisponibilité. Conserver la position, la file et les réglages lors des changements de mode. Le choix précis de routage doit être établi par un spike avant intégration dans le lecteur.

## Risks / Trade-offs

- [Saturation et différences de volume] → réponse cumulée, marge et mesures audio ; calibration perceptive des presets.
- [Silence des extraits distants] → spike CORS et chemin direct explicite, vérification des transitions local/extrait/local.
- [Suspension audio dans le conteneur macOS] → tests de reprise, pause, navigation et changement de morceau dans l'environnement cible.
- [Complexité des dix bandes] → presets prioritaires, réglage avancé repliable, descriptions et repères fréquentiels.
- [Courbes de genre subjectives] → presets présentés comme points de départ ; écoute comparative sur un corpus varié.

## Migration Plan

Aucune migration serveur. Ajouter un stockage client distinct et versionné, avec valeurs par défaut compatibles avec les bibliothèques existantes. Un retour à l'ancienne application ignore cette clé sans modifier les médias. Avant implémentation, réaliser la maquette et sa revue UX/design ; avant livraison, valider le moteur audio puis les parcours dans Next.js et le conteneur macOS.

## Open Questions

- Quelles valeurs finales donnent les presets les plus utiles sur le corpus d'écoute ? Les noms et contrôles sont fixés ; les courbes seront calibrées pendant le développement.

## References

- Apple Music : https://support.apple.com/fr-fr/guide/music/-museb684a3de/mac
- VLC : https://docs.videolan.me/vlc-user/desktop/3.0/en/basic/settings/adjustmentsandeffects.html
- Roon et marge de niveau : https://help.roonlabs.com/portal/en/kb/articles/dsp-engine-headroom-management
- Web Audio : https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaElementSource
