import os
os.environ.setdefault('MYLIB_DATA', os.path.abspath('.test-data'))
import json
import subprocess
from pathlib import Path
import numpy as np
import pytest
import soundfile as sf
from backend.audio import analyze, SR


def fixture(bpm, duration=24):
    y=np.zeros(int(SR*duration), dtype='float32')
    pulse=np.exp(-np.arange(int(SR*.035))/(SR*.006))*np.sin(2*np.pi*800*np.arange(int(SR*.035))/SR)
    for pos in np.arange(.2,duration,60/bpm):
        index=int(pos*SR)
        size=min(len(pulse),len(y)-index)
        y[index:index+size]+=pulse[:size]
    return y


@pytest.mark.parametrize('bpm',[90,128,174])
def test_constant(tmp_path,bpm):
    path=tmp_path/'click.wav';sf.write(path,fixture(bpm),SR)
    result=analyze(path,24)
    assert abs(result['bpm']-bpm)<=2,result['bpm']
    assert len(result['points'])==24


def test_silence(tmp_path):
    path=tmp_path/'silence.wav';sf.write(path,np.zeros(SR*12),SR)
    assert analyze(path,12)['bpm'] is None


def test_transition(tmp_path):
    path=tmp_path/'transition.wav';sf.write(path,np.concatenate([fixture(120,30),fixture(140,30)]),SR)
    result=analyze(path,60)
    for start,end,bpm in [(5,25,120),(35,55,140)]:
        values=[p[1] for p in result['points'] if start<=p[0]<=end and p[1]]
        assert abs(np.mean(values)-bpm)<2
    assert result['quality']=='variable'
