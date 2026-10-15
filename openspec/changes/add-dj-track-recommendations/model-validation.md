# Validation du modèle local — 14 octobre 2026

Choix : poids originaux `discogs-effnet-bsdynamic-1.onnx` de MTG/UPF ; ONNX Runtime
1.31.0 CPU, Python 3.13, macOS arm64. Aucun code Essentia n'est installé ; le
prétraitement utilise librosa/NumPy avec les paramètres documentés MusiCNN.
Poids CC BY-NC-SA 4.0 inchangés, licence et attribution dans `backend/models/`.

Le spike exploratoire a mesuré trois extraits par fichier avant l'intégration :
0,36–1,33 s et environ 226 MiB de RSS. Le benchmark de validation final fixe ses
budgets avant sa propre exécution : 5 s par fichier et 512 MiB maximum.

| Audio | Annotation attendue | Sortie principale / secondaire | Temps |
|---|---|---|---|
| Samuel Moriero – Call You | Hardcore, avis provisoire de l'utilisateur | Hardcore / Hardstyle | 1,171 s |
| Where Is My Mind (KX CHR Remix) | Hardcore, avis provisoire de l'utilisateur | Hardcore / Hardstyle | 0,421 s |
| BbY WOW (BISCITZ Afro House Remix) | Famille House, d'après le titre | House / Bassline | 0,374 s |
| Silence synthétique, 2 h | Abstention | Style à confirmer | 0,218 s |
| Signal tonal synthétique, 2 h | Pas de vérité de genre, test de ressources | Experimental | 0,342 s |

RSS maximum du benchmark : 232,2 MiB. Les fichiers longs sont décodés uniquement
sur trois extraits bornés ; leur durée n'entraîne pas de décodage intégral.
Commandes : `.venv/bin/python tests/style_benchmark.py` et
`.venv/bin/python -m pytest tests/test_dj.py -q`.

Les deux annotations utilisateur concordent avec les styles principaux. Le
troisième résultat ne prouve pas la reconnaissance d'Afro House : ce label n'est
pas dans les 400 sorties et existe seulement en correction manuelle. Les scores
secondaires et les signaux synthétiques montrent pourquoi l'interface présente
une estimation corrigeable, sans pourcentage de certitude.

Les tests couvrent également un set hétérogène par trois prédictions de familles
distinctes : la sortie doit s'abstenir. Cela vérifie la règle d'agrégation, sans
constituer une évaluation musicale sur de vrais sets DJ. Le petit corpus de
trois titres ne permet pas de revendiquer une précision générale ni une
calibration statistique des seuils. Une évaluation plus large reste utile, mais
ne bloque pas le fonctionnement local et corrigeable de cette version.
