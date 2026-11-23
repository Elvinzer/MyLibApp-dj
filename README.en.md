# MyLibApp-dj

[Français](README.md) · **English**

MyLib is a music library for preparing DJ sets. Import tracks from YouTube,
SoundCloud or Spotify, listen in your browser, check their tempo (BPM), make
playlists and export tracks as MP3s. The app interface is in French.

## Install MyLib

- **Apple Silicon Mac (M1 or newer) running macOS 15 or later** —
  [Follow the Mac installation guide](docs/installation.en.md). One command
  installs MyLib and opens your browser. You can get started without a GitHub
  account or programming experience.
- **Windows, Linux or Intel Mac** — This repository provides no installer
  for these platforms. The setup guide and command are for compatible Macs.

## Listen to your first track

1. In MyLib, paste a link to a track on YouTube, SoundCloud or Spotify.
2. Click **Importer** (Import). For Spotify, first click **Connecter Spotify**
   (Connect Spotify) and sign in with **Spotify Premium**.
3. Once the track is ready, click **Écouter** (Listen). Click its title to see
   the waveform, estimated tempo and style.

## Reopen, update or repair MyLib

- In Finder, press **Shift + Command + G**, enter `~/Applications/MyLibApp`,
  then open **MyLib.command**.
- Keep Terminal open while using MyLib. To quit, click the Terminal window and
  press **Ctrl+C**.
- To update or repair MyLib, quit the app and run the command in the
  [installation guide](docs/installation.en.md#update-or-repair) again.
  Your tracks and playlists stay on your Mac.

## Learn more

- [Troubleshooting and backups](docs/installation.en.md#troubleshooting)
- [Features and development commands (French)](docs/technical.fr.md)
- [Report a problem](https://github.com/Elvinzer/MyLibApp-dj/issues)

Only import content you are authorized to obtain. MTG/UPF provides the style
analysis model under [CC BY-NC-SA 4.0](backend/models/LICENSE). See its
[attribution](backend/models/README.md). Public access to this repository does
not grant a licence to reuse the code.
