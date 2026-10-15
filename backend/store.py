import contextlib
import json
import os
import sqlite3
from pathlib import Path

ROOT = Path(os.environ.get('MYLIB_DATA', str(Path.home() / 'Library/Application Support/MyLibApp')))


def init():
    for name in ('media', 'analysis', 'tmp', 'exports', 'logs'):
        (ROOT / name).mkdir(parents=True, exist_ok=True)
    with db() as conn:
        conn.executescript('''
        CREATE TABLE IF NOT EXISTS tracks(id TEXT PRIMARY KEY, identity TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS playlists(id TEXT PRIMARY KEY, name TEXT NOT NULL, created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS discovery_selection(key TEXT PRIMARY KEY, data TEXT NOT NULL, created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS discovery_undo(id TEXT PRIMARY KEY, data TEXT NOT NULL, created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS playlist_tracks(playlist TEXT REFERENCES playlists(id) ON DELETE CASCADE,
          track TEXT REFERENCES tracks(id) ON DELETE CASCADE, position INTEGER NOT NULL,
          PRIMARY KEY(playlist, track));
        PRAGMA user_version=1;
        ''')


@contextlib.contextmanager
def db():
    conn = sqlite3.connect(ROOT/'library.sqlite', timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys=ON')
    conn.execute('PRAGMA journal_mode=WAL')
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def get(track_id):
    with db() as conn:
        row = conn.execute('SELECT data FROM tracks WHERE id=?', (track_id,)).fetchone()
    return json.loads(row['data']) if row else None


def update(track_id, **fields):
    with db() as conn:
        row = conn.execute('SELECT data FROM tracks WHERE id=?', (track_id,)).fetchone()
        if not row:
            return
        data = json.loads(row['data'])
        data.update(fields)
        conn.execute('UPDATE tracks SET data=? WHERE id=?', (json.dumps(data), track_id))
    return data


def tracks():
    with db() as conn:
        return [json.loads(r['data']) for r in conn.execute('SELECT data FROM tracks')]
