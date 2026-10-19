# MyLibApp-dj

[Français](README.md) · **English**

Your personal music library for preparing DJ sets on a Mac: YouTube, SoundCloud
and Spotify imports, local playback, tempo (BPM) and style analysis, playlists,
similar-track discovery and MP3 export.

**Start here: [install and launch MyLib](docs/installation.en.md).**
No programming knowledge or GitHub account is required. One command installs
MyLib and its required tools; the app starts automatically when setup finishes.
The current application interface is in French; the guide explains the main
button names in English.

## What you need

- A **Mac with an Apple Silicon chip** (M1, M2, M3 or a later generation).
- **macOS 15 or newer**.
- Internet access to install tools and import tracks.
- Node.js, Python 3.13 and FFmpeg are installed by the setup command.
- A **Spotify Premium account only if you use Spotify imports**.

Windows, Linux and Intel Macs have not been validated for this version. Setup
downloads the public source code and configures MyLib on your Mac.

## Quick installation

Open Terminal, copy this line and press Return:

```sh
curl -fsSL https://raw.githubusercontent.com/Elvinzer/MyLibApp-dj/main/scripts/install-mac.sh | /bin/bash
```

The app starts automatically. To find it later, in Finder choose **Go → Home →
Applications → MyLibApp**, then double-click **MyLib.command**. This Applications
folder is inside your home folder. Keep the Terminal window open while listening;
press **Ctrl+C** to stop MyLib. Depending on your Mac, Apple may offer to install
its command-line tools and Homebrew may ask for your account password. The
[installation guide](docs/installation.en.md) explains these prompts and updates.
To update MyLib, stop it with **Ctrl+C** and run the same installation command
again; your data is kept.

## Your first track

1. Open MyLib, paste the link to an **individual** YouTube, SoundCloud or Spotify
   track, then click **Importer** (Import).
2. For Spotify, choose **Connecter Spotify** (Connect Spotify), approve the login
   in your browser, then click **Importer** again. Localized `intl-fr` links
   are accepted; album and playlist links are not.
3. Wait for preparation, then click **Écouter** (Listen). Click the title to see
   the waveform, estimated tempo and musical style.
4. **Titres similaires** (Similar tracks) separates **Ma bibliothèque** (My library)
   from **Découvrir** (Discover). **Affiner** (Refine) lets you start from the
   track, artist or style.
5. **Retenir** (Keep) saves an idea in **Ma sélection** (My selection), including
   after restarting. Save available tracks to a playlist when ready.
6. **MP3 complet** exports the entire track. **Afficher dans le Finder** reveals
   the local source file.

External discovery uses iTunes catalogue metadata. Previews are streamed only;
suggestions do not guarantee acoustic similarity or harmonic compatibility.
An external title requires a supported import link to obtain a local file in
MyLib. Rekordbox integration is not included.

## Adjust the sound

Open **Égaliseur** (Equalizer) in the player, enable it and choose a preset.
**Réglage personnalisé** exposes ten bands with keyboard and numeric controls.
**Enregistrer sous…** saves a personal preset, which can be renamed, explicitly
replaced or deleted. Disabling preserves your curve for comparison;
**Remettre à plat** resets all bands. Closing preserves the current sound.

Preferences stay in this browser for the current local address. Automatic level
compensation limits saturation. Unsupported external previews remain playable
without equalization, with an explanation. Original files and exports are unchanged.

## Where is my music stored?

Your tracks and playlists stay on your Mac in:

```text
~/Library/Application Support/MyLibApp/
```

In Finder, choose **Go → Go to Folder…** and paste that path. To back up your
library, quit MyLib and copy the folder to your backup drive. Your audio files
are not uploaded to GitHub.

Audio analysis runs locally. **Découvrir** sends search terms to Apple; imports
contact the selected platform. Spotify credentials remain in the private
`spotify/` subfolder. Do not share it.

## Help and documentation

- [Installation, launching, updates and troubleshooting — English](docs/installation.en.md)
- [Installation, lancement, mises à jour et dépannage — français](docs/installation.fr.md)
- [Detailed operation and development commands — French](docs/technical.fr.md)
- [Report an issue](https://github.com/Elvinzer/MyLibApp-dj/issues): include your
  macOS version, the step that failed and the error message, without credentials.

For development: `npm run dev`. To check the code: `npm test`,
`npm run typecheck`, `npm run build`. Advanced browser checks use agent-browser;
it is not required to install or use MyLib.

## Usage and third-party components

Only import content you are authorized to obtain and follow each platform’s
terms. Platform access can change.

The style model is downloaded and verified during installation; its weights are
not included in Git. MTG/UPF provides it under **CC BY-NC-SA 4.0**, which restricts
commercial use. See its [attribution](backend/models/README.md) and
[licence](backend/models/LICENSE). The Spotify client and other dependencies
retain their respective licences. Making this repository public does not, by
itself, grant a licence to reuse the project’s code.
