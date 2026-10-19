#!/bin/zsh
set -euo pipefail
cd "${0:A:h}"
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:$PATH"

for dependency in node ffmpeg ffprobe python3.13; do
  if ! command -v "$dependency" >/dev/null 2>&1; then
    echo "Outil manquant : $dependency. Relancez la commande d’installation MyLib." >&2
    exit 1
  fi
done

if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)'; then
  echo 'MyLib nécessite Node.js 24 ou plus récent.' >&2
  exit 1
fi
if ! python3.13 -c 'import sys; sys.exit(0 if sys.version_info[:2] == (3, 13) else 1)'; then
  echo 'MyLib nécessite Python 3.13.' >&2
  exit 1
fi

# Rebuild the locked virtual environment so rerunning the installer also repairs it.
python3.13 -m venv --clear .venv
.venv/bin/python -m pip install -r requirements.lock
.venv/bin/python scripts/install-style-model.py
.venv/bin/python scripts/install-spotify.py
npm ci
npm run build
echo 'Installation terminée. MyLib va démarrer.'
