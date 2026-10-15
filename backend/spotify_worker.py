"""Spotify-only subprocess: no access to the library database or analysis model."""
import argparse
import fcntl
import json
import logging
import os
from pathlib import Path
import re
import secrets
import signal
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlencode, urlsplit


MESSAGES = {
    'timeout': 'La connexion Spotify a expiré. Relancez-la puis validez la page dans les 30 minutes.',
    'denied': 'La connexion Spotify a été refusée. Vous pouvez réessayer.',
    'port': 'Le port de connexion Spotify est occupé. Fermez l’autre connexion en cours puis réessayez.',
    'session': 'Spotify a refusé la session. Reconnectez votre compte Premium.',
    'premium': 'Un compte Spotify Premium est nécessaire pour récupérer ce morceau.',
    'audio': 'Spotify n’a pas fourni l’audio de ce morceau. Réessayez ou reconnectez votre compte.',
}


def private_directory(directory):
    directory.mkdir(parents=True, mode=0o700, exist_ok=True)
    directory.chmod(0o700)


def write_status(directory, **value):
    target = directory/'status.json'
    temporary = directory/'status.partial.json'
    temporary.write_text(json.dumps(value))
    temporary.chmod(0o600)
    temporary.replace(target)


def configuration(directory, save=False):
    from librespot.core import Session
    return (Session.Configuration.Builder().set_cache_enabled(False)
            .set_store_credentials(save)
            .set_stored_credential_file(str(directory/'credentials.pending.json')).build())


def callback_handler(state, result):
    class Callback(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def do_GET(self):
            url = urlsplit(self.path)
            query = parse_qs(url.query)
            valid = url.path == '/login' and secrets.compare_digest(query.get('state', [''])[0], state)
            if valid and query.get('code'):
                result['code'] = query['code'][0]
                message = 'Connexion reçue. Revenez dans MyLibApp pour importer votre musique.'
                self.send_response(200)
            elif valid and query.get('error'):
                result['error'] = 'denied'
                message = MESSAGES['denied']
                self.send_response(400)
            else:
                message = 'Retour de connexion invalide. Relancez la connexion depuis MyLibApp.'
                self.send_response(400)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(('<!doctype html><html lang="fr"><title>MyLibApp — Spotify</title><body><p>'+message+'</p></body></html>').encode())
    return Callback


def authenticate(directory):
    from librespot.core import Session
    from librespot.oauth import OAuth
    from librespot.mercury import MercuryRequests
    state = secrets.token_urlsafe(32)
    result = {}
    session = None
    error = 'session'
    pending = directory/'credentials.pending.json'
    try:
        with (directory/'auth.lock').open('w') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            oauth = OAuth(MercuryRequests.keymaster_client_id, 'http://127.0.0.1:5588/login', None)
            oauth.set_scopes(['streaming', 'user-read-private'])
            oauth._OAuth__generate_generate_code_verifier = lambda: secrets.token_urlsafe(64)
            error = 'port'
            with HTTPServer(('127.0.0.1', 5588), callback_handler(state, result)) as server:
                server.timeout = .5
                expires = time.time()+1800
                url = oauth.get_auth_url()+'&'+urlencode({'state': state})
                write_status(directory, status='pending', authUrl=url, expires=expires, pid=os.getpid())
                while not result and time.time() < expires:
                    server.handle_request()
            if not result.get('code'):
                error = result.get('error', 'timeout')
                raise RuntimeError(error)
            if (directory/'cancel-auth').exists():
                error = 'denied'
                raise RuntimeError(error)
            write_status(directory, status='connecting', expires=time.time()+90, pid=os.getpid())
            error = 'session'
            oauth.set_code(result.pop('code')).request_token()
            builder = Session.Builder(configuration(directory, save=True))
            builder.login_credentials = oauth.get_credentials()
            session = builder.create()
            if (directory/'cancel-auth').exists():
                error = 'denied'
                raise RuntimeError(error)
            if session.get_user_attribute('type') != 'premium':
                error = 'premium'
                raise RuntimeError(error)
            pending.chmod(0o600)
            pending.replace(directory/'credentials.json')
            write_status(directory, status='connected')
    except BlockingIOError:
        return
    except Exception:
        write_status(directory, status='error', error=error, message=MESSAGES[error])
    finally:
        pending.unlink(missing_ok=True)
        if session:
            session.close()


def download(directory, track_id, output):
    from librespot.core import Session
    from librespot.metadata import TrackId
    from librespot.audio.decoders import AudioQuality, VorbisOnlyAudioQuality
    session = None
    phase = 'session'
    try:
        if not re.fullmatch(r'[A-Za-z0-9]{22}', track_id):
            raise ValueError('Invalid track ID')
        session = Session.Builder(configuration(directory)).stored_file(str(directory/'credentials.json')).create()
        if session.get_user_attribute('type') != 'premium':
            phase = 'premium'
            raise RuntimeError(phase)
        phase = 'audio'
        stream = session.content_feeder().load(TrackId.from_base62(track_id), VorbisOnlyAudioQuality(AudioQuality.VERY_HIGH), False, None)
        track = stream.track
        audio = stream.input_stream.stream()
        written = 0
        with output.open('wb') as file:
            while True:
                data = audio.read(65536)
                if not data:
                    break
                written += file.write(data)
                if written > 200_000_000:
                    raise RuntimeError('Unexpected audio size')
        if not written:
            raise RuntimeError('Empty audio')
        images = track.album.cover_group.image
        image = max(images, key=lambda i:i.width*i.height) if images else None
        print(json.dumps({'title':track.name, 'author':', '.join(a.name for a in track.artist),
                          'duration':track.duration/1000,
                          'thumbnail':'https://i.scdn.co/image/'+image.file_id.hex() if image else None}), flush=True)
    except Exception:
        output.unlink(missing_ok=True)
        if phase == 'session':
            write_status(directory, status='error', error=phase, message=MESSAGES[phase])
        print(json.dumps({'error':MESSAGES[phase]}), flush=True)
    finally:
        if session:
            session.close()


def main():
    os.umask(0o077)
    logging.disable(logging.CRITICAL)
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['auth', 'download'])
    parser.add_argument('--directory', type=Path, required=True)
    parser.add_argument('--track')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    private_directory(args.directory)
    signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(SystemExit(0)))
    if args.action == 'auth':
        authenticate(args.directory)
    else:
        download(args.directory, args.track, args.output)


if __name__ == '__main__':
    main()
