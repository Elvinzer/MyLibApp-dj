"""Install the independently versioned Spotify worker without changing app dependencies."""
import hashlib
from pathlib import Path
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
directory = root/'.spotify-venv'
lock = root/'requirements-spotify.lock'
digest = hashlib.sha256(lock.read_bytes()).hexdigest()
marker = directory/'.requirements-sha256'
python = directory/'bin/python'
probe = [str(python), '-c', 'from librespot.core import Session; from librespot.audio.decoders import AudioQuality']

# Older installs copied the Homebrew executable, which can still exist after
# Homebrew removes the framework it was linked against.
reusable = (
    python.is_symlink() and python.exists()
    and marker.is_file() and marker.read_text().strip() == digest
    and subprocess.run(probe, capture_output=True).returncode == 0
)
if not reusable:
    # Run Homebrew's stable entry point instead of the venv's versioned base.
    version = f'{sys.version_info.major}.{sys.version_info.minor}'
    base_python = shutil.which(f'python{version}') or sys.executable
    marker.unlink(missing_ok=True)
    subprocess.run([base_python, '-m', 'venv', '--clear', '--symlinks', str(directory)], check=True)
    subprocess.run([str(python), '-m', 'pip', 'install', '-r', str(lock)], check=True)
    subprocess.run(probe, check=True)
    marker.write_text(digest+'\n')
print('Moteur Spotify isolé vérifié et installé.')
