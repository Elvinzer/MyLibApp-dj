"""Preparation workspace: explicit metadata discovery, durable ideas, atomic playlists."""
import json
import re
import threading
import time
import unicodedata
import uuid
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal
from . import store
from .styles import effective, NEIGHBORS, label_name
from .recommendations import valid_bpm

router = APIRouter()
_cache = {}
_cache_lock = threading.Lock()
_candidates = {}
_import_lock = threading.Lock()


def normalized(value):
    value = unicodedata.normalize('NFKD', value or '').casefold()
    return re.sub(r'[^\w]+', ' ', ''.join(c for c in value if not unicodedata.combining(c))).strip()


def safe_apple_url(value, preview=False):
    if not isinstance(value, str):
        return None
    parsed = urlparse(value)
    hosts = ('mzstatic.com', 'audio-ssl.itunes.apple.com') if preview else ('apple.com',)
    try:
        port = parsed.port
    except ValueError:
        return None
    if parsed.scheme not in ('http', 'https') or parsed.username or parsed.password or port not in (None, 80, 443):
        return None
    if not any(parsed.hostname == h or (parsed.hostname or '').endswith('.'+h) for h in hosts):
        return None
    return parsed._replace(scheme='https').geturl()


def catalogue(params):
    key = tuple(sorted(params.items()))
    with _cache_lock:
        hit = _cache.get(key)
        if hit and hit[0] > time.monotonic():
            return hit[1]
    endpoint = 'lookup' if 'id' in params else 'search'
    try:
        response = httpx.get('https://itunes.apple.com/'+endpoint, params=params, timeout=12,
                             headers={'User-Agent':'MyLibApp/1.0'}, follow_redirects=False)
        response.raise_for_status()
        data = response.json()['results']
        if not isinstance(data, list):
            raise ValueError('Invalid catalogue response')
    except (httpx.HTTPError, ValueError, KeyError) as exc:
        raise HTTPException(503, 'La découverte est momentanément indisponible. Réessayez ; votre bibliothèque et votre sélection restent accessibles.') from exc
    with _cache_lock:
        if len(_cache) >= 128:
            _cache.clear()
        _cache[key] = (time.monotonic()+300, data)
    return data


def candidate(row):
    if row.get('kind') != 'song' or not isinstance(row.get('trackId'), int):
        return None
    url = safe_apple_url(row.get('trackViewUrl'))
    if not url or not row.get('trackName') or not row.get('artistName'):
        return None
    item = dict(key='itunes:'+str(row['trackId']), title=row['trackName'], author=row['artistName'],
                source='iTunes', url=url, cover=safe_apple_url(row.get('artworkUrl100'), True),
                preview=safe_apple_url(row.get('previewUrl'), True),
                duration=(row.get('trackTimeMillis') or 0)/1000, style=row.get('primaryGenreName'),
                bpm=None, trackId=None)
    with _cache_lock:
        if len(_candidates) >= 512:
            _candidates.clear()
        _candidates[item['key']] = (time.monotonic()+1800, item)
    return item


def local_candidate(track):
    bpm = track.get('bpm')
    return dict(key='local:'+track['id'], trackId=track['id'], title=track['title'], author=track['author'],
                source=track.get('source', 'MyLib'), url=track.get('url'),
                cover='/api/tracks/'+track['id']+'/cover' if track.get('hasCover') else None,
                preview=None, duration=track.get('duration', 0),
                style=' · '.join(label_name(s) for s in effective(track)),
                bpm=bpm*track.get('factor', 1) if valid_bpm(bpm) and track.get('quality') == 'stable' else None)


def match_local(item, tracks):
    for track in tracks:
        if track.get('status') != 'deleting' and (item.get('trackId') == track['id'] or
                (normalized(item['title']) == normalized(track['title']) and
                 normalized(item['author']) == normalized(track['author']))):
            return track
    return None


def enrich(item, tracks=None):
    item = dict(item)
    track = match_local(item, store.tracks() if tracks is None else tracks)
    item['trackId'] = track['id'] if track else None
    item['available'] = bool(track and track.get('mediaReady'))
    item['status'] = track.get('status') if track else 'external' if not item['key'].startswith('local:') else 'missing'
    item['progress'] = track.get('progress') if track else None
    item['error'] = track.get('error') if track else None
    if track and item['available']:
        local = local_candidate(track)
        item['bpm'] = local['bpm']
    return item


class Search(BaseModel):
    scope: Literal['local', 'external'] = 'local'
    reference: Literal['track', 'artist', 'style'] = 'track'
    tolerance: Literal[2, 5, 10] = 5
    term: str = Field(default='', max_length=160)
    limit: int = Field(default=8, ge=1, le=50)


@router.post('/tracks/{tid}/discovery')
def discover(tid: str, body: Search):
    source = store.get(tid)
    if not source or source.get('status') == 'deleting':
        raise HTTPException(404, 'Morceau de référence introuvable.')
    tracks = store.tracks()
    styles = set(effective(source))
    source_bpm = local_candidate(source)['bpm']
    term = body.term.strip()
    if body.scope == 'external':
        artist = source.get('author', '').strip()
        style_names = [label_name(s) for s in sorted(styles)][:2]
        queries = [term] if term else [artist] if body.reference == 'artist' else style_names if body.reference == 'style' else [artist, *style_names]
        queries = list(dict.fromkeys(q for q in queries if q))[:3]
        items, seen = [], set()
        if not queries:
            return dict(items=[], total=0, referenceBpm=source_bpm,
                        message='Précisez un artiste ou un style dans Affiner pour lancer la découverte.')
        for query in queries:
            params = dict(term=query, country='FR', media='music', entity='song', limit=30)
            if body.reference == 'artist' or (not term and query == artist):
                params['attribute'] = 'artistTerm'
            rows = catalogue(params)
            for row in rows:
                item = candidate(row)
                if not item or item['key'] in seen:
                    continue
                # The catalogue can return title homonyms even for artistTerm.
                # Only call them artist results when the artist actually matches.
                if params.get('attribute') == 'artistTerm':
                    wanted, actual = normalized(query), normalized(item['author'])
                    if wanted != actual and not (len(wanted) >= 4 and wanted in actual):
                        continue
                if (query in style_names or body.reference == 'style') and any(s.startswith('Electronic---') for s in styles):
                    genre = normalized(row.get('primaryGenreName', ''))
                    # "Hardcore" can name a rapper, not the electronic style.
                    # Keep the known electronic family; never infer subgenre from a homonym.
                    if not set(genre.split()) & {'dance', 'electronic', 'electronique', 'electronica', 'house', 'techno', 'trance', 'hardstyle', 'drum', 'dubstep'}:
                        continue
                identity = (normalized(item['title']), normalized(item['author']))
                if identity in seen:
                    continue
                seen.update((item['key'], identity))
                if identity == (normalized(source['title']), normalized(source['author'])):
                    continue
                item = enrich(item, tracks)
                item['reason'] = 'Même artiste' if normalized(item['author']) == normalized(artist) else 'Recherche : '+query
                item['reasonDetail'] = 'Piste issue du catalogue, similarité audio non analysée.'
                items.append(item)
        return dict(items=items[:body.limit], total=len(items), referenceBpm=source_bpm,
                    message='Suggestions de catalogue par artiste et mots-clés. BPM inconnus avant analyse.')
    items = []
    for track in tracks:
        if track['id'] == tid or not track.get('mediaReady') or track.get('status') == 'deleting':
            continue
        item = local_candidate(track)
        other = set(effective(track))
        same = bool(styles & other)
        neighbor = any((a, b) in NEIGHBORS for a in styles for b in other)
        artist = (normalized(term) in normalized(track['author']) if term and body.reference == 'artist'
                  else normalized(track['author']) == normalized(source['author']) and bool(normalized(source['author'])))
        if term and body.reference == 'track' and normalized(term) not in normalized(track['title']+' '+track['author']+' '+item['style']):
            continue
        if body.reference == 'artist' and not artist:
            continue
        if body.reference == 'style' and not (normalized(term) in normalized(item['style']) if term else same or neighbor):
            continue
        delta = item['bpm']-source_bpm if item['bpm'] and source_bpm else None
        if delta is not None and abs(delta) > body.tolerance:
            continue
        if body.reference == 'track' and not (same or neighbor or artist or delta is not None):
            continue
        item.update(available=True, status=track['status'], delta=delta,
                    reason='Même style' if same else 'Style voisin' if neighbor else 'Même artiste' if artist else 'Tempo proche',
                    reasonDetail='Style et tempo ne garantissent pas la réussite d’une transition.')
        if delta is None and not (same or neighbor or artist):
            continue
        items.append((0 if same else 1 if neighbor else 2 if artist else 3,
                      abs(delta) if delta is not None else float('inf'), item['title'].casefold(), item))
    items.sort(key=lambda x:x[:3])
    return dict(items=[i[3] for i in items[:body.limit]], total=len(items), referenceBpm=source_bpm,
                message='' if source_bpm else 'Tempo de référence à confirmer : suggestions par style ou artiste, sans filtre BPM.')


@router.get('/discovery/selection')
def selection():
    tracks = store.tracks()
    with store.db() as conn:
        rows = conn.execute('SELECT data FROM discovery_selection ORDER BY created').fetchall()
    return {'items':[enrich(json.loads(row['data']), tracks) for row in rows]}


@router.put('/discovery/selection/{key}')
def retain(key: str):
    if key.startswith('local:'):
        track = store.get(key[6:])
        if not track or track.get('status') == 'deleting':
            raise HTTPException(404, 'Ce morceau n’est plus disponible.')
        item = local_candidate(track)
    elif re.fullmatch(r'itunes:\d{1,20}', key):
        with _cache_lock:
            hit = _candidates.get(key)
        item = dict(hit[1]) if hit and hit[0] > time.monotonic() else None
        if item is None:
            rows = catalogue(dict(id=int(key[7:]), country='FR', entity='song'))
            item = next((candidate(row) for row in rows if row.get('trackId') == int(key[7:])), None)
        if not item:
            raise HTTPException(404, 'Ce titre n’est plus disponible dans le catalogue.')
    else:
        raise HTTPException(400, 'Identifiant de titre invalide.')
    item['trackId'] = enrich(item)['trackId']
    with store.db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        if item['trackId']:
            for row in conn.execute('SELECT data FROM discovery_selection'):
                existing = json.loads(row['data'])
                if existing.get('trackId') == item['trackId']:
                    return {'item':enrich(existing)}
        conn.execute('INSERT OR IGNORE INTO discovery_selection VALUES (?,?,?)', (key, json.dumps(item), time.time()))
    return {'item':enrich(item)}


@router.delete('/discovery/selection/{key}')
def unretain(key: str):
    with store.db() as conn:
        conn.execute('DELETE FROM discovery_selection WHERE key=?', (key,))
    return {'ok':True}


class ImportLink(BaseModel):
    url: str = Field(min_length=1, max_length=3000)


@router.post('/discovery/selection/{key}/import')
def import_idea(key: str, body: ImportLink):
    with _import_lock:
        return _import_idea(key, body)


def _import_idea(key, body):
    from .main import add, Link
    with store.db() as conn:
        row = conn.execute('SELECT data FROM discovery_selection WHERE key=?', (key,)).fetchone()
    if not row:
        raise HTTPException(404, 'Retenez ce titre avant de l’importer.')
    item = json.loads(row['data'])
    existing = enrich(item)
    if existing['trackId']:
        raise HTTPException(409, 'Un fichier est déjà associé. Reprenez son traitement ou retirez cette idée avant une nouvelle association.')
    result = add(Link(url=body.url))
    item['trackId'] = result['track']['id']
    with store.db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        conn.execute('UPDATE discovery_selection SET data=? WHERE key=?', (json.dumps(item), key))
        # Associating an already-retained local file must not duplicate the idea.
        duplicates = [r['key'] for r in conn.execute('SELECT key,data FROM discovery_selection')
                      if r['key'] != key and json.loads(r['data']).get('trackId') == item['trackId']]
        for duplicate in duplicates:
            conn.execute('DELETE FROM discovery_selection WHERE key=?', (duplicate,))
    return result


class SaveSelection(BaseModel):
    keys: list[str] = Field(min_length=1, max_length=500)
    playlistId: str | None = None
    name: str = Field(default='', max_length=120)


@router.post('/discovery/playlist')
def save_selection(body: SaveSelection):
    with store.db() as conn:
        # Lock before reading so simultaneous saves cannot overwrite positions.
        conn.execute('BEGIN IMMEDIATE')
        tracks = [json.loads(r['data']) for r in conn.execute('SELECT data FROM tracks')]
        ideas = {r['key']:json.loads(r['data']) for r in conn.execute('SELECT key,data FROM discovery_selection')}
        available = []
        for key in dict.fromkeys(body.keys):
            if key not in ideas:
                continue
            item = enrich(ideas[key], tracks)
            if item['available'] and item['trackId'] not in available:
                available.append(item['trackId'])
        if not available:
            raise HTTPException(409, 'Aucun fichier disponible à enregistrer. Importez d’abord un titre.')
        pid = body.playlistId
        if pid:
            playlist = conn.execute('SELECT name FROM playlists WHERE id=?', (pid,)).fetchone()
            if not playlist:
                raise HTTPException(404, 'Playlist introuvable.')
            name = playlist['name']
        else:
            name = body.name.strip()
            if not name:
                raise HTTPException(400, 'Donnez un nom à la playlist.')
            pid = str(uuid.uuid4())
            conn.execute('INSERT INTO playlists VALUES (?,?,?)', (pid, name, time.time()))
        added = []
        for tid in available:
            result = conn.execute('INSERT OR IGNORE INTO playlist_tracks VALUES (?,?,(SELECT COALESCE(MAX(position),-1)+1 FROM playlist_tracks WHERE playlist=?))', (pid, tid, pid))
            if result.rowcount:
                added.append(tid)
        token = str(uuid.uuid4())
        conn.execute('INSERT INTO discovery_undo VALUES (?,?,?)', (token, json.dumps(dict(playlistId=pid, ids=added)), time.time()))
        conn.execute('DELETE FROM discovery_undo WHERE created<?', (time.time()-86400,))
    return dict(playlistId=pid, name=name, added=len(added), available=len(available), undo=token)


@router.post('/discovery/undo/{token}')
def undo_selection(token: str):
    with store.db() as conn:
        conn.execute('BEGIN IMMEDIATE')
        row = conn.execute('SELECT data FROM discovery_undo WHERE id=?', (token,)).fetchone()
        if not row:
            raise HTTPException(409, 'Cette action a déjà été annulée ou a expiré.')
        action = json.loads(row['data'])
        for tid in action['ids']:
            conn.execute('DELETE FROM playlist_tracks WHERE playlist=? AND track=?', (action['playlistId'], tid))
        conn.execute('DELETE FROM discovery_undo WHERE id=?', (token,))
    return {'ok':True}
