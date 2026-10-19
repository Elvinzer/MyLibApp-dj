# Install and launch MyLib on Mac

[Français](installation.fr.md) · **English** · [Back to the overview](../README.en.md)

This method is for Apple Silicon Macs (M1 or newer) running macOS 15 or later.
It installs MyLib, Node.js, Python, FFmpeg and the other required components.
You do not need a GitHub account or need to install Git, Homebrew or Xcode
yourself.

The first installation downloads several tools and may take a while. Make sure
you have an Internet connection and several gigabytes of free space.

## First installation

1. Open **Terminal**: press **Command + Space**, type “Terminal” and press Return.
2. Copy the line below, paste it into Terminal, and press Return:

   ```sh
   curl -fsSL https://raw.githubusercontent.com/Elvinzer/MyLibApp-dj/main/scripts/install-mac.sh | /bin/bash
   ```

3. Keep the Terminal window open during setup. Follow any prompts from macOS or
   Homebrew:
   - If Apple offers to install Command Line Tools, click **Install** and wait
     for it to finish.
   - If your Mac asks for your account password, enter it and press Return.
     **Nothing appears as you type**; this is normal.
   - Setup downloads Node.js, Python 3.13, FFmpeg, MyLib and its analysis model.
     Terminal shows its progress.
4. When setup finishes, MyLib starts and opens your browser.

The app files are stored in `~/Applications/MyLibApp`. Tracks, playlists,
analysis and Spotify connection data remain in
`~/Library/Application Support/MyLibApp/`.

## Use MyLib

Keep the Terminal window open while listening. Closing only the browser tab does
not stop MyLib. To stop it, click the Terminal window and press **Ctrl+C**.

For later launches, open `~/Applications/MyLibApp` in Finder and double-click
**MyLib.command**. If you cannot find the folder, choose **Go → Go to Folder…**
in Finder, enter `~/Applications/MyLibApp`, and press Return.

## Update or repair

Run the same installation command in Terminal again. It downloads the latest
project version and reinstalls its dependencies. Your tracks, playlists,
analysis and Spotify connection remain in place. You can also rerun it if an
installation was interrupted.

If MyLib is already running, stop it with **Ctrl+C** before updating.

## Troubleshooting

- **An Apple window appears**: accept the Command Line Tools installation and
  wait for it to finish. If Terminal says it timed out, run the same command
  again.
- **Homebrew asks for your password**: enter your Mac account password. No
  characters appear as you type.
- **A download is interrupted**: check your Internet connection and free space,
  then run the same command again.
- **Terminal reports that a MyLib folder already exists**: it found
  `~/Applications/MyLibApp` without the installer marker. In Finder, open your
  home folder and then `Applications`; rename or move the existing folder and
  run the command again. No files were deleted.
- **MyLib does not start**: keep the Terminal error message and open a
  [GitHub issue](https://github.com/Elvinzer/MyLibApp-dj/issues). Include your
  macOS version and the step that failed, but do not attach credentials or your
  library contents.

To back up your library, quit MyLib and copy
`~/Library/Application Support/MyLibApp/` to a backup drive. Do not share the
`spotify/` subfolder, which contains connection information.

For detailed usage and development information, see the
[technical guide](technical.fr.md).
