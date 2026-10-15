## Purpose

Permettre de télécharger une copie MP3 complète d’un morceau conservé localement, enrichie de ses métadonnées et de son tempo global disponible.

## ADDED Requirements

### Requirement: Export complet

L'application SHALL exporter le morceau complet en MP3 haute qualité avec nom de fichier nettoyé et progression/état visible. La sélection temporelle MUST rester réservée à l'analyse et l'écoute. La qualité source MUST ne pas être présentée comme améliorée par l'encodage.

#### Scenario: Sélection active
- **WHEN** un utilisateur exporte un morceau de 6 min avec une sélection de 30 s
- **THEN** le MP3 contient les 6 min et non uniquement la sélection

#### Scenario: Téléchargement
- **WHEN** l'export est prêt
- **THEN** un fichier .mp3 est proposé au téléchargement via le navigateur sans écrasement silencieux d'un fichier existant

### Requirement: Métadonnées

L'export SHALL contenir titre, auteur connu, pochette disponible et BPM global corrigé si valide. Le champ BPM MP3 entier MUST être arrondi depuis la valeur globale, sans reprendre le BPM de sélection ni inventer une valeur absente.

#### Scenario: BPM corrigé
- **WHEN** le BPM global vaut 127.6 après correction
- **THEN** le champ BPM du MP3 vaut 128 et l'app conserve sa précision interne

#### Scenario: Sans analyse fiable
- **WHEN** le média est prêt mais aucun BPM global valide n'est disponible
- **THEN** l'export reste possible sans champ BPM avec une indication explicite

#### Scenario: Correction après export
- **WHEN** le BPM global change puis un nouvel export est demandé
- **THEN** le nouveau MP3 contient la valeur globale actuelle et non celle d'un cache périmé

### Requirement: Export local résilient

Un morceau conservé SHALL être exportable sans accès à sa source d'origine. Une erreur d'encodage ou de disque MUST laisser intact le média et proposer de réessayer.

#### Scenario: Source indisponible
- **WHEN** le réseau est coupé ou le lien d'origine n'existe plus
- **THEN** l'export utilise le média local et reste réalisable

#### Scenario: Échec conversion
- **WHEN** la conversion échoue
- **THEN** l'erreur est affichée sans supprimer le morceau ni proposer un fichier incomplet
