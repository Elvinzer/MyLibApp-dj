"""Install the independently versioned Spotify worker without changing app dependencies."""
import hashlib
from pathlib import Path
import subprocess
import sys
import venv

root = Path(__file__).resolve().parents[1]
directory = root/'.spotify-venv'
lock = root/'requirements-spotify.lock'
digest = hashlib.sha256(lock.read_bytes()).hexdigest()
marker = directory/'.requirements-sha256'
python = directory/'bin/python'
if not python.exists():
    venv.EnvBuilder(with_pip=True).create(directory)
if not marker.exists() or marker.read_text().strip() != digest:
    subprocess.run([str(python), '-m', 'pip', 'install', '-r', str(lock)], check=True)
subprocess.run([str(python), '-c', 'from librespot.core import Session; from librespot.audio.decoders import AudioQuality'], check=True)
marker.write_text(digest+'\n')
print('Moteur Spotify isolé vérifié et installé.')
