## MODIFIED Requirements

### Requirement: One-command Mac installation
The project SHALL provide one copy-and-paste command that checks compatibility, obtains required system tools, downloads the project, installs application dependencies and starts MyLib on supported Apple Silicon Macs.

#### Scenario: First installation on a supported Mac
- **WHEN** a user runs the documented command on macOS 15 or later with an Apple Silicon processor
- **THEN** the installer obtains Node.js 24+, Python 3.13 and FFmpeg when missing, downloads MyLib without requiring Git, prepares the project and analysis model, then starts MyLib

#### Scenario: Apple or Homebrew needs user action
- **WHEN** setup requires Apple Command Line Tools approval or Homebrew requests a Mac password
- **THEN** the installer explains the prompt, waits for setup to finish, and continues or reports a recoverable error

#### Scenario: Unsupported Mac
- **WHEN** the processor or macOS version is outside the supported configuration
- **THEN** the script exits before installing software and clearly states the supported configuration

### Requirement: Safe repeat installation
Rerunning the one-command installer SHALL update an installation created by MyLib, repair incomplete setup, and preserve personal user data without overwriting unrelated files.

#### Scenario: Update or recover an existing installation
- **WHEN** a user runs the command again after a completed or interrupted install
- **THEN** source and dependencies are refreshed, setup resumes, and media, playlists, analysis data and Spotify state remain available

#### Scenario: Installation path already belongs to another app
- **WHEN** the target folder exists without the MyLib installer marker
- **THEN** the script stops without deleting or replacing its contents and tells the user how to resolve the conflict

### Requirement: Novice-friendly instructions
French and English guides SHALL describe the one-command install, its possible prompts, launch/quit behavior, updates, supported hardware and common recovery steps.

#### Scenario: New user follows the guide
- **WHEN** a novice follows the guide on a supported Mac
- **THEN** they can copy one command, understand any unavoidable Apple/password prompt, and know how to use or stop MyLib
