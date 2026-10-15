"""Bounded-memory audio preparation and versioned temporal tempo analysis."""
import json
import subprocess
from pathlib import Path
import numpy as np
from scipy.signal import correlate, find_peaks

VERSION = 'onset-autocorrelation-v3'
SR = 11025
HOP = 256


def window_tempo(envelope, prior=None, candidates=False):
    e = np.maximum(np.asarray(envelope, dtype=float), 0)
    if len(e) < 100 or np.max(e) < 0.015 or np.std(e) < 0.005:
        return [] if candidates else (None, 0.0)
    e = np.maximum(e - np.mean(e) * .5, 0)
    ac = correlate(e, e, mode='full', method='fft')[len(e)-1:]
    ac /= np.maximum(1, np.arange(len(e), 0, -1))
    lo, hi = int(SR / HOP * 60 / 190), int(SR / HOP * 60 / 65)
    peaks, _ = find_peaks(ac[lo:hi+1])
    if not len(peaks):
        return [] if candidates else (None, 0.0)
    lags = peaks + lo
    hypotheses = []
    for lag in lags:
        delta = 0.0
        if 0 < lag < len(ac)-1:
            den = ac[lag-1]-2*ac[lag]+ac[lag+1]
            if den:
                delta = float(.5*(ac[lag-1]-ac[lag+1])/den)
        bpm = 60*SR/HOP/(lag+delta)
        score = min(1.0, float(ac[lag]/max(ac[0],1e-9)))
        if score >= .12:
            hypotheses.append((round(bpm,2),round(score,3)))
    if candidates:
        return hypotheses
    return choose_tempo(hypotheses,prior)


def choose_tempo(hypotheses, prior=None):
    if not hypotheses:
        return None,0.0
    if prior:
        best = max(hypotheses,key=lambda p:p[1]*np.exp(-.5*(np.log2(p[0]/prior)/.35)**2))
        return best
    maximum=max(p[1] for p in hypotheses)
    return max((p for p in hypotheses if p[1]>=maximum*.65),key=lambda p:p[0])



def analyze(path: Path, duration: float, progress=lambda _: None, cancelled=lambda: False):
    import librosa
    chunk = 60.0
    points = []
    candidates = []
    waveform = []
    # 60 s chunks with 8 s context on both sides, never the full decoded set.
    for base in np.arange(0, duration, chunk):
        if cancelled():
            raise RuntimeError('Traitement annulé.')
        offset = max(0, float(base)-8)
        length = min(duration-offset, chunk+16)
        result = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(offset), '-i', str(path),
                                 '-t', str(length), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                                capture_output=True, timeout=180, check=True)
        y = np.frombuffer(result.stdout, dtype='<f4')
        env = librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP)
        for second in range(int(base), min(int(base+chunk), int(np.ceil(duration)))):
            left, right = max(0, second-4), min(duration, second+4)
            a, b = int((left-offset)*SR/HOP), int((right-offset)*SR/HOP)
            hypotheses = window_tempo(env[max(0,a):max(0,b)], candidates=True)
            candidates.append(hypotheses)
            bpm, confidence = choose_tempo(hypotheses)
            points.append([second+.5,bpm,confidence])
        # 50 peaks/s, suitable for zoom; bounded 360k floats for a 2h set.
        start, end = int((base-offset)*SR), min(len(y), int((base-offset+chunk)*SR))
        section = y[start:end]
        step = int(SR/50)
        for i in range(0, len(section), step):
            waveform.append(round(float(np.sqrt(np.mean(np.square(section[i:i+step])))), 4))
        progress(min(99, int((base+chunk)/duration*100)))
    # A soft recording-level prior suppresses common 3:2 and octave aliases;
    # strong local hypotheses remain free to follow a genuine tempo change.
    histogram = {}
    for _, bpm, score in points:
        if bpm:
            key = round(bpm/2)*2
            histogram[key] = histogram.get(key,0)+score
    prior = max(histogram,key=histogram.get) if histogram else None
    for index, hypotheses in enumerate(candidates):
        bpm,score = choose_tempo(hypotheses,prior)
        points[index] = [points[index][0],bpm,score]
    valid = [p[1] for p in points if p[1] is not None]
    bpm = round(float(np.mean(valid)), 2) if valid else None
    span = [round(float(np.percentile(valid, n)), 1) for n in (10, 90)] if valid else None
    confidence = float(np.mean([p[2] for p in points if p[1] is not None])) if valid else 0
    status = 'variable' if span and span[1]-span[0] > 5 else ('stable' if confidence > .35 else 'incertain')
    return dict(version=VERSION, points=points, bpm=bpm, span=span, quality=status,
                confidence=round(confidence, 3), peaks=waveform, peaksPerSecond=50)
