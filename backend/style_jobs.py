"""Sequential background enrichment with import priority and restart recovery."""
import logging
import queue
import shutil
import threading
from . import store
from .styles import VERSION, analyze_style
from .media_files import media_lock, media_playback_path, rename_media_files


class StyleJobs:
    def __init__(self):
        self.stop = threading.Event()
        self.queue = queue.Queue()
        self.pending = set()
        self.lock = threading.Lock()
        self.thread = threading.Thread(target=self.run, name='style-analysis', daemon=True)

    def start(self):
        self.thread.start()
        for t in store.tracks():
            if t.get('mediaReady') and (t.get('styleVersion') != VERSION or t.get('styleStatus') in (None, 'pending', 'running')):
                self.schedule(t['id'])

    def schedule(self, tid, force=False):
        with self.lock:
            if tid in self.pending or self.stop.is_set():
                return
            t = store.get(tid)
            if not t or t.get('status') == 'deleting':
                return
            if not force and t.get('styleVersion') == VERSION and t.get('styleStatus') in ('ready','uncertain','error'):
                return
            self.pending.add(tid)
            store.update(tid, styleStatus='pending', styleError=None)
            self.queue.put(tid)

    def cancelled(self, tid):
        t = store.get(tid)
        return self.stop.is_set() or not t or t.get('status') == 'deleting'

    def wait_imports(self, tid):
        while not self.cancelled(tid) and any(t.get('status') in ('queued','metadata','download','prepare','analyze') for t in store.tracks()):
            self.stop.wait(.5)

    def run(self):
        while not self.stop.is_set():
            try:
                tid = self.queue.get(timeout=.5)
            except queue.Empty:
                continue
            analysis_file = None
            try:
                self.wait_imports(tid)
                if self.cancelled(tid):
                    continue
                t = store.get(tid)
                store.update(tid, styleStatus='running', styleError=None)
                with media_lock(tid):
                    playback = media_playback_path(t)
                    if not playback:
                        raise FileNotFoundError('Playback audio is unavailable.')
                    analysis_file = store.ROOT/'tmp'/tid/'style-analysis.m4a'
                    analysis_file.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(playback, analysis_file)
                result = analyze_style(analysis_file, t['duration'],
                                       lambda:self.cancelled(tid), lambda:self.wait_imports(tid))
                if not self.cancelled(tid):
                    store.update(tid, **result, styleError=None)
                    rename_media_files(tid)
            except InterruptedError:
                pass
            except Exception:
                logging.exception('Style analysis failed: %s', tid)
                if not self.cancelled(tid):
                    store.update(tid, styleStatus='error', styleVersion=VERSION,
                                 styleError='Analyse du style indisponible. Réessayez ; si le problème persiste, relancez l’installation.')
                    rename_media_files(tid)
            finally:
                if analysis_file:
                    analysis_file.unlink(missing_ok=True)
                with self.lock:
                    self.pending.discard(tid)
                self.queue.task_done()

    def close(self):
        self.stop.set()
        self.thread.join(timeout=5)
