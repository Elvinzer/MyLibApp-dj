"""Reproducible two-hour benchmark, not part of the short test suite."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from backend.audio import analyze,SR
from test_audio import fixture
import soundfile as sf
import json,time,resource,subprocess
folder=Path('.runtime');folder.mkdir(exist_ok=True)
path=folder/'two-hour.wav'
with sf.SoundFile(path,'w',samplerate=SR,channels=1,subtype='PCM_16') as file:
    for i in range(120):file.write(fixture(120 if i<60 else 140,60))
started=time.monotonic();result=analyze(path,7200)
report={'durationSeconds':7200,'analysisSeconds':round(time.monotonic()-started,2),'peakRssMiB':round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024**2,1),'machine':subprocess.check_output(['sysctl','-n','machdep.cpu.brand_string']).decode().strip(),'points':len(result['points']),'peaks':len(result['peaks']),'bpm':result['bpm'],'span':result['span']}
(folder/'two-hour-analysis.json').write_text(json.dumps(result))
(folder/'benchmark.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
path.unlink()
