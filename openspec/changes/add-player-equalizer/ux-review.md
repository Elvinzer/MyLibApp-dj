# Égaliseur — maquettes et revue UX avant implémentation

Revue par l'agent dédié UX/design, le 16 octobre 2026. Couvre les tâches 1.2 et 1.3. Base : `design.md`, spécification `player-equalizer`, lecteur existant et `app/globals.css`. Il s'agit d'une revue de conception ; aucun parcours utilisateur ni rendu applicatif n'a encore été testé.

## Direction visuelle et structure

Réutiliser les tokens MyLib : `--surface` pour le panneau, `--raised` pour les champs, `--text` et `--muted` pour la hiérarchie, `--accent` pour l'action et le focus, `--border` pour les séparateurs. Rayon de 12 px et espacement de 24 px sur ordinateur, 16 px sur mobile ; reprendre le langage du dialogue de correction du style. Éviter une esthétique de table de mixage indépendante, les afficheurs animés et le texte miniature. Corps 14–16 px ; libellés et valeurs ne dépendent pas du survol.

Le bouton du lecteur contient une icône SVG et un nom accessible « Égaliseur, activé » ou « Égaliseur, désactivé ». L'état est visible avec un mot ou symbole distinct, en complément de la couleur. Il reste hors de `.volume`, masqué sous 850 px. Le choix de preset ne déclenche jamais implicitement l'interrupteur.

## Ordinateur — état replié

Panneau ancré au-dessus du lecteur, environ 600 px de large et borné à la largeur disponible ; hauteur limitée à l'espace visible, contenu défilant. Aucun recouvrement du transport. Présentation non modale : la bibliothèque et le lecteur restent utilisables.

```text
┌─────────────────────────────────────────────────────────────┐
│ Égaliseur                                  [Fermer ×]       │
│ [interrupteur OFF] Désactivé                                 │
│ Activez pour écouter ce réglage.                             │
│                                                             │
│ Preset                                                      │
│ [Techno                                                 ▾]  │
│ Renforce l'assise et l'impact rythmique.                      │
│                                                             │
│ [▸ Réglage personnalisé — 10 bandes]                         │
│                                                             │
│ [Enregistrer sous…]                    [Remettre à plat]     │
└─────────────────────────────────────────────────────────────┘
                 Lecteur : transport, position, volume, EQ
```

Premier lancement : Désactivé et Neutre. Première ouverture : bandes repliées. Le sélecteur distingue « Prédéfinis » et « Mes presets », avec les contrôles natifs de sélection au clavier. La description change avec la sélection. Lorsqu'il est actif, l'interrupteur porte « Activé » et la consigne d'activation disparaît. Si la compensation s'applique : « Niveau ajusté pour limiter la saturation », sans alerte alarmiste ni animation.

## Ordinateur — avancé et modifié

```text
│ Preset : Techno · modifié                                  │
│ [▾ Réglage personnalisé — 10 bandes]                        │
│ Graves                Médiums                    Aigus     │
│ 31,5  63  125  250  500   1k   2k   4k   8k   16k         │
│  │    │    │    │    │    │    │    │    │    │           │
│  ●    │    ●    │    │    │    │    │    │    │           │
│  │    ●    │    ●    ●    ●    ●    ●    ●    ●           │
│ [+2] [+1] [+2] [ 0] [ 0] [ 0] [ 0] [ 0] [ 0] [ 0] dB     │
│ [0]  [0]  [0]  [0]  [0]  [0]  [0]  [0]  [0]  [0]         │
│ [Enregistrer sous…]                    [Remettre à plat]    │
```

Chaque colonne comprend une fréquence, un curseur, un champ numérique et un bouton de retour à 0 dB. « 0 » est un raccourci visuel ; son nom accessible complet est « Remettre 63 Hz à zéro », par exemple. Repère 0 dB visible sur la piste, valeurs positives signées. Plage −12 à +12 dB, pas de 0,5 dB. Les colonnes disposent d'une largeur suffisante ; passer à la liste mobile dès que dix colonnes ne sont plus lisibles, y compris sous zoom.

Une modification affiche « Techno · modifié » sans remplacer la courbe enregistrée. Si les valeurs reviennent exactement à la référence, retirer « modifié ». Replier les bandes garde les valeurs. Aucun bouton Appliquer : l'écoute et les valeurs évoluent ensemble, par transitions sonores progressives.

## Mobile — états replié et avancé

Le bouton EQ reste accessible dans le lecteur compact. Une feuille modale remplit au besoin presque toute la hauteur ; titre et fermeture restent visibles. Le contenu défile verticalement, avec marge de zone système. Le lecteur inférieur n'est pas un contrôle utilisable derrière cette modale : fournir lecture/pause dans la feuille pour écouter les changements sans sortir du parcours.

```text
┌──────────────────────────────────┐
│ Égaliseur              [Fermer ×]│
│ [Pause] Morceau en cours          │
│ [ON] Activé                      │
│ Preset                           │
│ [Techno                      ▾]  │
│ Renforce l'assise et l'impact…    │
│ [▸ Réglage personnalisé]         │
│ [Enregistrer sous…]              │
│ [Remettre à plat]                │
└──────────────────────────────────┘

Après ouverture du réglage :
│ [▾ Réglage personnalisé]         │
│ Graves                           │
│ 31,5 Hz                [+2,0] dB │
│ ─────────●──────────       [0]   │
│ 63 Hz                  [+1,0] dB │
│ ────────●───────────       [0]   │
│ … puis Médiums et Aigus          │
│ [Enregistrer sous…]              │
│ [Remettre à plat]                │
```

Pas de défilement horizontal ni de dix colonnes comprimées. Champs numériques utilisables par toucher ; boutons et fermeture d'au moins 44 × 44 px. Les actions de fin restent atteignables par défilement, sans barre fixe recouvrant la bande en cours. Le clavier logiciel ne cache ni le champ actif ni son erreur.

## Gestion des presets personnels

Présenter les formulaires dans le panneau courant, avec retour vers le réglage, pour éviter l'empilement de modales.

```text
Égaliseur                                      [Fermer ×]
[← Retour au réglage]
Enregistrer un preset
Nom
[Ma Techno douce                                      ]
Les réglages sont conservés sur cet appareil.
[Annuler]                                  [Enregistrer]
```

- Après création : sélectionner le nouveau preset, retirer « modifié », revenir au réglage et annoncer « Preset enregistré ».
- Nom vide ou déjà utilisé, y compris variation de casse/espaces : erreur proche du champ, champ lié à l'erreur ; aucune perte de courbe. Pas de simple désactivation inexpliquée du bouton.
- Avec un preset personnel sélectionné, afficher « Gérer ce preset » : renommer, supprimer et, seulement si modifié, « Remplacer les réglages enregistrés ». Le catalogue prédéfini n'expose aucune de ces mutations.
- Remplacement explicite : « Remplacer les réglages de “Ma Techno douce” ? » avec Annuler/Remplacer ; ne pas utiliser Enregistrer sous pour écraser.
- Suppression : « Supprimer “Ma Techno douce” ? Votre réglage actuel reste inchangé. » avec Annuler/Supprimer. Le réglage actif devient « Personnalisé » ; les dix gains et l'activation restent identiques.
- Annuler une saisie ou quitter sa gestion ne change jamais le son. Échec du stockage : « Réglage utilisable pour cette session, mais non enregistré sur cet appareil. »

## Revue des comportements et corrections à intégrer

**Trois commandes sans ambiguïté :** Fermer masque uniquement le panneau ; Désactiver conserve la courbe ; Remettre à plat sélectionne Neutre et met toutes les bandes à zéro en conservant l'activation. Ne pas appeler ces commandes indistinctement « Réinitialiser ». L'aide de Remettre à plat précise « Toutes les bandes à 0 dB ».

**Accès au transport sur mobile :** la modale doit conserver une commande lecture/pause intérieure ; laisser la commande du lecteur derrière un fond modal créerait un faux accès. C'est une correction apportée à la maquette initiale.

**Disponibilité :** distinguer l'état choisi et l'état réellement appliqué. Si un extrait ne peut pas être traité : « Égaliseur indisponible pour cet extrait. Vos réglages sont conservés. » Le bouton du lecteur indique cette indisponibilité ; ne pas montrer simplement Activé comme si l'effet était audible.

**Clavier :** ouverture place le focus sur le titre du panneau, puis Tab atteint activation, preset, réglage avancé et actions. Dans l'avancé, ordre par bande : curseur, valeur numérique, zéro. Flèches changent de 0,5 dB, Home/End atteignent les bornes ; conserver le comportement natif des champs et sélecteurs. Éviter les raccourcis globaux du lecteur pendant la saisie. Escape ferme le formulaire interne d'abord, puis le panneau ; retour au déclencheur correspondant. Piéger le focus dans la feuille mobile uniquement. Sur ordinateur, l'onglet suivant peut sortir vers la bibliothèque et le transport.

**Lecteur écran :** panneau nommé ; bouton avancé avec état déplié ; interrupteur avec état ; chaque bande expose fréquence, minimum/maximum et valeur prononcée en décibels. Erreurs et résultats d'enregistrement annoncés ; aucun live region sur les changements continus des curseurs. Les noms de preset demeurent du texte, jamais du HTML.

**Zoom et fenêtre étroite :** à 200 %, passer à la disposition en liste si nécessaire, limiter la hauteur du panneau à la fenêtre disponible et maintenir le contrôle focalisé visible. Vérifier aussi une largeur CSS de 320 px : aucun défilement horizontal, titre et fermeture non écrasés, descriptions repliées naturellement. Aucune hauteur fixe du panneau supposant que dix bandes tiennent simultanément.

## Validation du rendu à effectuer après implémentation

La conception est cohérente avec le périmètre sous réserve des corrections ci-dessus. Vérifications réelles restant ouvertes : découvrir EQ sans souris ; choisir un preset désactivé puis l'écouter ; comparer OFF/ON ; fermer sans changer le son ; modifier et sauver ; annuler/renommer/remplacer/supprimer ; parcours complet clavier ; focus et retour ; viewport mobile et zoom à 200 % ; contrastes calculés ; lecture/pause mobile ; statut d'extrait incompatible ; erreur de stockage. Aucune de ces vérifications n'est déclarée passée à ce stade.

Méthode : recherches ciblées `ui-ux-pro-max` sur `dragging movements` et `keyboard focus modal` : correspondances pertinentes pour alternatives au glisser et visibilité du focus. La recherche `progressive disclosure` n'a pas fourni de correspondance pertinente après reformulation ; les choix de hiérarchie et de divulgation relèvent de cette revue experte et devront être vérifiés sur le rendu.

## Revue de la réalisation — première passe

Revue statique de `app/equalizer.tsx` et des règles `.eq-*` de `app/globals.css`, et inspection des captures `.runtime/equalizer/desktop.png` et `/Users/cedricbernard/.agent-browser/tmp/screenshots/screenshot-1792146633759.png`. Le navigateur partagé n'a pas été manipulé par le relecteur ; les conclusions ci-dessous ne constituent pas des tests d'interaction réussis. La capture desktop contient beaucoup d'espace autour du viewport utile : elle permet d'apprécier le composant, pas de conclure sur tous les rapports de zoom.

### Points satisfaisants observables

- Le panneau reprend la palette et les formes MyLib ; la hiérarchie titre/activation/preset/avancé est nette. « Techno · modifié » est lisible dans les deux captures. Le transport desktop demeure visible sous le panneau.
- Le viewport mobile réel présente les bandes horizontalement sans dix colonnes serrées ni débordement latéral visible. Les cibles zéro, le sélecteur, la fermeture et Écouter sont suffisamment généreux visuellement. Le titre reste en en-tête collant.
- Le code expose un sélecteur natif groupé, les fréquences comme noms des curseurs, les valeurs en dB, une saisie numérique et une remise à zéro par bande. Les erreurs de nom sont liées au champ ; le feedback de stockage utilise une alerte. La suppression conserve les gains, la mise à plat conserve l'activation et Fermer ne touche pas aux réglages.
- Calcul des tokens texte sur `--surface` (#191b1e), sans mesurer un pixel de capture : `--text` 15,83:1, `--muted` 8,86:1, `--faint` 6,38:1, `--accent` 10,49:1. Ces paires dépassent 4,5:1 ; cela ne valide pas tous les états réels.

### Corrections prioritaires

1. **Gestion des presets : révéler et focaliser les confirmations.** `beginEditor` focalise le champ seulement pour save/rename. Replace/delete ajoutent leur confirmation au bas du panneau en conservant le focus sur l'action initiale, potentiellement bien au-dessus. Déplacer le focus vers un titre/bloc de confirmation nommé (`tabIndex=-1`) ou Annuler, et révéler ce contenu sans le cacher derrière l'en-tête. Annuler doit rendre le focus à l'action de départ. Test requis avec les dix bandes ouvertes et sur petit écran.
2. **Saisie numérique : permettre les étapes intermédiaires.** Le champ contrôlé ignore une chaîne vide et transforme immédiatement toute autre saisie en gain borné. Cela empêche de vider proprement le champ et risque de gêner la frappe d'un signe moins ou d'un nouveau nombre. Employer un brouillon de saisie puis borner/valider au blur ou Enter ; Escape restaure la valeur précédente du champ sans fermer inopinément toute la feuille. Vérifier les décimales locales et une valeur négative au clavier mobile.
3. **Rendre les champs de gain identifiables.** Dans les captures, les valeurs se lisent comme de simples nombres, sans invitation claire à les saisir. La paire `--border` / `--surface` n'offre que 1,40:1 ; la surface `--raised` est également discrète. Donner à cette alternative au glisser une délimitation au contraste suffisant (viser 3:1 pour le repère du champ), ou un autre repère visuel explicite. Le focus seul ne résout pas sa découverte avant interaction.
4. **Sortie du panneau non modal : garder la cible visible.** Le code ne ferme pas le panneau lorsque Tab atteint la bibliothèque. Comme le panneau la recouvre, une cible derrière lui pourrait recevoir le focus. Prévoir la fermeture quand le focus quitte vers une cible recouverte, ou un comportement garantissant sa visibilité ; conserver l'accès au transport apparent. À vérifier réellement, sans conclure sur le seul code.

### Ajustements secondaires et contrôles restants

- La capture mobile montre une barre de défilement du document et celle du dialogue. Bloquer le défilement du document pendant la feuille modale et le restaurer à la fermeture, sans perdre la position de la bibliothèque ; confirmer le comportement tactile réel. La double barre est un constat visuel, le déplacement effectif du fond n'a pas été testé.
- La liste mobile masque les repères Graves/Médiums/Aigus ; ajouter des en-têtes de groupe dans la liste améliorerait l'orientation des personnes peu familières avec les fréquences.
- « Remettre à plat » est explicite mais son effet sur toutes les bandes pourrait être accompagné d'une aide « Toutes les bandes à 0 dB », accessible avant activation.
- Le code crée des annonces successives avec le même texte ; vérifier qu'un second enregistrement ou renommage identique est bien annoncé. Éviter les annonces répétées et saccadées de la protection des crêtes.
- Vérifier zoom 200 %, focus sous l'en-tête collant, fermeture Escape des sous-formulaires puis du panneau, sélecteur clavier, création/nom invalide/annulation/renommage/remplacement/suppression et retour de focus. Aucun résultat runtime n'est déclaré par cette passe.

## Revue finale — corrections et preuves de réalisation

**Verdict UX/design : acceptable pour livraison dans le périmètre prévu ; aucune correction UX bloquante restante relevée par cette revue.** La tâche 4.3 peut être clôturée en associant cette revue aux preuves d'interaction produites par l'agent principal. Cette conclusion porte sur les parcours évalués ; elle ne constitue pas une certification exhaustive d'accessibilité ni une étude utilisateur.

### Observations directes du relecteur

J'ai relu les corrections de `app/equalizer.tsx` et `app/globals.css`, inspecté les cinq captures finales (`desktop-final`, `mobile-final`, `desktop-advanced-final`, `mobile-advanced-final`, `zoom200`) et lu les rapports JSON ci-dessous. Je n'ai pas manipulé le navigateur partagé et ne revendique pas l'exécution des interactions.

- Les états repliés donnent la priorité au preset et gardent la personnalisation discrète ; les états avancés rendent les dix bandes lisibles. Les commandes Fermer, activation et Remettre à plat restent distinctes. Le panneau desktop préserve le transport visible ; la feuille mobile offre Écouter et ne présente plus la double barre du document observée à la première passe.
- Les valeurs numériques sont désormais clairement des champs éditables dans les captures. Calcul de `--control-border` #77818d : 4,36:1 sur `--surface`, 3,79:1 sur `--raised`, ce qui corrige le faible repérage visuel initial.
- Le code donne le focus à Annuler dans les confirmations de remplacement/suppression ; les saisies ont un brouillon acceptant les étapes intermédiaires ; le défilement du document est verrouillé pendant la feuille mobile ; la sortie Tab aux extrémités du panneau desktop le ferme ; le scroll-padding réserve la place de l'en-tête. Escape traite d'abord un formulaire interne avant le panneau.
- La capture à 200 % montre les dix colonnes dans la largeur disponible, des valeurs lisibles et le transport sous le panneau. Certains contenus sont naturellement hors du cadre vertical et accessibles par défilement ; ce n'est pas un besoin de tenir toutes les commandes simultanément à l'écran.

### Preuves exécutées et transmises par l'agent principal

Rapports consultés :

- `.runtime/equalizer/verification.json` : statut passed, 30 vérifications, dont bandes initialement repliées, sélection sans activation implicite, modification au clavier, rejet d'un nom prédéfini, création/renommage/remplacement explicite/suppression conservant la courbe, annulation et retour du focus, OFF/ON, fermeture, persistance, remise à plat, mobile 320 px et viewport courant, saisie négative et erreurs de stockage. Le rapport inclut les mesures de signaux traités et de médias réels ; elles attestent des mesures instrumentées, pas d'une appréciation auditive humaine par ce relecteur.
- `.runtime/equalizer/sources.json` : cinq vérifications passed, incluant extrait compatible, repli direct si CORS refusé, explication du repli, retour local avec réglages restaurés et échec d'initialisation sans perte de lecture.
- `.runtime/equalizer/a11y-final.json` : axe 4.12.1, zéro violation, une indétermination sur le contraste de `.eq-description` à cause d'un recouvrement empêchant la déduction automatique du fond. Sa paire de tokens texte/fond donne 8,86:1 et les captures sont lisibles. Cette vérification manuelle ciblée résout le point de contraste examiné ; elle ne transforme pas l'audit automatique en couverture complète de l'accessibilité.

L'agent principal rapporte également une mesure Chrome via CUA au zoom réel de 200 % : `innerWidth=720`, `devicePixelRatio=2`, dernière bande focalisée entièrement visible (haut 180,8 ; bas 310,8) dans un panneau entre 24 et 380 CSS px, sans débordement horizontal. Cette mesure de focus provient de son exécution ; ma contribution est l'inspection de la capture et du code.

Pour l'environnement macOS, l'agent principal confirme que le lanceur Swift ouvre Chrome plutôt qu'une WebView embarquée, et rapporte boucle 30–32 s répétée, OFF/ON, extrait iTunes avec lecture avancée à 4,45 s et `crossOrigin=anonymous`, retour au morceau local, pause/reprise. Ces résultats sont attribués à son exécution et complètent le contexte d'écoute ; ils n'ont pas été reproduits par le relecteur UX.

### Améliorations non bloquantes

Des repères Graves/Médiums/Aigus dans la liste mobile et une aide courte associée à Remettre à plat restent utiles pour les débutants. La saisie numérique applique les valeurs valides pendant la frappe puis normalise au blur ; Escape garde le sens global de fermeture sauf sous-formulaire, plutôt que d'introduire une annulation spécifique par bande. Ce comportement demeure compatible avec le périmètre fixé et ne bloque pas la livraison. Un essai humain avec lecteur d'écran et une écoute comparative des presets apporteraient des retours complémentaires ; ils ne sont pas revendiqués par cette revue.
