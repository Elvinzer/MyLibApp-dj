# Install and launch MyLib on a Mac

[Français](installation.fr.md) · **English** · [Back to the overview](../README.en.md)

This guide starts from scratch. You do not need programming experience.
MyLib runs on your own Mac and opens its interface in your browser. There is
no website to host and no MyLib account to create. The current interface and
some installer messages are in French; the button glossary below translates them.

## 1. Check your Mac

Open **Apple menu → About This Mac**.

- **Chip:** Apple M1, M2, M3 or a later generation.
- **macOS:** 15 or newer for the Homebrew tools used in this guide.

You need Internet access, several gigabytes of free space for the tools and more
space for your music. Initial setup can take several minutes. Windows, Linux and
Intel Macs are not covered by this guide.

## 2. Open Terminal

Press **Command + Space**, type **Terminal**, then press Return.
Terminal lets you ask your Mac to run a written command.

Copy each command from its code box, paste it into Terminal and press **Return**.
Wait for the command to finish before continuing. Do not type the three backticks
that surround code boxes in the source of this guide.

## 3. Install the required tools once

### Homebrew

Homebrew installs the tools MyLib needs. Visit the official
[brew.sh](https://brew.sh/) website and follow **Install Homebrew**. You can use
the `.pkg` installer offered on that site or its displayed installation command.

If you are asked for a password, use your Mac login password. Nothing appears
while you type it; that is normal. Press Return when finished.

Follow any **Next steps** printed at the end to make Homebrew available in
Terminal. Close and reopen Terminal if needed, then check:

```sh
brew --version
```

You should see a version number. If you see `command not found`, follow
Homebrew’s installation **Next steps** again.

### Node.js, Python and FFmpeg

Run:

```sh
brew install node python@3.13 ffmpeg
```

These tools run the interface, analyse music and read/convert audio files.
You do not need to learn their individual commands. The project uses
**Node.js 24 or newer** and **Python 3.13 specifically**. The installer chooses
`python3.13` even if another Python version is already installed. See the
[Homebrew Python 3.13 page](https://formulae.brew.sh/formula/python@3.13).

Check that they are available:

```sh
node --version
python3.13 --version
ffmpeg -version
```

For Node, the first number after `v` must be at least 24. Python should start with
`Python 3.13`. FFmpeg prints several lines; that is normal.

## 4. Download MyLib without Git

1. Open [the MyLibApp-dj repository](https://github.com/Elvinzer/MyLibApp-dj).
2. Click the green **Code** button, then **Download ZIP**.
3. In Finder, open **Downloads** and double-click the ZIP to extract it, unless
   macOS has already done so.
4. Move the extracted folder, usually `MyLibApp-dj-main`, into **Documents**.
   You can rename it `MyLibApp-dj`. Keep this folder: it contains the installer
   and is used for future updates.

You do not need a GitHub account to download the ZIP. Do not look for a `.app`
file inside it; you will create the application on your Mac.

## 5. Install MyLib

In Terminal:

1. Type `cd `, with **a space after cd**, without pressing Return yet.
2. Drag the extracted MyLibApp-dj folder from Finder into Terminal.
3. Press Return. Terminal is now working inside that folder.
4. Paste and run:

```sh
zsh Installer.command
```

The installer downloads dependencies and the analysis model, then prepares the
interface. Keep the window open. Its final French message, **MyLib est installée**,
means MyLib is installed. You can also double-click `Installer.command` in Finder;
the command above is useful if macOS will not open this file type directly.

If an error appears, stop at this step and use the troubleshooting section below.
Do not continue until installation succeeds.

## 6. Launch for the first time

In the same Terminal window and project folder:

```sh
zsh MyLib.command
```

Your browser opens automatically. If it does not, copy the address printed after
**MyLibApp est prête**, such as `http://127.0.0.1:3000`, into your browser’s address
bar. The port number can change, so use the address actually shown.

**Keep Terminal open while using this launch method.** To stop MyLib, click the
Terminal window and press **Ctrl+C**. Closing the browser tab alone does not stop
the services and does not delete your music.

For later launches in this mode, double-click **MyLib.command**. You do not need
to run the installer every time.

## 7. Optional: create an app for your Dock

This avoids keeping a Terminal window open during everyday use. Stop the previous
launch with Ctrl+C, then install the Apple tools required to build the native launcher:

```sh
xcode-select --install
```

Follow the Apple installation window and wait for it to finish. If the tools are
already installed, Terminal will say so; you can continue. You only need the
command-line tools, not the full Xcode application.

Still inside the project folder, run:

```sh
npm run package:mac
```

Wait for **Application installée : /Applications/MyLib.app**. Open
**Finder → Applications → MyLib**, or its Desktop shortcut. You can drag the app
to your Dock. It opens the browser and manages background services.
**MyLib → Quitter MyLib** (Quit MyLib) stops services started by the application.

The bundle is built for your Mac; do not copy it to another computer as an
installer. Node.js, Python and FFmpeg remain required. This is a locally built
app, not an Apple-notarized application. If macOS blocks it, consult
[Apple’s security instructions](https://support.apple.com/102445) and verify the
project’s source. Launching with `MyLib.command` remains available.

If your account cannot write to `/Applications`, install for your own account instead:

```sh
MYLIB_APP_DEST="$HOME/Applications/MyLib.app" npm run package:mac
```

Open `~/Applications` using **Finder → Go → Go to Folder…**. A Desktop shortcut
is not created automatically for this alternative location.

## 8. Import a track and prepare a set

| French button | Meaning |
|---|---|
| Importer | Import an individual YouTube, SoundCloud or Spotify track link |
| Écouter | Listen to an available local track |
| Corriger | Correct the estimated style; ÷2 and ×2 correct tempo ambiguity |
| Titres similaires | Find tracks around a reference in your library |
| Ma bibliothèque / Découvrir | My library / Discover: distinguish local files from the external iTunes catalogue |
| Affiner | Refine by track, artist or style and adjust local tempo tolerance |
| Retenir / Ma sélection | Keep an idea / My selection: save ideas across restarts |
| Importer un lien | Associate a supported source link with a discovery |
| Enregistrer en playlist | Add available files to an existing or new playlist |
| MP3 complet | Export the entire track, regardless of the selected waveform passage |
| Afficher dans le Finder | Reveal the local source file in Finder |

Spotify imports require **Premium**. Click **Connecter Spotify**, complete the
login in your browser, then import again using the retained link. The authorization
is listed as **Spotify for Desktop**, the identity used by the client. Never
paste your Spotify password into MyLib.

Album links, playlist links, live streams and private content are not supported.
Access can depend on your country, account and platform changes. Only import
content you are authorized to obtain.

Tempo and style are estimates. iTunes suggestions use catalogue metadata; listen
before preparing transitions. Streamed iTunes previews are not imported files.
Rekordbox integration is not included.

## 9. Update MyLib

The app’s update prompt compares your **local project folder** with the installed
copy. It does not automatically download a new version from GitHub.

To update from the public repository:

1. Quit MyLib.
2. Download and extract the latest ZIP from GitHub.
3. Open Terminal in that new folder, as described in step 5.
4. Run `zsh Installer.command`.
5. If you use the Dock app, run `npm run package:mac` afterwards.
6. Reopen MyLib. Your tracks and playlists remain in their separate data folder.

If you used Git, run `git pull --ff-only` inside the existing project instead of
downloading a new ZIP, then run the same installation commands.

## 10. Back up your library and get help

Your data is in `~/Library/Application Support/MyLibApp/`. In Finder, choose
**Go → Go to Folder…** and paste that path. Quit MyLib before copying this folder
to your backup drive. Its `spotify/` subfolder contains your session:
**do not publish or share it**.

| Problem | What to do |
|---|---|
| `command not found: brew`, `node` or `ffmpeg` | Repeat step 3, including Homebrew’s Next steps, and reopen Terminal. |
| The installer requires Python 3.13 | Run `brew install python@3.13`, then `zsh Installer.command`. Another Python version does not replace this prerequisite. |
| `no such file: Installer.command` | Terminal is in the wrong folder. Repeat step 5 and drag the extracted folder into Terminal. |
| Installation download interrupted | Check Internet access and free disk space, then run `zsh Installer.command` again. |
| `Failed to fetch` or an interrupted connection | Reopen MyLib and use its current address. An old tab may point to a stopped server. Retry using the retained link. |
| Spotify login fails | Check Premium, complete the browser login and retry. Authorization expires after 30 minutes; local port 5588 must be available. |
| Import fails | Use Reprendre / Réessayer (Resume / Retry). Some links or content are inaccessible to the import engine. |
| Dock app creation fails | Check the Apple command-line tools and that the first installer completed. You can continue using MyLib.command. |

To get help, [open a GitHub issue](https://github.com/Elvinzer/MyLibApp-dj/issues)
with your macOS version, the failing step and the exact error. Logs are in the
`logs/` data subfolder. Review them and remove private information before sharing.
Do not attach your library, credentials or the `spotify/` folder.

A more detailed [technical guide is available in French](technical.fr.md).
