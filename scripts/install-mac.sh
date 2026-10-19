#!/bin/bash
set -Eeuo pipefail

REPOSITORY="https://github.com/Elvinzer/MyLibApp-dj"
ARCHIVE_URL="https://codeload.github.com/Elvinzer/MyLibApp-dj/tar.gz/refs/heads/main"
INSTALL_DIR="${HOME}/Applications/MyLibApp"
MARKER="${INSTALL_DIR}/.mylib-install"
TEMP_DIR=""

fail() {
  printf '\nMyLib : %s\n' "$1" >&2
  printf 'Corrigez le problème puis relancez la même commande d’installation.\n' >&2
  exit 1
}

cleanup() {
  if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
    rm -rf "$TEMP_DIR"
  fi
}
trap cleanup EXIT
trap 'status=$?; printf "\nMyLib : une erreur est survenue (ligne %s).\n" "$LINENO" >&2; printf "Relancez la commande d’installation ; si le problème continue, copiez ce message pour demander de l’aide.\n" >&2; exit "$status"' ERR

printf 'Bienvenue dans l’installation de MyLib.\n'

[[ "$(uname -s)" == "Darwin" ]] || fail "ce programme fonctionne sur macOS uniquement."
[[ "$(uname -m)" == "arm64" ]] || fail "MyLib nécessite un Mac avec puce Apple Silicon (M1 ou plus récent)."

macos_version="$(sw_vers -productVersion)"
macos_major="${macos_version%%.*}"
[[ "$macos_major" =~ ^[0-9]+$ ]] || fail "impossible de vérifier la version de macOS."
(( macos_major >= 15 )) || fail "macOS 15 ou plus récent est nécessaire. Votre Mac utilise macOS ${macos_version}."

if [[ -e "$INSTALL_DIR" && ! -f "$MARKER" ]]; then
  fail "le dossier ${INSTALL_DIR} existe déjà et ne semble pas appartenir à MyLib. Aucun fichier n’a été remplacé. Renommez ce dossier dans le Finder, puis relancez la commande."
fi

if ! xcode-select -p >/dev/null 2>&1; then
  printf '\nUne fenêtre Apple peut vous demander d’installer les outils de ligne de commande. Acceptez-la, puis laissez cette fenêtre Terminal ouverte.\n'
  xcode-select --install >/dev/null 2>&1 || true
  tools_ready=0
  for _ in {1..120}; do
    if xcode-select -p >/dev/null 2>&1; then
      tools_ready=1
      break
    fi
    sleep 5
  done
  (( tools_ready == 1 )) || fail "les outils Apple ne sont pas encore installés. Acceptez la fenêtre Apple, attendez la fin, puis relancez la commande."
fi

brew=""
if command -v brew >/dev/null 2>&1; then
  brew="$(command -v brew)"
elif [[ -x /opt/homebrew/bin/brew ]]; then
  brew=/opt/homebrew/bin/brew
fi

if [[ -z "$brew" ]]; then
  printf '\nInstallation de Homebrew, le gestionnaire officiel utilisé pour les outils nécessaires à MyLib. Votre Mac peut demander le mot de passe de votre session.\n'
  /bin/bash -c "$(/usr/bin/curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  [[ -x /opt/homebrew/bin/brew ]] || fail "Homebrew ne s’est pas installé correctement."
  brew=/opt/homebrew/bin/brew
fi

eval "$($brew shellenv)"
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"

printf '\nVérification des outils nécessaires (Node.js, Python et FFmpeg)…\n'
"$brew" install python@3.13 ffmpeg
if ! "$brew" list --versions node >/dev/null 2>&1; then
  "$brew" install node
fi
if ! command -v node >/dev/null 2>&1 || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)'; then
  printf 'Mise à niveau vers Node.js 24 ou plus récent…\n'
  "$brew" upgrade node
fi

TEMP_DIR="$(/usr/bin/mktemp -d "${TMPDIR:-/tmp}/mylib-install.XXXXXX")"
printf '\nTéléchargement de MyLib depuis le dépôt officiel…\n%s\n' "$REPOSITORY"
/usr/bin/curl -fL --retry 3 --retry-delay 2 "$ARCHIVE_URL" -o "$TEMP_DIR/mylib.tar.gz"
/usr/bin/tar -xzf "$TEMP_DIR/mylib.tar.gz" -C "$TEMP_DIR"
SOURCE_DIR=""
for candidate in "$TEMP_DIR"/MyLibApp-dj-*; do
  if [[ -d "$candidate" ]]; then
    SOURCE_DIR="$candidate"
    break
  fi
done
[[ -n "$SOURCE_DIR" && -f "$SOURCE_DIR/package.json" ]] || fail "l’archive téléchargée ne contient pas le projet attendu. Vérifiez votre connexion Internet."

mkdir -p "${HOME}/Applications" "$INSTALL_DIR"
printf 'MyLib installer v1\n' > "$MARKER"
/usr/bin/ditto "$SOURCE_DIR" "$INSTALL_DIR"

cleanup
TEMP_DIR=""
printf '\nInstallation de MyLib et de son modèle d’analyse. Cela peut prendre quelques minutes.\n'
cd "$INSTALL_DIR"
zsh Installer.command

printf '\nMyLib est prête. La fenêtre Terminal reste ouverte pendant l’utilisation.\n'
printf 'Pour arrêter MyLib, cliquez dans cette fenêtre et appuyez sur Ctrl+C.\n'
printf 'Pour la prochaine utilisation, ouvrez Applications → MyLibApp → MyLib.command.\n\n'
exec zsh "$INSTALL_DIR/MyLib.command"
