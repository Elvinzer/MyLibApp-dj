## Why

The current first-run experience asks non-technical Mac users to install Homebrew, Node, Python and FFmpeg manually, download and unpack the repository, locate it in Terminal, and run multiple commands. This is too much friction.

## What Changes

- Replace the proposed DMG distribution with a single copy-and-paste macOS command that bootstraps prerequisites, downloads MyLib, installs its dependencies and analysis model, then launches it.
- Keep the existing local application data and media intact when the command is run again to update MyLib.
- Rewrite the French and English guides around the one-command install and clearly explain the few macOS prompts that may still require user action.

## Capabilities

### Modified Capabilities
- `macos-distribution`: provide and document a one-command Apple Silicon macOS installer instead of a self-contained DMG.

## Impact

The macOS install script, first-run installer, launch instructions, and French and English user documentation. This change does not publish a GitHub release, create Apple signing credentials, or introduce a DMG.
