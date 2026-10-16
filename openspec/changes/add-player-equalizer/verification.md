# Vérification de l'égaliseur

Vérification réalisée le 16 octobre 2026 sur macOS, avec Next.js 16.4.1/Turbopack et agent-browser 0.33.2. Implémentation et vérification portent sur `add-player-equalizer` ; le classement de bibliothèque reste une évolution distincte.

## Résultats

- `npm run build` : compilation de production et TypeScript réussis ; sortie `.next-build`, cache `.next` du serveur de développement conservé.
- `npm run test` : 6 tests JavaScript et 64 tests Python réussis. Un test de renommage asynchrone préexistant échouait dans la suite complète : son attente couvre maintenant les métadonnées de renommage qu'il vérifie, sans modifier le backend métier.
- `node scripts/verify-equalizer.mjs` : 30 contrôles d'interface et de traitement réussis dans le vrai navigateur, plus 19 configurations de signaux et dix presets sur trois sources musicales réelles.
- `node scripts/verify-equalizer-sources.mjs` : cinq contrôles réussis : extrait avec CORS, extrait sans CORS en lecture directe, explication de l'indisponibilité, retour local et panne d'initialisation conservant la lecture native.
- `/_next/mcp` : `get_compilation_issues` sans problème, `get_errors` sans erreur de configuration ni erreur de session ; routes `/`, `/api/[...path]`, `/icon.svg` confirmées.
- React DevTools via agent-browser : arbre et hooks inspectés ; profil de rendu montrant les changements d'état de l'égaliseur sans montage supplémentaire de ce composant durant l'ouverture et le changement de preset. Le moteur réutilise la même source pour un élément audio et conserve sa connexion pendant les changements de morceaux locaux.
- Intégrité : empreintes SHA256 inchangées pour les données de 17 morceaux et 86 fichiers de médias/analyse, avant/après des changements d'égalisation.

Les rapports bruts sont conservés dans `.runtime/equalizer/` : `verification.json`, `sources.json`, `integrity.json`, `react-tree.json`, `react-inspect.json`, `react-renders.json`, `a11y-final.json`. Les deux scripts navigateur sont versionnés et réexécutables avec le serveur et la session next-dev-loop ouverts.

## Contrat et preuves

| Exigence | Preuve |
| --- | --- |
| Dix bandes, action pendant l'écoute et état global | Contrôles clavier/numérique ; signal non nul mesuré après traitement ; changement de morceau sans nouvelle source, position conservée pendant OFF/ON. |
| Presets fournis et personnels | Dix presets présents ; création, noms conflictuels, renommage, modification, remplacement explicite et suppression du preset actif testés. |
| Fermer / désactiver / remettre à plat | Courbe conservée après OFF ; retour du focus à la fermeture ; remise à zéro gardant l'activation. |
| Persistance et erreurs | Restauration après véritable rechargement ; simulation de quota sur le stockage de l'égaliseur, réglage utilisable et erreur visible, puis récupération. Données corrompues/bornes testées en JavaScript. |
| Accessibilité et adaptation | Maquettes et double revue par agent UX/design dans `ux-review.md` ; parcours clavier, saisie négative, Escape du sous-formulaire, mobile 320/390 px, paysage 844×390 et zoom réel 200 %. |
| Niveau sonore | Réponse cumulée de dix filtres, marge de 3 dB, rampes 12/60/120 ms et protection des crêtes mesurées ; voir détails ci-dessous. |
| Sources ou traitement indisponibles | Serveur de fixture audio réellement sans CORS, remount en élément direct sans `crossOrigin`, reprise locale ; indisponibilité AudioContext simulée avant connexion de source. |
| Fichiers et analyses intacts | Comparaison d'empreintes de la bibliothèque et des dossiers média/analyse ; aucun traitement d'export ajouté. |

## Audio et calibration

Le moteur utilise un contexte 48 kHz afin que la bande annoncée à 16 kHz soit sous Nyquist, même si le périphérique système fonctionne à 24 kHz. Les signaux synthétiques ont aussi été rendus hors ligne à 24, 44,1 et 48 kHz : sinus proche du plein niveau, impulsion et signal multiton, toutes bandes à +12 dB. Les sorties restent finies et bornées. Le test du processeur réel couvre aussi des entrées au-delà du plein niveau et le passage désactivé.

Les courbes fournies sont volontairement modérées (accentuations de 0,5 à 3 dB ; atténuations jusqu'à −4 dB). Les dix courbes ont été rendues et mesurées sur des passages de « Where Is My Mind (KX CHR Remix) », « BbY WOW (BISCITZ Afro House Remix) » et « Nacht Und Träume ». Pics maximaux de sortie respectifs : environ 0,9900, 0,98998 et 0,40765. Ce contrôle ne prétend pas certifier une préférence esthétique universelle ni remplacer une appréciation auditive humaine. Les presets restent des points de départ personnalisables.

La compensation est calculée depuis le produit des réponses des filtres, pas depuis le plus grand curseur. Le filet final applique un coude doux au-delà de 0,95 et une borne asymptotique de 0,99, avec comptage des crêtes protégées. À des réglages extrêmes il peut colorer le son ; l'interface invite alors à réduire les accentuations. Il s'agit d'une protection des échantillons, pas d'une garantie de true peak analogique/inter-échantillons. Le volume perçu peut baisser avec la compensation, ce qui est expliqué dans le panneau.

Les variations de gain annulent les automatisations précédentes ; les bascules rapides annulent aussi les changements de protection différés. Le test moteur vérifie la reprise d'un contexte suspendu, la conservation de la protection après OFF/ON rapide et le contexte 48 kHz.

## UX et environnement macOS

Le lanceur Swift existant a été compilé dans un bundle temporaire de validation et ouvert. Il ouvre le navigateur Chrome système ; il ne contient pas de moteur WebView distinct. Dans cet onglet ont été vérifiés lecture/pause, changement de morceau, réglage de volume par commandes clavier, boucle 30–32 secondes maintenue pendant la comparaison OFF/ON, extrait iTunes réel joué jusqu'à 4,45 secondes avec `crossOrigin=anonymous` et égaliseur actif, puis retour au morceau local. Le bundle temporaire a été arrêté ; l'application installée n'a pas été remplacée.

Zoom 200 % appliqué par les commandes natives de Chrome for Testing : largeur CSS 720 px, ratio de pixels 2 ; dernière bande focalisée entièrement visible entre 180,8 et 310,8 px dans un panneau entre 24 et 380 px. Zoom rétabli ensuite. Captures desktop/mobile, avancées et zoom conservées dans `.runtime/equalizer/`.

Axe 4.12.1 ne signale aucune violation dans l'égaliseur. Une indétermination de fond sur un paragraphe est résolue par inspection visuelle et contraste des tokens de 8,86:1 ; les bordures numériques atteignent 3,79:1 sur leur fond. La revue finale de l'agent UX/design ne relève aucun point bloquant. Cela ne revendique pas un essai humain VoiceOver exhaustif.

## Limites opérationnelles

Les préférences sont locales au profil de navigateur et à l'origine utilisée ; une autre adresse/port ou un autre profil dispose de ses propres réglages. Les fichiers originaux et les exports ne sont pas égalisés. Les extraits qui refusent le traitement restent en lecture directe, explicitement signalée. Aucun preset ne change automatiquement selon le style du morceau. Aucun déploiement ni remplacement de l'application installée n'a été effectué.
