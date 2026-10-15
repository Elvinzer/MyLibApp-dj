#!/bin/zsh
set -e
cd "${0:A:h}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
for dependency in node ffmpeg ffprobe; do
  if ! command -v "$dependency" >/dev/null; then
    echo "Dépendance manquante : $dependency. Consultez README.md."
    read '?Appuyez sur Entrée pour fermer.'
    exit 1
  fi
done
if command -v python3.13 >/dev/null; then
  python_cmd=python3.13
elif command -v python3 >/dev/null; then
  python_cmd=python3
else
  echo 'Python 3.13 est nécessaire. Consultez README.md / README.en.md.'
  exit 1
fi
if ! "$python_cmd" -c 'import sys; sys.exit(0 if sys.version_info[:2] == (3, 13) else 1)'; then
  echo 'Installez Python 3.13 : brew install python@3.13. Consultez README.md / README.en.md.'
  exit 1
fi
if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)'; then
  echo 'Node.js 24 ou plus récent est nécessaire. Consultez README.md / README.en.md.'
  exit 1
fi
"$python_cmd" -m venv .venv
.venv/bin/python -m pip install -r requirements.lock
.venv/bin/python scripts/install-style-model.py
.venv/bin/python scripts/install-spotify.py
npm ci
npm run build
echo 'MyLib est installée. Ouvrez MyLib.command pour écouter votre musique.'
