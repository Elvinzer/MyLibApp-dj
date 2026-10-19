## 1. One-command installer

- [x] 1.1 Add a macOS bootstrap script that validates the supported Mac, installs missing prerequisites, downloads the project archive, and explains prompts and failures.
- [x] 1.2 Make source refresh safe and repeatable, protect unrelated paths, and preserve user data on reinstall/update.
- [x] 1.3 Make the existing project installer rerunnable and launch MyLib automatically when one-command setup completes.

## 2. Novice user documentation

- [x] 2.1 Replace the French multi-step setup with the single command, explain first-run prompts, launch/quit, updates, and troubleshooting.
- [x] 2.2 Update the English guide and both README quick starts to match the real installer behavior.

## 3. Verification

- [x] 3.1 Validate shell syntax and installer platform/safety checks without installing or removing system software.
- [x] 3.2 Run relevant project tests and OpenSpec validation; inspect the final diff for obsolete DMG/signing instructions.
