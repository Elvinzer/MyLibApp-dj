## Purpose

Permettre à l’utilisateur de conserver un morceau Spotify sur son Mac, puis de l’écouter, l’analyser et l’exporter en MP3 dans son parcours musical existant.

## ADDED Requirements

### Requirement: Import individuel direct
L’application SHALL accepter un lien HTTPS open.spotify.com de morceau, éventuellement localisé ou assorti de paramètres de partage. Elle MUST récupérer l’audio Spotify directement, préserver l’identité de la source et éviter les doublons. Les albums, playlists et identifiants invalides MUST être refusés explicitement.

#### Scenario: Import Premium
- **WHEN** un utilisateur connecté importe un lien de morceau Spotify accessible
- **THEN** le morceau est conservé localement avec titre, artistes, durée et pochette disponible, et devient lisible et exportable en MP3

#### Scenario: Lien partagé déjà présent
- **WHEN** le même identifiant est soumis avec d’autres paramètres de partage
- **THEN** l’entrée existante est retournée sans nouveau téléchargement

### Requirement: Connexion maîtrisée
L’application SHALL proposer connexion, statut, reprise et déconnexion Spotify. L’authentification MUST se faire sur Spotify avec PKCE, état vérifié, retour limité à la boucle locale et expiration explicite. Les secrets MUST rester sur le Mac avec permissions privées et ne MUST apparaître ni dans la bibliothèque ni dans les journaux.

#### Scenario: Connexion nécessaire
- **WHEN** un lien Spotify est soumis sans session locale
- **THEN** l’interface propose une connexion sans perdre le lien saisi et permet de reprendre l’import après validation

#### Scenario: Expiration ou refus
- **WHEN** la connexion expire ou est refusée
- **THEN** un message précis et une nouvelle tentative sont disponibles sans entrée audio fantôme

#### Scenario: Déconnexion
- **WHEN** l’utilisateur se déconnecte
- **THEN** les identifiants locaux sont supprimés, les imports Spotify en cours sont arrêtés et les morceaux déjà téléchargés restent utilisables

### Requirement: Cohérence de la bibliothèque
Les morceaux Spotify téléchargés SHALL bénéficier des analyses BPM/style, recommandations locales, Finder, annulation et reprise existants. Le MP3 MUST suivre le format artiste_titre_style_bpm.mp3.

#### Scenario: Export hors réseau
- **WHEN** un morceau Spotify a fini son import et le réseau est indisponible
- **THEN** la lecture et l’export utilisent les fichiers locaux et conservent le nommage demandé
