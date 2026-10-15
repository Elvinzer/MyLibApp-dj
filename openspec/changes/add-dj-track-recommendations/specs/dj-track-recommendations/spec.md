## Purpose

Aider l'utilisateur à choisir un prochain morceau de sa bibliothèque pour une transition DJ en rendant explicites la proximité de tempo et la relation entre styles musicaux.

## ADDED Requirements

### Requirement: Explicit tempo reference
The system SHALL default to the track's corrected global BPM and allow explicit selection of the corrected selected-passage BPM. It SHALL display the active reference and default to an inclusive ±5 BPM tolerance, adjustable to ±2 or ±10 BPM. Only positive finite stable tempo references SHALL generate recommendations. Invalid selection tempo SHALL NOT silently fall back to global tempo.

#### Scenario: Initial detail view
- **WHEN** the user opens a track with a stable global estimate
- **THEN** recommendations use its corrected global BPM with ±5 BPM tolerance and display “Morceau complet” as the reference

#### Scenario: Selected passage reference
- **WHEN** the user chooses “Ma sélection” and adjusts a passage with stable valid BPM
- **THEN** recommendations refresh using that passage's corrected BPM and identify the selection as their reference

#### Scenario: Invalid selected passage
- **WHEN** the chosen passage is too short or its BPM is uncertain or unavailable
- **THEN** the panel explains why it cannot generate results and does not switch to the global BPM automatically

### Requirement: Library-only tempo eligibility
The system SHALL recommend only other existing library tracks with playable audio and a positive finite stable corrected global BPM inside the selected tolerance. It SHALL exclude the current track, missing audio and variable, uncertain or absent candidate tempos. It SHALL compare unrounded corrected values and MUST NOT silently multiply or divide candidate tempos to make them match.

#### Scenario: Inclusive boundary
- **WHEN** the reference is 160.2 BPM, tolerance is ±5 and candidates are at 165.2 and 165.3 BPM
- **THEN** the first candidate is eligible and the second is excluded

#### Scenario: Half-time candidate
- **WHEN** the reference is 160 BPM and a candidate's corrected global BPM is 80 BPM
- **THEN** that candidate is excluded at ±5 without an automatic octave adjustment

#### Scenario: Explicit candidate correction
- **WHEN** the user corrects the 80 BPM candidate to 160 BPM with its existing ×2 control
- **THEN** subsequent recommendations compare the candidate at 160 BPM

#### Scenario: Unreliable candidate
- **WHEN** another track has a variable or uncertain global tempo
- **THEN** it is excluded from the tempo recommendation list

### Requirement: Explainable style ordering and strict filter
The system SHALL default to “Styles proches”, ordering eligible candidates by same effective style, then recognized neighboring style, then other or unknown style. Within each group it SHALL sort by absolute BPM difference with deterministic tie-breaking. Effective styles SHALL respect manual corrections. “Même style” SHALL retain only exact shared effective labels. Neighbor relationships SHALL be explicit and symmetric. Every result SHALL describe its relation as “Même style”, “Style voisin” or “Tempo proche”.

#### Scenario: Default ordering
- **WHEN** an eligible same-style candidate has a 3 BPM difference and a neighboring-style candidate has a 1 BPM difference
- **THEN** the same-style candidate appears first and both display their distinct match reason

#### Scenario: Strict filter
- **WHEN** the user activates “Même style”
- **THEN** results contain only candidates sharing an effective style label with the source

#### Scenario: Unknown source style
- **WHEN** the source has no sufficiently supported style or manual correction
- **THEN** candidates are sorted by tempo difference, the tempo-only basis is explained and “Même style” is disabled with an explanation

### Requirement: Integrated recommendation presentation
The system SHALL display “À mixer ensuite” below the complete rhythm analysis grid, showing up to five initial results and five more per “Voir davantage” action while more results exist. A criteria change SHALL reset the visible limit to five. Each result SHALL display artwork or fallback, title, artist, known style, corrected BPM, signed tempo difference and match reason, and provide track-detail navigation, playback and add-to-playlist actions through existing app behavior. It MUST NOT start playback or create a playback queue automatically.

#### Scenario: Initial results and expansion
- **WHEN** eight eligible candidates exist
- **THEN** five are initially visible and “Voir davantage” reveals the remaining three

#### Scenario: Existing action integration
- **WHEN** the user listens to or adds a recommendation to a playlist
- **THEN** the existing player or playlist dialog performs that action without automatically opening the track detail

### Requirement: Responsive and accessible interactions
The panel SHALL support keyboard navigation, visible focus, named actions, announced selected controls, non-color match explanations and touch targets of at least 44 pixels. Narrow layouts SHALL use compact stacked results without horizontal page overflow. The persistent player SHALL NOT obscure recommendation actions or keyboard focus.

#### Scenario: Narrow viewport
- **WHEN** the panel is displayed on a narrow screen
- **THEN** result information and actions remain readable and operable without horizontal page scrolling

#### Scenario: Keyboard use
- **WHEN** the user operates filters and result actions by keyboard
- **THEN** focus remains visible, selected states are announced and dynamic ranking does not steal focus

### Requirement: Honest loading, empty and failure states
The system SHALL distinguish loading, refreshing, service failure, absent reference BPM, unavailable style and no matching candidates. It SHALL offer retry after failure and an explicit tolerance-expansion action when appropriate, without automatically changing criteria. Obsolete retained results SHALL be visibly identified and their actions disabled until refreshed. A style failure SHALL NOT block tempo-only results.

#### Scenario: No matches
- **WHEN** no candidate fits ±2 BPM
- **THEN** the panel explains the empty result and offers an explicit action to widen the tolerance

#### Scenario: Backend unavailable
- **WHEN** a recommendation request fails because the audio service is unavailable
- **THEN** the panel displays an error and retry action and does not present retained results as current

### Requirement: Recommendations track library and criteria changes
The system SHALL refresh for tempo/style corrections, selected passage changes in selection mode, completed imports and track deletion. It SHALL ignore responses for superseded criteria and never offer a deleted track as a current actionable result.

#### Scenario: Superseded selection request
- **WHEN** an older request finishes after the user changes the selected passage again
- **THEN** its response does not replace results for the latest passage

#### Scenario: Removed candidate
- **WHEN** a recommended track is deleted
- **THEN** it is removed from actionable recommendations and the list updates
