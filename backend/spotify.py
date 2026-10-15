"""Main-runtime bridge to the independently installed Spotify subprocess."""
import json
import os
from pathlib import Path
import subprocess
import threading
import time
from . import store

ROOT = Path(__file__).resolve().parents[1]
PYTHON = ROOT/'.spotify-venv/bin/python'
WORKER = ROOT/'backend/spotify_worker.py'
_lock = threading.RLock()
_auth = None


def directory():
    folder = store.ROOT/'spotify'
    folder.mkdir(mode=0o700, parents=True, exist_ok=True)
    folder.chmod(0o700)
    return folder


def status():
    folder = directory()
    available = PYTHON.is_file()
    try:
        state = json.loads((folder/'status.json').read_text())
    except (OSError, ValueError):
        state = {}
    pending = state.get('status') in ('pending', 'connecting')
    if pending:
        try:
            os.kill(int(state['pid']), 0)
            pending = state.get('expires', 0) > time.time()
        except (OSError, ValueError, KeyError):
            pending = False
        if not pending:
            state = {'status':'error', 'message':'La connexion Spotify a expiré. Relancez-la.'}
    connected = (folder/'credentials.json').is_file() and state.get('status') != 'error'
    return {'available':available, 'connected':connected,
            'status':state.get('status') if pending or state.get('status') == 'error' else 'connected' if connected else 'disconnected',
            'authUrl':state.get('authUrl') if pending else None,
            'message':state.get('message') if state.get('status') == 'error' else None}


def connect():
    global _auth
    with _lock:
        current = status()
        if not current['available']:
            raise RuntimeError('Le moteur Spotify est absent. Relancez Installer.command ou mettez MyLibApp à jour.')
        if current['status'] in ('pending', 'connecting'):
            return current
        folder = directory()
        (folder/'cancel-auth').unlink(missing_ok=True)
        (folder/'status.json').unlink(missing_ok=True)
        _auth = subprocess.Popen([str(PYTHON), str(WORKER), 'auth', '--directory', str(folder)],
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(40):
            current = status()
            if current['status'] in ('pending', 'connecting', 'error') or _auth.poll() is not None:
                return current
            time.sleep(.05)
        return {**current, 'status':'connecting'}


def disconnect():
    global _auth
    with _lock:
        (directory()/'cancel-auth').touch(mode=0o600)
        if _auth and _auth.poll() is None:
            _auth.terminate()
            try:
                _auth.wait(timeout=3)
            except subprocess.TimeoutExpired:
                _auth.kill(); _auth.wait()
        _auth = None
        for name in ('credentials.json', 'credentials.pending.json', 'status.json'):
            (directory()/name).unlink(missing_ok=True)


def close():
    """Stop only this runtime's pending OAuth worker; preserve the saved session."""
    global _auth
    with _lock:
        if _auth and _auth.poll() is None:
            _auth.terminate()
            try:
                _auth.wait(timeout=3)
            except subprocess.TimeoutExpired:
                _auth.kill(); _auth.wait()
        _auth = None


def download_command(track_id, output):
    if not status()['connected']:
        raise RuntimeError('Connectez votre compte Spotify Premium puis reprenez cet import.')
    return [str(PYTHON), str(WORKER), 'download', '--directory', str(directory()),
            '--track', track_id, '--output', str(output)]
