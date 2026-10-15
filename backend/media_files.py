"""Human-readable names and paths for locally stored audio files."""
import filecmp
import logging
import math
import re
import threading
from pathlib import Path
from . import store
from .styles import effective, label_name

_TRACK_LOCKS = {}
_TRACK_LOCKS_GUARD = threading.Lock()


def media_lock(tid):
    with _TRACK_LOCKS_GUARD:
        return _TRACK_LOCKS.setdefault(tid, threading.RLock())


def _segment(value, fallback, max_bytes):
    value = str(value or '').strip()
    value = re.sub(r'\.(mp3|m4a|webm|opus|wav|mp4)$', '', value, flags=re.I)
    value = re.sub(r'[^\w]+', '_', value, flags=re.UNICODE).strip('_')
    while value and len(value.encode('utf-8')) > max_bytes:
        value = value[:-1]
    return value.rstrip('_') or fallback


def _media_basename(track, title_bytes=130):
    styles = effective(track)
    style = label_name(styles[0]) if styles else 'Style_inconnu'
    try:
        mean_bpm = float(track['bpm']) * float(track.get('factor', 1))
        bpm = f'{mean_bpm:.1f}'.rstrip('0').rstrip('.') if math.isfinite(mean_bpm) and mean_bpm > 0 else 'BPM_inconnu'
    except (KeyError, TypeError, ValueError):
        bpm = 'BPM_inconnu'
    artist = _segment(track.get('author'), 'Artiste_inconnu', 60)
    title = _segment(track.get('title'), 'Titre_inconnu', title_bytes)
    style = _segment(style, 'Style_inconnu', 40)
    return f'{artist}_{title}_{style}_{bpm}'


def export_filename(track):
    return _media_basename(track)+'.mp3'


def playback_filename(track):
    # Keep room for a descriptive prefix and the longest supported extension.
    return 'preview_'+_media_basename(track, title_bytes=118)+'.m4a'


def media_source_path(track):
    folder = store.ROOT/'media'/track['id']
    if not folder.is_dir():
        return None
    resolved_folder = folder.resolve()

    def usable(path):
        return path.is_file() and path.resolve().parent == resolved_folder

    stored_name = track.get('mediaSource')
    if stored_name and Path(stored_name).name == stored_name:
        stored = folder/stored_name
        if usable(stored):
            return stored

    extension = track.get('mediaSourceExtension') or Path(stored_name or '').suffix
    if extension and not re.fullmatch(r'\.[A-Za-z0-9]{1,8}', extension):
        extension = None
    if extension:
        named = folder/(export_filename(track)[:-4]+extension)
        if usable(named):
            return named

    originals = sorted(path for path in folder.glob('source.*')
                       if path.suffix.lower() not in ('.part', '.ytdl') and usable(path))
    if originals:
        return originals[0]

    candidates = sorted(path for path in folder.iterdir()
                        if path.is_file() and path.name != 'playback.m4a'
                        and not path.name.startswith('preview_')
                        and path.suffix.lower() in {'.aac', '.flac', '.m4a', '.mp3', '.ogg', '.opus', '.wav', '.webm'}
                        and usable(path))
    if extension:
        candidates = [path for path in candidates if path.suffix.lower() == extension.lower()]
    return candidates[0] if len(candidates) == 1 else None


def media_playback_path(track):
    folder = store.ROOT/'media'/track['id']
    if not folder.is_dir():
        return None
    resolved_folder = folder.resolve()

    def usable(path):
        return path.is_file() and path.resolve().parent == resolved_folder

    stored_name = track.get('mediaPlayback')
    if stored_name and Path(stored_name).name == stored_name:
        stored = folder/stored_name
        if usable(stored):
            return stored

    legacy = folder/'playback.m4a'
    if usable(legacy):
        return legacy

    expected = folder/playback_filename(track)
    if usable(expected):
        return expected

    previews = sorted(path for path in folder.glob('preview_*.m4a') if usable(path))
    return previews[0] if len(previews) == 1 else None


def _rename_file(source, target, tid):
    if source == target:
        return target
    if target.exists():
        if filecmp.cmp(source, target, shallow=False):
            source.unlink()
            return target
        target = target.with_name(f'{target.stem}_{tid[:8]}{target.suffix}')
        if target.exists():
            if filecmp.cmp(source, target, shallow=False):
                source.unlink()
                return target
            logging.error('Could not rename media for track %s: destination already exists', tid)
            return source
    source.replace(target)
    return target


def rename_media_files(tid):
    with media_lock(tid):
        track = store.get(tid)
        if not track:
            return None
        folder = store.ROOT/'media'/tid
        source = media_source_path(track)
        playback = media_playback_path(track)
        updates = {}
        if source is not None:
            target = folder/(_media_basename(track)+source.suffix)
            source = _rename_file(source, target, tid)
            updates.update(mediaSource=source.name, mediaSourceExtension=source.suffix)
        if playback is not None:
            target = folder/playback_filename(track)
            playback = _rename_file(playback, target, tid)
            updates['mediaPlayback'] = playback.name
        if updates:
            store.update(tid, **updates)
        return source
