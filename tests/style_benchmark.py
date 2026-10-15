"""Real-model local acceptance corpus and bounded two-hour synthetic sets.

Accuracy annotations are intentionally limited: two provisional user judgments,
one title-based broad family; synthetic sets check robustness, not genre accuracy.
"""
import sys, json, time, resource, tempfile, subprocess
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np
import soundfile as sf
from backend import store, styles

# Acceptance budgets for this repeatable validation run, before its measurements.
MAX_SECONDS_PER_TRACK=5
MAX_RSS_MIB=512
report={'budgets':{'secondsPerTrack':MAX_SECONDS_PER_TRACK,'rssMiB':MAX_RSS_MIB},'tracks':[],'syntheticSets':[]}
corpus=[t for t in store.tracks() if t['title']=='Samuel Moriero - Call You' or t['title']=='Where Is My Mind (KX CHR Remix)' or 'BbY WOW (BISCITZ Afro House Remix)' in t['title']]
assert len(corpus)==3, 'Ce benchmark exige les trois morceaux de validation décrits dans model-validation.md.'
for t in corpus:
    start=time.monotonic()
    result=styles.analyze_style(store.ROOT/'media'/t['id']/'playback.m4a',t['duration'])
    elapsed=time.monotonic()-start
    expected='Electronic---House' if 'Afro House' in t['title'] else 'Electronic---Hardcore'
    assert result['styleStatus']=='ready' and result['styles'][0]['label']==expected
    assert elapsed<MAX_SECONDS_PER_TRACK
    report['tracks'].append({'title':t['title'],'expected':expected,'annotation':'title-based broad family' if 'Afro House' in t['title'] else 'user provisional annotation',
                             'seconds':round(elapsed,3),**result})
with tempfile.TemporaryDirectory(prefix='mylib-style-') as tmp:
    for name,block in [('silence',np.zeros(16000,dtype=np.float32)),('rhythmic',np.sin(np.arange(16000,dtype=np.float32)*2*np.pi*220/16000)*.1)]:
        path=Path(tmp)/(name+'.wav')
        with sf.SoundFile(path,'w',samplerate=16000,channels=1,subtype='PCM_16') as out:
            for _ in range(7200):out.write(block)
        start=time.monotonic();result=styles.analyze_style(path,7200);elapsed=time.monotonic()-start
        assert elapsed<MAX_SECONDS_PER_TRACK
        if name=='silence':assert result['styleStatus']=='uncertain'
        report['syntheticSets'].append({'name':name,'duration':7200,'seconds':round(elapsed,3),**result})
report['peakRssMiB']=round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024**2,1)
assert report['peakRssMiB']<MAX_RSS_MIB
Path('.runtime/style-validation.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
print(json.dumps(report,indent=2,ensure_ascii=False))
