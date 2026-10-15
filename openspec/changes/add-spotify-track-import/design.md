## Context

Voir proposal.md. Le test réel librespot-python (commit 683d9e76f91ba7ae03919494dac8d899ca505651) a reçu 10 051 095 octets et produit un MP3 de 202,107 s. Son Protobuf 3.20.1 est incompatible avec le modèle de style exécuté dans l’environnement principal.

## Goals / Non-Goals

Préserver les imports existants et le fonctionnement hors réseau. Le worker Spotify n’effectue ni analyse musicale ni gestion SQLite ; le backend garde ces responsabilités. La navigation du catalogue et les imports en lot sont exclus.

## Decisions

- Installer un environnement `.spotify-venv` verrouillé séparément, fourni par l’installateur et le packaging. Un sous-processus JSON assure l’isolation et permet annulation/timeout. Ne pas modifier le Protobuf principal.
- Worker OAuth PKCE avec secrets cryptographiques et état, serveur 127.0.0.1:5588, durée 30 minutes, scopes streaming/user-read-private. Le client utilisé par librespot est identifié par Spotify comme « Spotify for Desktop » ; l’interface l’explique avant connexion.
- Le worker écrit un statut public atomique distinct des identifiants privés (0600, dossier 0700). La session est mémorisée pour les imports suivants, effacée à la déconnexion. Pas de cookies du navigateur ni mot de passe.
- Normaliser le lien avant toute récupération. Le worker retourne les métadonnées natives et écrit l’audio source ; la préparation AAC et l’analyse réutilisent le parcours existant. Le backend vérifie les résultats du worker et ne traite une erreur comme un succès que si la sortie attendue est complète et vérifiable.
- Interface compacte dans la carte d’import : statut Spotify, connexion/déconnexion, attente visible et lien conservé. Demander la connexion uniquement pour Spotify.

## Risks / Trade-offs

- Protocole non officiel ou compte refusé → erreurs explicites et reprise, aucun repli silencieux vers YouTube.
- Environnement supplémentaire → verrouillage et validation du worker lors de l’installation.
- Processus interrompu → fichiers temporaires, reprise depuis la fiche et statut de connexion expiré au redémarrage.

## Migration Plan

Installer le worker isolé, intégrer la session de test validée sans exposer son contenu, tester sur le lien fourni, construire et mettre à jour l’app macOS. La bibliothèque existante conserve son schéma et ses médias.
