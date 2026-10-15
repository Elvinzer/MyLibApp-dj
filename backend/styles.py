"""Local Discogs-EffNet inference; style lifecycle is independent of tempo."""
import hashlib
import json
import os
import subprocess
import threading
from pathlib import Path
import numpy as np

VERSION = 'discogs-effnet-1-musicnn-v1'
MODEL_HASH = 'a280825b334797cf677939db8cd5762c0392aedd0ca6415dbc1cd083f045e43c'
META_HASH = '1e140159496f7f932e4267b478e246bd60fbd526a7a67d3e12684a2978916420'
MODEL_DIR = Path(os.environ.get('MYLIB_MODEL_DIR', str(Path(__file__).parent/'models')))
_session = None
_session_lock = threading.Lock()


def taxonomy():
    file = Path(__file__).parent/'models/discogs-effnet.json'
    return sorted(set(json.loads(file.read_text())['classes'] + ['Electronic---Afro House']))


def label_name(label):
    return label.split('---')[-1]


# Deliberately curated edges, not all styles in a genre treated as neighbors.
NEIGHBOR_GROUPS = (
    ('House', 'Deep House', 'Tech House', 'Afro House', 'Tropical House', 'Tribal House'),
    ('Techno', 'Hard Techno', 'Schranz', 'Industrial'),
    ('Hardcore', 'Hardstyle', 'Gabber', 'Happy Hardcore'),
    ('Trance', 'Hard Trance', 'Progressive Trance', 'Psy-Trance', 'Tech Trance'),
    ('Drum n Bass', 'Jungle', 'Breakbeat'),
    ('UK Garage', 'Speed Garage', 'Bassline'),
)
NEIGHBORS = set()
for group in NEIGHBOR_GROUPS:
    for a in group:
        for b in group:
            if a != b:
                NEIGHBORS.add(('Electronic---'+a, 'Electronic---'+b))


def effective(track):
    if track.get('styleOverride'):
        return [track['styleOverride']]
    if track.get('styleStatus') == 'ready':
        return [s['label'] for s in track.get('styles', [])]
    return []


def session():
    global _session
    with _session_lock:
        if _session is None:
            for name, digest in [('discogs-effnet.onnx', MODEL_HASH), ('discogs-effnet.json', META_HASH)]:
                path = MODEL_DIR/name
                if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
                    raise RuntimeError('Le modèle de style est absent ou endommagé. Relancez l’installation de MyLib.')
            import onnxruntime as ort
            options = ort.SessionOptions()
            options.intra_op_num_threads = 2
            options.inter_op_num_threads = 1
            _session = ort.InferenceSession(str(MODEL_DIR/'discogs-effnet.onnx'), options, providers=['CPUExecutionProvider'])
        return _session


def features(y):
    import librosa
    # MusiCNN frontend: 16 kHz, symmetric Hann, power Slaney mel, log10(1+10000*x).
    mel = librosa.feature.melspectrogram(y=y, sr=16000, n_fft=512, hop_length=256,
                                       window=np.hanning(512), n_mels=96, htk=False,
                                       norm='slaney', center=True, pad_mode='constant')
    frames = np.log10(1+10000*mel).T
    return np.stack([frames[i:i+128] for i in range(0, len(frames)-127, 62)]).astype(np.float32)


def aggregate(predictions, labels):
    if not predictions:
        return {'styleStatus': 'uncertain', 'styles': [], 'styleVersion': VERSION}
    p = np.mean(predictions, axis=0)
    top = p.argsort()[::-1]
    selected = [int(i) for i in top[:2] if p[i] >= .2 and p[i] >= p[top[0]]*.65]
    # Require the principal style or a curated neighbor to be strongly supported
    # in at least 2/3 of excerpts (e.g. Hardcore/Hardstyle can alternate).
    principal = labels[top[0]]
    support = sum(any(r[i] >= .2 and r[i] >= np.max(r)*.65 and
                      (labels[i] == principal or (principal, labels[i]) in NEIGHBORS)
                      for i in np.argsort(r)[-2:]) for r in predictions)/len(predictions)
    if not selected or support < 2/3:
        selected = []
    return {'styleStatus': 'ready' if selected else 'uncertain',
            'styles': [{'label': labels[i], 'score': round(float(p[i]), 4)} for i in selected],
            'styleVersion': VERSION}


def analyze_style(path, duration, cancelled=lambda: False, wait=lambda: None):
    if duration < 4:
        return aggregate([], [])
    model = session()
    labels = json.loads((MODEL_DIR/'discogs-effnet.json').read_text())['classes']
    predictions = []
    for fraction in (.2, .5, .8):
        wait()
        if cancelled():
            raise InterruptedError('Analyse interrompue.')
        offset = max(0, min(duration-4, duration*fraction-6))
        result = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(offset), '-i', str(path),
                                 '-t', str(min(12, duration-offset)), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                                capture_output=True, check=True, timeout=60)
        y = np.frombuffer(result.stdout, dtype='<f4')
        if len(y) < 32768 or np.sqrt(np.mean(y*y)) < .001:
            continue
        patches = features(y)
        predictions.append(model.run(['activations'], {'melspectrogram': patches})[0].mean(axis=0))
    if cancelled():
        raise InterruptedError('Analyse interrompue.')
    return aggregate(predictions, labels)
