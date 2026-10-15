import json
import os
import socket
import subprocess
import sys
import threading
import urllib.error
import urllib.request
from http.server import HTTPServer

import pytest
from fastapi.testclient import TestClient
from backend import main, spotify, store, style_jobs
from backend.spotify_worker import callback_handler

TRACK = '2pg1fmJAdMRufef3RMg4CK'
URL = 'https://open.spotify.com/track/'+TRACK


@pytest.fixture
def library(tmp_path, monkeypatch):
    monkeypatch.setattr(store, 'ROOT', tmp_path)
    monkeypatch.setattr(spotify, 'PYTHON', __import__('pathlib').Path(sys.executable))
    monkeypatch.setattr(main, 'safe_public', lambda url, allowed=None: url)
    monkeypatch.setattr(style_jobs.StyleJobs, 'start', lambda self: None)
    monkeypatch.setattr(style_jobs.StyleJobs, 'close', lambda self: None)
    store.init()
    with TestClient(main.app, headers={'x-mylib-token':main.TOKEN}) as client:
        yield client


def test_spotify_normalization(library):
    expected = ('spotify:'+TRACK, URL, 'Spotify')
    assert main.normalize(URL+'?si=sharing&utm_source=instagram-direct') == expected
    assert main.normalize('https://open.spotify.com/intl-fr/track/'+TRACK+'/') == expected
    for path in ('playlist/'+TRACK, 'album/'+TRACK, 'track/short', 'embed/track/'+TRACK, 'track/'+TRACK+'/extra'):
        assert library.post('/import', json={'url':'https://open.spotify.com/'+path}).status_code == 400


def test_spotify_rejects_lookalike_host(monkeypatch):
    monkeypatch.setattr(socket, 'getaddrinfo', lambda *a: [(socket.AF_INET,socket.SOCK_STREAM,6,'',('93.184.216.34',443))])
    for url in ('https://open.spotify.com.evil.test/track/'+TRACK, 'https://open.spotify.com@evil.test/track/'+TRACK):
        with pytest.raises(ValueError):
            main.normalize(url)


def test_connection_required_duplicate_and_private_state(library, monkeypatch):
    assert library.post('/import', json={'url':URL}).status_code == 409
    assert store.tracks() == []
    folder = spotify.directory()
    credentials = folder/'credentials.json'
    credentials.write_text(json.dumps({'secret':'not-public'}))
    (folder/'status.json').write_text(json.dumps({'status':'connected', 'access_token':'not-public'}))
    submitted = []
    monkeypatch.setattr(main.POOL, 'submit', lambda *args: submitted.append(args))
    first = library.post('/import', json={'url':URL+'?si=one'}).json()
    second = library.post('/import', json={'url':URL+'?si=two'}).json()
    assert second['duplicate'] and first['track']['id'] == second['track']['id']
    assert len(submitted) == 1
    response = library.get('/spotify/status')
    assert response.json()['connected']
    assert 'secret' not in response.text and 'access_token' not in response.text
    assert folder.stat().st_mode & 0o777 == 0o700
    assert library.post('/spotify/disconnect').json()['connected'] is False
    assert not credentials.exists()


def test_expired_auth_cannot_appear_pending(library):
    (spotify.directory()/'status.json').write_text(json.dumps({'status':'pending','pid':os.getpid(),'expires':0,'authUrl':'https://accounts.spotify.com/authorize'}))
    state = library.get('/spotify/status').json()
    assert state['status'] == 'error' and state['authUrl'] is None


def test_callback_rejects_wrong_state_and_does_not_echo_code():
    result = {}
    server = HTTPServer(('127.0.0.1',0), callback_handler('expected-state', result))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        base = 'http://127.0.0.1:'+str(server.server_port)+'/login'
        with pytest.raises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(base+'?state=wrong&code=private-code')
        assert error.value.code == 400 and result == {}
        with urllib.request.urlopen(base+'?state=expected-state&code=private-code') as response:
            assert response.status == 200 and b'private-code' not in response.read()
        assert result == {'code':'private-code'}
    finally:
        server.shutdown(); server.server_close(); thread.join()


@pytest.mark.parametrize("metadata_duration", [10, 100])
def test_spotify_import_uses_direct_worker_and_exports_locally(tmp_path, monkeypatch, metadata_duration):
    monkeypatch.setattr(store, 'ROOT', tmp_path)
    monkeypatch.setattr(main, 'STYLE_JOBS', None)
    store.init()
    tid = 'spotify-test'
    data = dict(id=tid,source='Spotify',url=URL,title='Pending',author='',duration=0,status='queued',mediaReady=False,analysisReady=False,bpm=None,factor=1,hasCover=False)
    with store.db() as conn:
        conn.execute('INSERT INTO tracks VALUES (?,?,?)',(tid,'spotify:'+TRACK,json.dumps(data)))
    main.CANCEL[tid] = threading.Event()
    original_run = main.run
    commands = []
    monkeypatch.setattr(spotify, 'download_command', lambda track_id, output: ['spotify-fixture',str(output)])
    def run(args, track_id, timeout=900):
        commands.append(args)
        if args[0] == 'spotify-fixture':
            subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','sine=frequency=440:duration=10','-c:a','libvorbis',args[1]],check=True,capture_output=True)
            return json.dumps({'title':'50 DUB','author':'KRITIKAL, Jman','duration':metadata_duration}).encode()
        return original_run(args, track_id, timeout)
    monkeypatch.setattr(main, 'run', run)
    monkeypatch.setattr(main, 'analyze', lambda *a: {'bpm':140.2,'span':[140.2,140.2],'quality':'stable','points':[]})
    main.import_track(tid)
    track = store.get(tid)
    if metadata_duration == 100:
        assert track['status'] == 'error' and not track['mediaReady']
        assert 'incomplet' in track['error']
        return
    assert track['status'] == 'ready' and track['mediaReady'] and track['analysisReady']
    assert track['source'] == 'Spotify' and track['author'] == 'KRITIKAL, Jman'
    assert not any('yt_dlp' in arg for args in commands for arg in args)
    assert (tmp_path/'media'/tid/track['mediaSource']).is_file()
    export = main.build_export(tid)
    assert export.filename == 'KRITIKAL_Jman_50_DUB_Style_inconnu_140.2.mp3'
    assert export.path.is_file()


def test_worker_error_is_not_an_import_success(tmp_path, monkeypatch):
    monkeypatch.setattr(store, 'ROOT', tmp_path)
    store.init()
    tid = 'spotify-error'
    data = dict(id=tid,source='Spotify',url=URL,title='Pending',mediaReady=False,status='queued')
    with store.db() as conn:
        conn.execute('INSERT INTO tracks VALUES (?,?,?)',(tid,tid,json.dumps(data)))
    main.CANCEL[tid] = threading.Event()
    monkeypatch.setattr(spotify,'download_command',lambda *args:['worker'])
    monkeypatch.setattr(main,'run',lambda *args:b'{"error":"Spotify audio unavailable"}')
    main.import_track(tid)
    track = store.get(tid)
    assert track['status'] == 'error' and not track['mediaReady']
    assert track['error'] == 'Spotify audio unavailable'


def test_missing_engine_has_actionable_error(library, monkeypatch, tmp_path):
    monkeypatch.setattr(spotify, 'PYTHON', tmp_path/'missing-engine')
    response = library.post('/spotify/connect')
    assert response.status_code == 503
    assert 'moteur Spotify' in response.text


def test_disconnect_cancels_pending_auth_and_preserves_media(library):
    folder = spotify.directory()
    (folder/'credentials.pending.json').write_text('private')
    media = store.ROOT/'media'/'already-imported.ogg'
    media.parent.mkdir(exist_ok=True)
    media.write_bytes(b'existing-audio')
    assert library.post('/spotify/disconnect').status_code == 200
    assert (folder/'cancel-auth').exists()
    assert not (folder/'credentials.pending.json').exists()
    assert media.read_bytes() == b'existing-audio'
