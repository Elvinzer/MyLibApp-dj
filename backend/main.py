import concurrent.futures
import anyio
import json
import logging
from logging.handlers import RotatingFileHandler
import os
import re
import secrets
import shutil
import socket
import ipaddress
import subprocess
import threading
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from . import store, spotify
from .audio import analyze
from .styles import taxonomy, effective
from .media_files import (export_filename, media_playback_path, media_source_path,
                          media_lock, rename_media_files)
from .style_jobs import StyleJobs
from .recommendations import rank, valid_bpm
from .discovery import router as discovery_router

TOKEN = os.environ.get('MYLIB_TOKEN', secrets.token_hex(32))
POOL = concurrent.futures.ThreadPoolExecutor(max_workers=1)
CANCEL = {}
PROCESSES = {}
STYLE_JOBS = None


class _PinnedAsyncFile:
    def __init__(self, file):
        self.file = file

    async def read(self, size=-1):
        return await anyio.to_thread.run_sync(self.file.read, size)

    async def seek(self, offset, whence=0):
        return await anyio.to_thread.run_sync(self.file.seek, offset, whence)


class PinnedMediaResponse(FileResponse):
    """Stream an already-open media file so a concurrent rename cannot break playback."""
    def __init__(self, path):
        self.pinned_file = open(path, 'rb')
        super().__init__(path, media_type='audio/mp4', stat_result=os.fstat(self.pinned_file.fileno()))

    @asynccontextmanager
    async def _open_file(self):
        try:
            yield _PinnedAsyncFile(self.pinned_file)
        finally:
            self.pinned_file.close()

    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        scope['extensions'] = {key:value for key,value in scope.get('extensions', {}).items()
                               if key != 'http.response.pathsend'}
        try:
            await super().__call__(scope, receive, send)
        finally:
            self.pinned_file.close()


def safe_public(url, allowed=None):
    p = urlparse(url)
    if p.scheme != 'https' or not p.hostname or p.username or p.password or p.port not in (None, 443):
        raise ValueError('Ce lien HTTPS n’est pas valide.')
    host = p.hostname.lower()
    if allowed and host not in allowed:
        raise ValueError('Collez un lien YouTube, SoundCloud ou Spotify.')
    for address in socket.getaddrinfo(host, 443):
        ip = ipaddress.ip_address(address[4][0])
        if not ip.is_global:
            raise ValueError('Les adresses privées ne sont pas autorisées.')
    return url


def normalize(url):
    url = url.strip()
    safe_public(url, {'youtube.com','www.youtube.com','m.youtube.com','youtu.be', 'soundcloud.com','www.soundcloud.com','on.soundcloud.com','open.spotify.com'})
    p = urlparse(url)
    if p.hostname == 'open.spotify.com':
        match = re.fullmatch(r'/(?:intl-[a-z]{2}/)?track/([A-Za-z0-9]{22})/?', p.path)
        if not match:
            raise ValueError('Utilisez le lien d’un morceau Spotify individuel, pas un album ou une playlist.')
        track_id = match.group(1)
        return 'spotify:'+track_id, 'https://open.spotify.com/track/'+track_id, 'Spotify'
    if p.hostname == 'on.soundcloud.com':
        with httpx.Client(follow_redirects=False, timeout=15) as client:
            for _ in range(5):
                response = client.get(url)
                if response.is_redirect:
                    from urllib.parse import urljoin
                    url = urljoin(url, response.headers['location'])
                    safe_public(url, {'soundcloud.com', 'www.soundcloud.com', 'on.soundcloud.com'})
                else:
                    break
        p = urlparse(url)
    if 'youtu' in p.hostname:
        vid = p.path.strip('/') if p.hostname == 'youtu.be' else parse_qs(p.query).get('v', [''])[0]
        if p.path.startswith(('/shorts/', '/embed/')):
            vid = p.path.split('/')[2]
        if not re.fullmatch(r'[A-Za-z0-9_-]{11}', vid):
            raise ValueError('Utilisez le lien d’une vidéo, pas une playlist ou une chaîne.')
        return 'youtube:'+vid, 'https://www.youtube.com/watch?v='+vid, 'YouTube'
    parts = p.path.strip('/').split('/')
    if len(parts) != 2 or parts[1] == 'sets':
        raise ValueError('Utilisez le lien d’un morceau SoundCloud, pas une playlist.')
    canonical = 'https://soundcloud.com/' + '/'.join(parts)
    return 'soundcloud:'+p.path.strip('/').lower(), canonical, 'SoundCloud'


def run(args, tid, timeout=900):
    if CANCEL.get(tid, threading.Event()).is_set():
        raise RuntimeError('Traitement annulé.')
    process = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    PROCESSES[tid] = process
    deadline = time.monotonic()+timeout
    try:
        while True:
            try:
                out, err = process.communicate(timeout=.25)
                break
            except subprocess.TimeoutExpired:
                if CANCEL.get(tid, threading.Event()).is_set() or time.monotonic() > deadline:
                    process.kill()
                    process.communicate()
                    raise RuntimeError('Traitement annulé.' if CANCEL.get(tid, threading.Event()).is_set() else 'Le serveur source ne répond pas. Réessayez.')
        if process.returncode:
            detail = err.decode(errors='replace')[-3000:]
            logging.error('Subprocess %s failed: %s', args[0], detail)
            if 'No space left' in detail:
                raise RuntimeError('Espace disque insuffisant sur le Mac.')
            raise RuntimeError('La source refuse la récupération ou est indisponible. Réessayez après mise à jour de yt-dlp.' if 'yt_dlp' in ' '.join(args) else 'Le traitement audio a échoué. Réessayez.')
        return out
    finally:
        PROCESSES.pop(tid, None)


def fail(tid, exc):
    logging.exception('Track operation failed: %s', tid)
    track = store.get(tid)
    if not track:
        return
    if CANCEL.get(tid, threading.Event()).is_set():
        if not track.get('mediaReady'):
            delete_files(tid)
            with store.db() as conn:
                conn.execute('DELETE FROM tracks WHERE id=?', (tid,))
        else:
            store.update(tid, status='interrupted', error='Analyse annulée. Vous pouvez la reprendre.', progress=None)
    else:
        store.update(tid, status='error', error=str(exc), progress=None)


def import_track(tid):
    try:
        track = store.get(tid)
        if not track or CANCEL[tid].is_set():
            return
        if track.get('mediaReady'):
            analyze_track(tid)
            return
        if shutil.disk_usage(store.ROOT).free < 250*1024*1024:
            raise RuntimeError('Espace disque insuffisant : libérez au moins 250 Mo.')
        store.update(tid, status='metadata', error=None)
        base = [str(Path(os.sys.executable)), '-m', 'yt_dlp', '--no-playlist', '--no-warnings', '--socket-timeout', '20', '--retries', '2', '--js-runtimes', 'node']
        folder = store.ROOT/'media'/tid
        folder.mkdir(exist_ok=True)
        temp = store.ROOT/'tmp'/tid
        temp.mkdir(exist_ok=True)
        if track['source'] == 'Spotify':
            store.update(tid, status='download')
            info = json.loads(run(spotify.download_command(track['url'].rsplit('/',1)[-1], temp/'source.ogg'), tid, 600))
            if info.get('error'):
                raise RuntimeError(info['error'])
            info['id'] = track['url'].rsplit('/',1)[-1]
        else:
            info = json.loads(run(base+['--dump-single-json', '--skip-download', track['url']], tid, 120))
        if info.get('is_live') or info.get('_type') == 'playlist':
            raise RuntimeError('Les directs en cours et les playlists ne sont pas pris en charge.')
        # Resolve stable SoundCloud identity before downloading (slugs can change).
        identity = track['source'].lower()+':'+str(info['id'])
        with store.db() as conn:
            other = conn.execute('SELECT id FROM tracks WHERE identity=? AND id<>?', (identity, tid)).fetchone()
            if other:
                raise RuntimeError('Ce morceau est déjà présent dans la bibliothèque.')
            conn.execute('UPDATE tracks SET identity=? WHERE id=?', (identity, tid))
        store.update(tid, title=info.get('title','Sans titre'), author=info.get('author') or info.get('artist') or info.get('uploader') or '', duration=info.get('duration') or 0, status='download')
        if track['source'] != 'Spotify':
            run(base+['-f', 'bestaudio/best', '--no-progress', '-o', str(temp/'source.%(ext)s'), track['url']], tid)
        originals = [p for p in temp.glob('source.*') if p.suffix not in ('.part','.ytdl')]
        if not originals:
            raise RuntimeError('Aucun fichier audio reçu de la source.')
        source = originals[0]
        target = folder/('source'+source.suffix)
        shutil.move(source, target)
        store.update(tid, status='prepare')
        media = folder/'playback.m4a'
        run(['ffmpeg','-v','error','-y','-i',str(target),'-vn','-c:a','aac','-b:a','192k','-movflags','+faststart',str(media)], tid)
        duration = float(run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(media)],tid))
        if track['source'] == 'Spotify' and abs(duration-float(info['duration'])) > max(2, float(info['duration'])*.02):
            raise RuntimeError('L’audio Spotify reçu est incomplet. Réessayez cet import.')
        thumb = info.get('thumbnail')
        if thumb:
            try:
                safe_public(thumb)
                with httpx.Client(timeout=15, follow_redirects=False) as client:
                    response = client.get(thumb)
                    if response.status_code == 200 and len(response.content) < 15_000_000:
                        (folder/'cover.raw').write_bytes(response.content)
                        run(['ffmpeg','-v','error','-y','-i',str(folder/'cover.raw'),'-frames:v','1','-vf','scale=600:600:force_original_aspect_ratio=decrease',str(folder/'cover.jpg')],tid,30)
            except Exception:
                logging.warning('Artwork unavailable for %s', tid)
        store.update(tid, mediaReady=True, duration=duration, status='analyze', hasCover=(folder/'cover.jpg').exists())
        shutil.rmtree(temp, ignore_errors=True)
        analyze_track(tid)
    except Exception as exc:
        fail(tid, exc)


def analyze_track(tid):
    try:
        track = store.get(tid)
        store.update(tid, status='analyze', progress=0, error=None)
        result = analyze(media_playback_path(track), track['duration'],
                         lambda p: store.update(tid, progress=p), lambda: CANCEL[tid].is_set())
        if CANCEL[tid].is_set() or not store.get(tid):
            return
        destination = store.ROOT/'analysis'/(tid+'.json')
        destination.write_text(json.dumps(result))
        store.update(tid, status='ready', progress=None, bpm=result['bpm'], span=result['span'], quality=result['quality'], analysisReady=True)
        if STYLE_JOBS:
            STYLE_JOBS.schedule(tid)
        else:
            rename_media_files(tid)
    except Exception as exc:
        fail(tid, exc)


def delete_files(tid):
    with media_lock(tid):
        shutil.rmtree(store.ROOT/'media'/tid, ignore_errors=True)
    shutil.rmtree(store.ROOT/'tmp'/tid, ignore_errors=True)
    (store.ROOT/'analysis'/(tid+'.json')).unlink(missing_ok=True)
    for file in (store.ROOT/'exports').glob(tid+'*'):
        if file.is_symlink() or file.is_file():
            file.unlink(missing_ok=True)
        elif file.is_dir():
            shutil.rmtree(file, ignore_errors=True)


@asynccontextmanager
async def lifespan(app):
    global STYLE_JOBS
    store.init()
    handler = RotatingFileHandler(store.ROOT/'logs/app.log', maxBytes=1_000_000, backupCount=3)
    logging.getLogger().addHandler(handler)
    for track in store.tracks():
        if track['status'] == 'deleting':
            delete_files(track['id'])
            with store.db() as conn:
                conn.execute('DELETE FROM tracks WHERE id=?', (track['id'],))
        elif track['status'] in ('queued','metadata','download','prepare','analyze'):
            store.update(track['id'], status='interrupted', error='Traitement interrompu. Reprenez-le ici.', progress=None)
    STYLE_JOBS = StyleJobs()
    STYLE_JOBS.start()
    yield
    STYLE_JOBS.close()
    STYLE_JOBS = None
    spotify.close()
    for ev in CANCEL.values():
        ev.set()
    for process in list(PROCESSES.values()):
        process.kill()


app = FastAPI(lifespan=lifespan)
app.include_router(discovery_router)


@app.middleware('http')
async def secure(request: Request, call_next):
    if request.headers.get('x-mylib-token') != TOKEN:
        return JSONResponse({'detail':'Accès local uniquement.'},status_code=403)
    return await call_next(request)


class Link(BaseModel):
    url: str = Field(max_length=3000)


class Name(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class Correction(BaseModel):
    factor: float


class StyleCorrection(BaseModel):
    label: str | None = None


class RecommendationRequest(BaseModel):
    mode: str = 'global'
    tolerance: int = 5
    same: bool = False
    limit: int = Field(default=5, ge=1, le=10000)
    start: float | None = None
    end: float | None = None
    factor: float = 1


class Order(BaseModel):
    ids: list[str]


def required(tid):
    track = store.get(tid)
    if not track or track['status'] == 'deleting':
        raise HTTPException(404, 'Morceau introuvable.')
    return track


@app.get('/health')
def health():
    return {'app':'MyLibApp','ready':True,'installation':str(Path(__file__).resolve().parents[1])}


@app.get('/library')
def library():
    with store.db() as conn:
        playlists = [dict(p) for p in conn.execute('SELECT * FROM playlists ORDER BY created')]
        for playlist in playlists:
            playlist['tracks'] = [r['track'] for r in conn.execute('SELECT track FROM playlist_tracks WHERE playlist=? ORDER BY position', (playlist['id'],))]
    return {'tracks':[t for t in store.tracks() if t['status'] != 'deleting'], 'playlists':playlists}


@app.get('/spotify/status')
def spotify_status():
    return spotify.status()


@app.post('/spotify/connect')
def spotify_connect():
    try:
        return spotify.connect()
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))


@app.post('/spotify/disconnect')
def spotify_disconnect():
    for track in store.tracks():
        if track['source'] == 'Spotify' and not track.get('mediaReady'):
            CANCEL.setdefault(track['id'], threading.Event()).set()
            process = PROCESSES.get(track['id'])
            if process:
                process.kill()
    spotify.disconnect()
    return spotify.status()


@app.post('/import')
def add(link: Link):
    try:
        identity, url, source = normalize(link.url)
    except (ValueError, OSError, httpx.HTTPError) as exc:
        raise HTTPException(400, str(exc))
    tid = str(uuid.uuid4())
    data = dict(id=tid, url=url, source=source, title='Récupération du morceau…', author='', duration=0, created=time.time(), status='queued', progress=None, error=None, mediaReady=False, analysisReady=False, factor=1, bpm=None, span=None, quality='incertain', hasCover=False)
    with store.db() as conn:
        existing = conn.execute('SELECT data FROM tracks WHERE identity=? OR json_extract(data,\'$.url\')=?', (identity, url)).fetchone()
        if existing:
            return {'track':json.loads(existing['data']), 'duplicate':True}
        if source == 'Spotify' and not spotify.status()['connected']:
            raise HTTPException(409, 'Connectez votre compte Spotify Premium pour importer ce morceau.')
        conn.execute('INSERT INTO tracks VALUES (?,?,?)', (tid, identity, json.dumps(data)))
    CANCEL[tid] = threading.Event()
    POOL.submit(import_track,tid)
    return {'track':data, 'duplicate':False}


@app.post('/tracks/{tid}/retry')
def retry(tid: str):
    track = required(tid)
    if track['status'] not in ('error','interrupted'):
        raise HTTPException(409, 'Ce traitement est déjà en cours ou terminé.')
    CANCEL[tid] = threading.Event()
    store.update(tid, status='queued', error=None)
    POOL.submit(import_track,tid)
    return {'ok':True}


@app.post('/tracks/{tid}/cancel')
def cancel(tid: str):
    track = required(tid)
    CANCEL.setdefault(tid, threading.Event()).set()
    if track['status'] == 'queued':
        fail(tid, RuntimeError('Traitement annulé.'))
    return {'ok':True}


@app.delete('/tracks/{tid}')
def delete(tid: str):
    required(tid)
    CANCEL.setdefault(tid, threading.Event()).set()
    if tid in PROCESSES:
        PROCESSES[tid].kill()
    store.update(tid, status='deleting')
    delete_files(tid)
    with store.db() as conn:
        conn.execute('DELETE FROM tracks WHERE id=?', (tid,))
    return {'ok':True}


@app.patch('/tracks/{tid}/correction')
def correction(tid: str, body: Correction):
    required(tid)
    if body.factor not in (.5, 1, 2):
        raise HTTPException(400, 'Facteur invalide.')
    store.update(tid,factor=body.factor)
    rename_media_files(tid)
    return {'ok':True}


@app.get('/tracks/{tid}/analysis')
def analysis(tid: str):
    required(tid)
    file = store.ROOT/'analysis'/(tid+'.json')
    if not file.exists():
        raise HTTPException(409, 'Analyse pas encore disponible.')
    return FileResponse(file,media_type='application/json')


@app.get('/styles')
def styles_list():
    return {'labels': taxonomy()}


@app.patch('/tracks/{tid}/style')
def style_correction(tid: str, body: StyleCorrection):
    required(tid)
    if body.label is not None and body.label not in taxonomy():
        raise HTTPException(400, 'Style inconnu.')
    store.update(tid, styleOverride=body.label)
    rename_media_files(tid)
    return {'ok':True}


@app.post('/tracks/{tid}/style/retry')
def retry_style(tid: str):
    track = required(tid)
    if not track.get('mediaReady'):
        raise HTTPException(409, 'Le fichier audio est encore en préparation.')
    if not STYLE_JOBS:
        raise HTTPException(503, 'Le service d’analyse est indisponible.')
    STYLE_JOBS.schedule(tid, force=True)
    return {'ok':True}


def selection_bpm(track, body):
    """Recompute selection server-side: never trust a client-supplied BPM."""
    import math
    start, end = body.start, body.end
    if start is None or end is None or not math.isfinite(start) or not math.isfinite(end) or not 0 <= start < end <= track['duration'] or body.factor not in (.5,1,2):
        raise HTTPException(400, 'Sélection invalide.')
    if end-start < 8:
        return None
    file = store.ROOT/'analysis'/(track['id']+'.json')
    if not file.exists():
        return None
    points = json.loads(file.read_text())['points']
    values=[]; total=weight=confidence=0
    for second, bpm, score in points:
        if second < start or second > end or not valid_bpm(bpm):
            continue
        w=max(0,min(end,second+.5)-max(start,second-.5))
        total+=bpm*w; weight+=w; confidence+=score*w; values.append(bpm*body.factor)
    if not weight or weight/(end-start)<.3:
        return None
    values.sort()
    if values[min(len(values)-1,int(len(values)*.9))]-values[int(len(values)*.1)]>5 or confidence/weight<=.35:
        return None
    return total/weight*body.factor


@app.post('/tracks/{tid}/recommendations')
def recommendations(tid: str, body: RecommendationRequest):
    track = required(tid)
    if body.mode not in ('global','selection') or body.tolerance not in (2,5,10):
        raise HTTPException(400, 'Critères invalides.')
    bpm = selection_bpm(track,body) if body.mode == 'selection' else track.get('bpm')*track.get('factor',1) if valid_bpm(track.get('bpm')) and track.get('quality') == 'stable' else None
    if not valid_bpm(bpm):
        return {'items':[], 'total':0, 'excluded':0, 'referenceBpm':None,
                'styleAvailable':bool(effective(track)),
                'message':'Choisissez un passage au tempo stable.' if body.mode == 'selection' else 'Le tempo du morceau est absent ou incertain. Essayez un passage au tempo stable.'}
    result = rank(track,store.tracks(),bpm,body.tolerance,body.same,body.limit)
    result['mode'] = body.mode
    return result


@app.get('/tracks/{tid}/media')
def media(tid: str):
    required(tid)
    with media_lock(tid):
        track = store.get(tid)
        file = media_playback_path(track) if track else None
        if not file or not file.exists():
            raise HTTPException(404, 'Fichier audio absent du Mac.')
        return PinnedMediaResponse(file)


@app.get('/tracks/{tid}/cover')
def cover(tid: str):
    required(tid)
    file = store.ROOT/'media'/tid/'cover.jpg'
    if not file.exists():
        raise HTTPException(404, 'Pochette indisponible.')
    return FileResponse(file,media_type='image/jpeg')


@app.post('/tracks/{tid}/reveal')
def reveal_source(tid: str):
    track = required(tid)
    if not track.get('mediaReady'):
        raise HTTPException(409, 'Le fichier source est encore en préparation.')
    with media_lock(tid):
        media_root = (store.ROOT/'media').resolve()
        folder = (media_root/tid).resolve()
        if media_root not in folder.parents or not folder.is_dir():
            raise HTTPException(404, 'Fichier source absent du Mac.')
        source = media_source_path(store.get(tid) or track)
        if not source or not source.is_file() or source.resolve().parent != folder:
            raise HTTPException(404, 'Fichier source absent du Mac.')
        try:
            subprocess.run(['/usr/bin/open', '-R', str(source)], check=True,
                           capture_output=True, text=True, timeout=10)
        except (OSError, subprocess.SubprocessError) as exc:
            logging.exception('Finder could not reveal source for track %s', tid)
            raise HTTPException(503, 'Le Finder n’a pas pu afficher ce fichier. Vérifiez qu’il est toujours disponible.') from exc
    return {'ok':True}


@app.post('/tracks/{tid}/export')
def prepare_export(tid: str):
    response = POOL.submit(build_export, tid).result()
    return {'filename': response.filename, 'format': 'mp3'}


@app.get('/tracks/{tid}/export')
def export(tid: str):
    return POOL.submit(build_export, tid).result()


def build_export(tid: str):
    with media_lock(tid):
        return _build_export_locked(tid)


def _build_export_locked(tid: str):
    track = required(tid)
    if not track['mediaReady']:
        raise HTTPException(409, 'Le fichier audio est encore en préparation.')
    bpm = round(track['bpm']*track['factor']) if track.get('bpm') else None
    name = export_filename(track)
    file = store.ROOT/'exports'/tid/name
    if not file.exists():
        folder = store.ROOT/'media'/tid
        source = media_source_path(track)
        if not source:
            raise HTTPException(404, 'Fichier source absent.')
        file.parent.mkdir(parents=True, exist_ok=True)
        temporary = file.with_suffix('.partial.mp3')
        try:
            subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-vn','-c:a','libmp3lame','-q:a','2',str(temporary)],check=True,capture_output=True,timeout=600)
            from mutagen.id3 import ID3, TIT2, TPE1, TBPM, APIC
            tags = ID3(temporary)
            tags.add(TIT2(encoding=3, text=track['title']))
            if track['author']:
                tags.add(TPE1(encoding=3,text=track['author']))
            if bpm:
                tags.add(TBPM(encoding=3,text=str(bpm)))
            if (folder/'cover.jpg').exists():
                tags.add(APIC(encoding=3,mime='image/jpeg',type=3,desc='Cover',data=(folder/'cover.jpg').read_bytes()))
            tags.save(temporary)
            temporary.replace(file)
        except Exception:
            temporary.unlink(missing_ok=True)
            raise HTTPException(500, 'Export impossible. Vérifiez l’espace disque puis réessayez.')
    return FileResponse(file,media_type='audio/mpeg',filename=name)


@app.post('/playlists')
def create_playlist(body: Name):
    name = body.name.strip()
    if not name:
        raise HTTPException(400, 'Donnez un nom à la playlist.')
    pid = str(uuid.uuid4())
    with store.db() as conn:
        conn.execute('INSERT INTO playlists VALUES (?,?,?)',(pid,name,time.time()))
    return {'id':pid}


@app.patch('/playlists/{pid}')
def rename_playlist(pid: str, body: Name):
    if not body.name.strip():
        raise HTTPException(400, 'Donnez un nom à la playlist.')
    with store.db() as conn:
        if not conn.execute('UPDATE playlists SET name=? WHERE id=?',(body.name.strip(),pid)).rowcount:
            raise HTTPException(404,'Playlist introuvable.')
    return {'ok':True}


@app.delete('/playlists/{pid}')
def delete_playlist(pid: str):
    with store.db() as conn:
        conn.execute('DELETE FROM playlists WHERE id=?',(pid,))
    return {'ok':True}


@app.put('/playlists/{pid}/tracks/{tid}')
def member(pid: str, tid: str):
    required(tid)
    with store.db() as conn:
        if not conn.execute('SELECT 1 FROM playlists WHERE id=?',(pid,)).fetchone():
            raise HTTPException(404,'Playlist introuvable.')
        conn.execute('INSERT OR IGNORE INTO playlist_tracks VALUES (?,?,(SELECT COALESCE(MAX(position),-1)+1 FROM playlist_tracks WHERE playlist=?))',(pid,tid,pid))
    return {'ok':True}


@app.delete('/playlists/{pid}/tracks/{tid}')
def remove_member(pid: str, tid: str):
    with store.db() as conn:
        conn.execute('DELETE FROM playlist_tracks WHERE playlist=? AND track=?',(pid,tid))
    return {'ok':True}


@app.put('/playlists/{pid}/order')
def order(pid: str, body: Order):
    with store.db() as conn:
        existing = {r['track'] for r in conn.execute('SELECT track FROM playlist_tracks WHERE playlist=?',(pid,))}
        if len(body.ids) != len(existing) or set(body.ids) != existing:
            raise HTTPException(400, 'L’ordre doit contenir chaque morceau une seule fois.')
        for i, tid in enumerate(body.ids):
            conn.execute('UPDATE playlist_tracks SET position=? WHERE playlist=? AND track=?',(i,pid,tid))
    return {'ok':True}
