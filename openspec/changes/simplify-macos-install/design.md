## Context

The existing installer downloads the Node and Python project dependencies and the style model, but only after the user has manually installed Homebrew, Node.js 24+, Python 3.13 and FFmpeg. They must also download and unpack the source archive, find its folder in Terminal and run separate commands to install and launch. The app supports Apple Silicon Macs and its local data lives separately from the source tree.

## Goals / Non-Goals

**Goals:**
- Reduce first setup to one command copied from the official repository page.
- Check macOS version and Apple Silicon before making changes.
- Bootstrap Homebrew when needed, install Node.js, Python 3.13 and FFmpeg, download current source, run the existing dependency/model setup and start MyLib.
- Keep the installer repeatable for updates and preserve music, playlists, analysis data and Spotify state.
- Make failures actionable in plain French, and document the same behavior in French and English.

**Non-Goals:**
- A self-contained DMG, a signed/notarized release, or public release automation.
- Hiding macOS/Apple security prompts or bypassing the user's password request.
- Windows, Linux or Intel Mac support.

## Decisions

- The documented entry point is one command: `curl -fsSL https://raw.githubusercontent.com/Elvinzer/MyLibApp-dj/main/scripts/install-mac.sh | /bin/bash`.
- The bootstrap script verifies Apple Silicon and macOS 15+, uses the official Homebrew installer only when Homebrew is absent, then installs the app's pinned system prerequisites through Homebrew.
- Download the repository source archive directly with `curl`/`tar`; do not require Git or ask the user to handle ZIP files.
- Store the runnable checkout in `~/Applications/MyLibApp` so MyLib.command remains easy to find and can resolve files relative to itself. Keep personal library data in the existing Application Support directory.
- If the install directory was created by this installer, update its source in place and rerun dependency/model setup. Never overwrite an unrelated folder at that path.
- Run MyLib after setup in the same Terminal session. Explain that the user keeps that window open while listening, can stop the server with Ctrl+C, and can later double-click MyLib.command from the installed folder.
- Installation may require the user to accept an Apple Command Line Tools dialog and enter their Mac password for Homebrew. Detect/report these steps instead of implying the command is always unattended.
- Treat the installer as a shell script that needs network access and show progress, a clear source/target, and actionable failure messages.

## Risks / Trade-offs

- Piping a remote script to a shell is concise but asks users to trust the repository's current installer. Link only the official project repository and keep the script readable, scoped and idempotent.
- Homebrew and Apple may show first-run prompts that cannot be suppressed safely; the docs must explain how to accept them and resume.
- Installing developer runtimes increases disk use and takes time; provide progress messages and do not hide the long first-run download.
- Updating source in place can be interrupted; stage the archive before replacing files, avoid deleting user data, and make rerunning the same command recover setup.

## Migration Plan

1. Replace DMG tasks/specs with one-command bootstrap and documentation tasks.
2. Implement and test the bootstrap script and make the existing project installer safe to rerun.
3. Update both language guides and quick-start sections.
4. Validate shell syntax, supported-platform checks, install/update safety, and existing project tests.

## Open Questions

- The command follows the public `main` branch because there is no published installer release yet. A future versioned release can pin an installer revision without changing this user flow.
