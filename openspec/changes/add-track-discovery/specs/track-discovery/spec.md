## Purpose
Permettre la préparation de sélections musicales à partir d’un morceau en distinguant les fichiers possédés et les découvertes externes.
## ADDED Requirements
### Requirement: Contextual exploration
The system SHALL open suggestions in one action, keep the reference version visible and separate local and external results. Users SHALL refine by track, artist or style and tempo without automatic playback.
#### Scenario: Refine without losing context
- **WHEN** the user changes tab or opens refinement
- **THEN** selection and playback remain intact and per-tab position is preserved
### Requirement: Honest discovery and preview
The system SHALL use real external results, name the source, show unknown BPM as unknown and avoid unsupported audio similarity claims. Previews SHALL stream only on explicit action through the single player with attribution and a store link.
#### Scenario: External unavailable
- **WHEN** the external catalogue fails
- **THEN** a retry is offered and local results and retained ideas remain usable
### Requirement: Persistent reversible selection
The system SHALL retain local and external ideas across reloads, allow removal and distinguish available, importing, failed and unavailable files.
#### Scenario: Retain an external idea
- **WHEN** the user retains an external result
- **THEN** it remains in the list with selected state and survives reload without requiring an import
### Requirement: Import association and playlist preparation
The system SHALL associate an explicitly provided supported source link with a retained discovery, show import progress and recovery, and save available selected files atomically into a playlist. Unavailable ideas SHALL remain retained. Playlist additions SHALL be undoable without removing pre-existing members.
#### Scenario: Mixed selection
- **WHEN** a selection contains available and external titles
- **THEN** only available files are added, the count is explicit and external ideas remain retained
### Requirement: Accessible responsive interaction
The system SHALL provide named keyboard controls, visible focus, modal focus restoration, touch targets at least 44 CSS px and layouts without horizontal overflow or focus obscured by the player.
#### Scenario: Small screen
- **WHEN** suggestions are used at 375 px width
- **THEN** track actions remain visible and usable with no horizontal page scrolling
