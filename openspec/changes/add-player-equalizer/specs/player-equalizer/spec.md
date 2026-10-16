## Purpose

Permettre de personnaliser le rendu sonore de l'écoute dans MyLib avec des presets et des réglages accessibles, conservés localement sans modifier les morceaux.

## ADDED Requirements

### Requirement: Global real-time equalization
The system SHALL provide a global ten-band equalizer adjustable during playback, initially disabled with neutral settings. Playback position, queue, looping and volume controls MUST remain usable. Equalization MUST NOT modify source files, exports or BPM/style analysis.

#### Scenario: Adjust while listening
- **WHEN** a user changes a band while a local track is playing with equalization enabled
- **THEN** the sound changes progressively without restarting the track or changing its playback position

#### Scenario: Change track
- **WHEN** the user changes tracks
- **THEN** the current global equalizer settings and activation state remain in effect without genre-based preset switching

### Requirement: Built-in and personal presets
The system SHALL offer Neutre, Rock, Techno, House, Hip-hop, Pop, Voix, Basses renforcées, Basses réduites and Aigus adoucis with short descriptions. Users MUST be able to save, rename and delete personal presets. Built-in presets MUST remain immutable and personal names MUST be nonempty and unambiguous.

#### Scenario: Modify a preset
- **WHEN** a user adjusts a band after selecting Techno
- **THEN** the interface shows Techno as modified and offers saving under a personal name without changing the built-in preset

#### Scenario: Replace or delete personal settings
- **WHEN** a user edits an existing personal preset
- **THEN** its saved settings change only through an explicit replacement action
- **AND** deleting the active preset retains the current sound as a custom setting

#### Scenario: Invalid preset name
- **WHEN** a user submits an empty or conflicting name
- **THEN** the interface explains the problem near the field and preserves the unsaved settings

### Requirement: Distinct close disable and reset actions
The system SHALL distinguish closing the panel, disabling the effect and resetting bands. Closing MUST preserve sound and settings. Disabling MUST preserve the curve for comparison. Resetting MUST select Neutre with all bands at zero while preserving activation state.

#### Scenario: Compare and restore
- **WHEN** a user disables and then re-enables the equalizer
- **THEN** the original curve returns without requiring it to be re-entered

#### Scenario: Configure while disabled
- **WHEN** a user chooses a preset while equalization is disabled
- **THEN** the preset is prepared without enabling the effect and the interface explains that activation is needed to hear it

#### Scenario: Close or reset
- **WHEN** a user closes the panel
- **THEN** the sound remains unchanged
- **AND** using Remettre à plat instead sets all bands to zero and retains activation state

### Requirement: Persistent local preferences
The system SHALL restore activation state, current settings and personal presets across application restarts on the same device. Invalid stored data MUST NOT prevent playback. Storage failures MUST be reported without blocking temporary adjustments.

#### Scenario: Restart
- **WHEN** the user restarts MyLib with valid saved settings
- **THEN** the equalizer restores those settings and personal presets

#### Scenario: Storage unavailable
- **WHEN** preferences cannot be saved
- **THEN** current adjustments remain usable and the interface reports that they could not be saved

### Requirement: Progressive and accessible controls
The system SHALL expose an equalizer control from the player on desktop and mobile. Preset selection MUST be available before opening advanced bands. Each band MUST expose its frequency and dB value, keyboard control and an alternative to dragging. Active state MUST be conveyed independently of color. The panel MUST support closing with Escape and restoring focus.

#### Scenario: Mobile access
- **WHEN** a user opens the equalizer on a narrow screen
- **THEN** presets and advanced controls are operable without horizontal scrolling or controls hidden behind the player

#### Scenario: Keyboard adjustment
- **WHEN** a keyboard user opens advanced settings and focuses a band
- **THEN** they can read and change its value, save the preset and close the panel with visible focus throughout

### Requirement: Managed audio level
The system SHALL compensate for combined filter amplification and transition settings progressively to limit saturation and abrupt sound changes. The interface MUST explain automatic level adjustment when applicable. Built-in presets MUST be checked on representative audio before release.

#### Scenario: Boost multiple bands
- **WHEN** several bands are raised on a source near full level
- **THEN** compensation accounts for their combined response and the configured protection keeps output within its documented level limits under the validation signals

### Requirement: Compatible playback fallback
The system SHALL maintain playback when equalization is unavailable for a source or environment and explain when the effect is not applied. Unsupported external previews MUST NOT silently become inaudible because of equalization.

#### Scenario: Unsupported preview
- **WHEN** an external preview cannot be processed
- **THEN** it plays through the supported direct playback path with an explicit equalizer-unavailable indication
- **AND** returning to a supported local track restores the user's equalization settings

#### Scenario: Audio processing unavailable
- **WHEN** the environment cannot initialize audio processing
- **THEN** playback remains available without the effect and the interface explains its unavailability
