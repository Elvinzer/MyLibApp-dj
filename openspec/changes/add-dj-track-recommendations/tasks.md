## 1. Validation préalable du modèle

- [x] 1.1 Constituer un corpus initial des morceaux/remixes disponibles avec annotations explicites, plus des fichiers longs synthétiques pour les ressources ; fixer les critères du benchmark de validation avant ses mesures et documenter les limites de représentativité.
- [x] 1.2 Tester un modèle préentraîné local et son moteur sur le Mac cible ; vérifier Apple Silicon, Python, fonctionnement hors réseau et conditions de distribution des dépendances et poids.
- [x] 1.3 Documenter mesures, limites et décision dans le design ; fixer modèle/version, stratégie d'extraits, seuils et taxonomie. Si aucun candidat ne convient, réviser la proposition avant l'intégration.
- [x] 1.4 Définir et vérifier une table symétrique de styles voisins pour la taxonomie retenue, avec exemples cohérents et cas sans voisin.

## 2. Analyse et données de style

- [x] 2.1 Ajouter résultats versionnés, états de style indépendants et correction facultative en conservant la compatibilité avec les morceaux existants.
- [x] 2.2 Implémenter l'adaptateur d'analyse locale, le décodage d'extraits bornés, l'agrégation et l'abstention sans interférer avec le calcul de tempo.
- [x] 2.3 Ajouter une queue de style séquentielle, la reprise après interruption, le cache et l'enrichissement progressif de la bibliothèque ; donner priorité à l'import et préserver la lecture.
- [x] 2.4 Exposer lecture, correction, retour à l'estimation et reprise via l'API locale existante ; préserver les corrections lors des réanalyses.
- [x] 2.5 Vérifier les cas estimation, incertitude, modèle absent, interruption, persistance et réanalyse avec correction manuelle.

## 3. Moteur de recommandations

- [x] 3.1 Implémenter l'éligibilité bibliothèque/audio/tempo stable et les comparaisons inclusives des BPM corrigés non arrondis, sans rapprochement automatique ÷2/×2.
- [x] 3.2 Implémenter les groupes même style/style voisin/tempo proche, le filtre strict et les départages déterministes ; utiliser les corrections et le repli tempo seul.
- [x] 3.3 Exposer les recommandations avec référence explicite, tolérance validée, limite, raisons et écarts signés ; valider la qualité de la référence de sélection.
- [x] 3.4 Vérifier les limites ±2/±5/±10, arrondis d'affichage, corrections de tempo, styles multiples/inconnus, filtre strict et exclusions de BPM incertains/variables.

## 4. Interface de détail

- [x] 4.1 Relire les guides Next.js locaux pertinents avant les changements ; consulter le skill UI/UX pour les contrôles, le dialogue et le responsive.
- [x] 4.2 Ajouter le style près du titre avec états explicites et dialogue de correction/réinitialisation accessible.
- [x] 4.3 Ajouter le panneau « À mixer ensuite » sous la grille d'analyse, les trois contrôles et la liste initiale de cinq résultats avec extension par cinq.
- [x] 4.4 Relier navigation, écoute et ajout à une playlist aux comportements existants ; présenter pochettes, styles, BPM, écarts et raisons.
- [x] 4.5 Ajouter chargement, actualisation, erreur/reprise, référence invalide, style inconnu et état vide avec élargissement explicite.
- [x] 4.6 Actualiser lors des corrections/imports/suppressions ; différer les requêtes de sélection et ignorer les réponses obsolètes sans déplacer le focus.
- [x] 4.7 Vérifier la présentation desktop/mobile, les cibles tactiles, le contraste, le clavier, la restauration du focus et l'espace réservé au lecteur fixe.

## 5. Installation et validation finale

- [x] 5.1 Intégrer l'artefact de modèle vérifié/versionné au mécanisme d'installation/mise à jour ; vérifier enrichissement de données existantes, modèle absent et retour à une version précédente sans perte de données.
- [x] 5.2 Exécuter les tests métier pertinents, le typecheck et le build ; documenter les résultats et limites.
- [x] 5.3 Suivre `.codex/skills/next-dev-loop/SKILL.md` : vérifier prérequis et serveur dev, compilation/erreurs via `/_next/mcp`, interactions et comportements React via agent-browser ; préserver `.next` pendant l'exécution du serveur. Si un prérequis manque, le signaler et arrêter cette vérification sans la déclarer réussie.
- [x] 5.4 Vérifier dans le navigateur référence globale/sélection, corrections, filtres, extension, lecture, playlist, service indisponible et réponses obsolètes ; capturer les preuves desktop/mobile utiles.
- [x] 5.5 Mettre à jour la documentation d'utilisation et consigner le bilan réel de validation de la feature.
