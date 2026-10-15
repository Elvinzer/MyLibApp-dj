## Purpose

Permettre à l'utilisateur de connaître et corriger le style estimé de ses fichiers audio locaux afin de retrouver des morceaux musicalement proches dans sa bibliothèque.

## ADDED Requirements

### Requirement: Automatic local style analysis
The system SHALL estimate musical style from local audio in the background for newly imported tracks and progressively for existing tracks. Analysis SHALL operate offline after model installation, without uploading audio, redownloading media or requiring tempo reanalysis. Style processing SHALL NOT prevent playback of available media.

#### Scenario: New audio available
- **WHEN** a new track has playable local audio
- **THEN** its style analysis is scheduled and its media remains playable during processing

#### Scenario: Existing library enrichment
- **WHEN** a track from the existing library has no current style analysis
- **THEN** the system schedules enrichment without requiring reimport and preserves its tempo and playlist memberships

#### Scenario: Offline analysis
- **WHEN** the model is installed and the network is unavailable
- **THEN** style analysis of available local audio can complete without a remote request

### Requirement: Honest style presentation
The system SHALL display at most two supported estimated styles near the track heading and distinguish pending, processing, uncertain and failed analysis. It MUST display “Style à confirmer” when the evidence is insufficient and MUST NOT present model scores as calibrated probabilities of correctness.

#### Scenario: Supported estimate
- **WHEN** analysis provides sufficiently supported labels
- **THEN** the detail displays the main style and at most one secondary style as estimated

#### Scenario: Ambiguous audio
- **WHEN** no style is sufficiently supported or a recording is too heterogeneous
- **THEN** the detail displays “Style à confirmer” without forcing a definitive label

#### Scenario: Failed analysis
- **WHEN** the model is unavailable or style processing fails
- **THEN** the detail explains that style analysis is unavailable and offers retry while retaining playback and valid tempo data

### Requirement: Persistent user correction
The system SHALL allow the user to select a musical style from the supported taxonomy, identify it as user-defined, and restore the automatic estimate. A manual correction SHALL take precedence in recommendations and survive restarts and automatic reanalysis.

#### Scenario: Manual correction
- **WHEN** the user saves a style correction
- **THEN** the heading identifies it as user-defined and recommendations use the corrected style

#### Scenario: Reanalysis after correction
- **WHEN** a manually corrected track is reanalyzed or the app restarts
- **THEN** its effective style remains the user's correction

#### Scenario: Restore estimate
- **WHEN** the user chooses to return to automatic estimation
- **THEN** the manual override is removed and the current automatic result or its uncertainty state is used

### Requirement: Recoverable independent analysis
The system SHALL persist versioned style results, resume unfinished processing after restart and permit retry after failure without losing existing audio, tempo data or manual corrections.

#### Scenario: Interrupted processing
- **WHEN** the app restarts after style processing was interrupted
- **THEN** unfinished style work can resume and completed current results are retained
