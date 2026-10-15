## Context

Voir `proposal.md` pour la motivation. L'interface de détail est dans `app/library.tsx`, avec une grille forme d'onde/BPM et un lecteur persistant. `backend/audio.py` estime le tempo par fenêtres ; `backend/main.py` orchestre les imports ; `backend/store.py` conserve des documents JSON dans SQLite. Les médias sont locaux, les analyses versionnées. Aucun style musical n'est actuellement stocké.

## Goals / Non-Goals

**Goals:** ajouter une analyse indépendante du tempo, exploiter la bibliothèque existante, produire un classement déterministe explicable et préserver la fluidité de lecture.

**Non-Goals:** classifier le style de chaque passage dans cette version, entraîner un modèle, analyser la tonalité, modifier la vitesse de lecture ou faire dépendre les recommandations d'un service distant.

## Decisions

### 1. Analyse audio locale, modèle derrière un adaptateur

Modèle retenu : Discogs-EffNet v1 ONNX original MTG, exécuté sur CPU par ONNX Runtime 1.31.0 avec deux threads, compatible avec Python 3.13 et Apple Silicon. Poids CC BY-NC-SA 4.0, adaptés à cette app personnelle non commerciale ; attribution et licence accompagnent les fichiers. Source : https://essentia.upf.edu/models.html. Poids et métadonnées sont vérifiés par SHA256 dans l'installation et avant chargement.

Analyser trois extraits de 12 secondes autour de 20 %, 50 % et 80 % du morceau, en mono 16 kHz. Prétraitement MusiCNN : FFT 512, hop 256, Hann symétrique, 96 bandes Slaney, compression log10(1+10000*x), patches 128 frames espacés de 62 frames. Agréger les sorties et conserver au maximum deux styles avec score moyen ≥0,2 et ≥65 % du meilleur score. Le style principal ou un voisin explicite doit être fortement étayé dans au moins deux extraits sur trois. Ignorer les extraits silencieux ; en cas de données insuffisantes, s'abstenir. Les scores restent internes, jamais affichés comme probabilités de justesse.

Taxonomie : 400 styles qualifiés par genre pour éviter les homonymes, plus Afro House disponible pour correction manuelle. Le modèle reconnaît House sans promettre ce sous-genre. Les deux morceaux annotés provisoirement « Hardcore » par l'utilisateur donnent Hardcore en tête et Hardstyle en second. Le remix Afro House donne House/Bassline : cela confirme la famille générale, pas la précision du sous-genre. Voir `model-validation.md` pour les mesures et limites. Un set hétérogène doit pouvoir rester « Style à confirmer » ; trois extraits ne garantissent pas la description de chaque passage.

Alternative écartée : inférer uniquement le style depuis le titre, l'auteur ou la plateforme ; cela ne décrit pas nécessairement le son du remix. Un service cloud ajouterait une dépendance réseau et un envoi d'audio, incompatibles avec l'approche locale retenue.

### 2. Résultats et correction séparés

Ajouter aux données de morceau un état indépendant d'analyse de style (pending, running, ready, uncertain, error), une version, les labels/scores et une correction utilisateur facultative. L'étiquette effective vient de la correction lorsqu'elle existe, sinon d'une estimation suffisamment étayée. Une réanalyse ne remplace jamais la correction.

Exposer via le proxy API existant les résultats, la correction/réinitialisation et une reprise d'analyse. Stocker les éventuels détails volumineux dans un fichier versionné distinct du tempo. Conserver les services sur localhost et leur protection de session actuelle.

Alternative écartée : réutiliser l'état de disponibilité du morceau ; une erreur de style ne doit pas rendre un média illisible ni effacer un BPM valide.

### 3. Classement simple et déterministe

Le backend reçoit l'identifiant source, le mode de référence (global ou sélection), la tolérance, le filtre et une limite. En mode global il dérive le BPM depuis la donnée persistée ; en mode sélection il recalcule le BPM depuis les bornes et le facteur local à partir des points persistés, avec les mêmes règles que l'interface. Il retourne la référence utilisée et les explications de chaque résultat, sans faire confiance à un BPM arbitraire fourni par le client.

Éligibilité : autre morceau présent, audio disponible, BPM positif fini, qualité stable ; écart absolu sur les valeurs corrigées non arrondies inférieur ou égal à la tolérance. Les BPM variables/incertains sont exclus de cette première version pour éviter un classement trompeur basé sur une moyenne. Le BPM candidat est son BPM global corrigé ; pas de multiplication automatique pour rapprocher artificiellement 80 et 160.

Ordre lexicographique : même style effectif, puis style voisin reconnu, puis style inconnu ou autre ; dans chaque groupe, écart absolu croissant, titre puis identifiant pour départager. Une table de voisinage symétrique, explicite et versionnée relie les styles de la taxonomie d'affichage. Les styles inconnus ne sont jamais qualifiés de voisins. En mode « Styles proches », les autres styles restent éligibles avec la mention « Tempo proche » ; en mode « Même style », seul le premier groupe reste éligible.

Sans style source exploitable, désactiver « Même style » avec une explication et trier uniquement par écart de BPM. Sans BPM source stable, afficher une explication et ne pas inventer de référence ; en mode sélection, ne pas basculer silencieusement sur le global si le passage est trop court/incertain.

Alternative écartée : score pondéré opaque mêlant tempo et style. Le classement par groupes est plus facile à expliquer et à vérifier ; les embeddings de similarité pourront être explorés ultérieurement.

### 4. Interface intégrée à la page actuelle

Afficher près de l'auteur « Style estimé : … » et « Corriger » ; après correction, indiquer « Style défini par vous ». Un petit dialogue permet de choisir un style dans la taxonomie et de revenir à l'estimation, sans exposer de paramètres du modèle.

Sous toute la grille d'analyse, afficher un panneau pleine largeur :

```text
À mixer ensuite                         Dans votre bibliothèque
Basé sur 160,2 BPM · Morceau complet

Référence [Morceau complet] [Ma sélection]
Écart de tempo [±2] [±5 sélectionné] [±10]
Style [Styles proches sélectionné] [Même style]

Pochette  Titre · Artiste       159,8 BPM · −0,4   Écouter  Ajouter
          Style · Même style
Pochette  Titre · Artiste       162,0 BPM · +1,8   Écouter  Ajouter
          Style · Style voisin

Voir davantage
```

Exemple illustratif. Afficher cinq lignes initiales, étendre par cinq via « Voir davantage », remettre la limite à cinq lors d'un changement de critères. Le titre ouvre le détail ; « Écouter » utilise la lecture existante sans naviguer ; « Ajouter à une playlist » utilise le dialogue existant. La liste n'instaure pas automatiquement une nouvelle file de lecture.

Conserver les tokens de couleur, typographie, rayons et boutons existants ; réserver la menthe aux actions et états actifs. L'écart numérique est signé, les raisons sont textuelles. Sur mobile les lignes deviennent des cartes compactes sans défilement horizontal. Prévoir un espace bas suffisant pour le lecteur fixe.

Contrôles nommés et utilisables au clavier, focus visible, cibles d'au moins 44 px, état choisi annoncé. Le dialogue restaure le focus. Ne jamais dépendre uniquement de la couleur ou du survol. Les recherches locales du skill UI/UX (« data table », « loading feedback ») appuient les cartes mobiles et les états de chargement qui préservent espace et focus.

### 5. Actualisation et états

Mettre à jour après correction de style/BPM, import terminé et suppression. En mode sélection, différer la requête de 250 ms après la dernière modification des bornes et ignorer les réponses devenues obsolètes ; le BPM visible de sélection continue de suivre le geste comme actuellement. Ne pas déplacer le focus lors d'un reclassement.

Chargement initial : lignes squelettes et état accessible. Actualisation : garder le panneau stable, signaler l'actualisation et désactiver les actions de résultats obsolètes. Erreur de service : message dans le panneau et reprise, sans supprimer les informations déjà connues ; résultats conservés explicitement marqués obsolètes. Aucun résultat : proposer une tolérance supérieure uniquement sur action utilisateur. Si la bibliothèque est trop petite, inviter à importer davantage de titres. Analyse de style manquante : recommandations par tempo disponibles avec explication.

## Risks / Trade-offs

- [Sous-genres/remixes mal reconnus] → corpus représentatif, abstention et correction manuelle ; aucun style n'est garanti.
- [Inférence coûteuse sur Mac] → queue séquentielle basse priorité, extraits bornés, cache versionné, import/lecture prioritaires ; mesurer pendant le spike.
- [BPM identiques mais transition peu musicale] → explications séparées de style/tempo, ne pas afficher de score de compatibilité globale ; tonalité hors périmètre.
- [Exclusion des tempos variables réduit la liste] → expliquer les exclusions ; le mode sélection permet une référence source stable mais l'analyse des passages candidats reste future.
- [Voisinage éditorial imparfait] → table inspectable testée sur exemples, versionnée ; possibilité du filtre strict.
- [Bibliothèque non enrichie au premier lancement] → enrichissement progressif et classement tempo utilisable immédiatement.

## Migration Plan

1. Lors d'un futur développement autorisé, réaliser le spike et documenter la décision de modèle avant intégration.
2. Ajouter des champs optionnels compatibles avec les documents existants ; aucune modification destructive de SQLite.
3. Fournir un artefact de modèle vérifié/versionné via l'installation ou la mise à jour, avec erreur explicite si absent. Les analyses après installation fonctionnent sans réseau.
4. Enrichir progressivement les médias existants, sans retéléchargement ni invalidation des analyses de tempo ; reprendre après interruption.
5. Valider backend, interactions et runtime Next.js suivant le skill next-dev-loop ; préparer une mise à jour macOS seulement lors d'une phase ultérieure autorisée.
6. En cas de retour à l'ancienne version, les champs supplémentaires sont ignorés ; préserver audio, playlists, tempo et corrections de style pour une réactivation.

## Validation du choix

Le spike initial a validé l'exécution locale avant intégration. Le benchmark reproductible `tests/style_benchmark.py` vérifie trois morceaux réels et deux fichiers synthétiques de deux heures, avec budgets explicites de 5 secondes par fichier et 512 MiB. Résultat de validation : 0,374–1,171 s par morceau réel, 0,218–0,342 s sur les fichiers longs, 232,2 MiB de RSS maximum. Le corpus est trop petit pour mesurer une précision générale ; les annotations et les limites restent explicites.
