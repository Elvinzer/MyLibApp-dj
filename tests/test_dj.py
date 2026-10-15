import json
import time
import threading
import numpy as np
import pytest
from fastapi.testclient import TestClient
from backend import main, store, styles, style_jobs
from backend.recommendations import rank

HOUSE='Electronic---House'
DEEP='Electronic---Deep House'
HARD='Electronic---Hardcore'


def track(tid, bpm=160.2, label=HOUSE, **extra):
    return dict(id=tid, title=tid, author='Test', duration=60, status='ready', mediaReady=True,
                bpm=bpm, factor=1, quality='stable', styleStatus='ready', styleVersion=styles.VERSION,
                styles=[{'label':label,'score':.5}] if label else [], **extra)


@pytest.mark.parametrize('tolerance',[2,5,10])
def test_inclusive_unrounded_boundary(tolerance):
    source=track('source')
    candidates=[source,track('boundary',160.2+tolerance),track('outside',160.2+tolerance+.01),track('lower',160.2-tolerance)]
    assert {r['track']['id'] for r in rank(source,candidates,160.2,tolerance)['items']}=={'boundary','lower'}


def test_corrections_and_invalid_candidates():
    source=track('s',160)
    candidates=[track('half',80),track('corrected',80),track('variable'),track('uncertain'),track('missing'),track('nan',float('nan')),track('negative',-2),track('deleted'),track('no-audio')]
    candidates[1]['factor']=2
    candidates[2]['quality']='variable'; candidates[3]['quality']='incertain'
    candidates[4]['bpm']=None; candidates[7]['status']='deleting';candidates[8]['mediaReady']=False
    result=rank(source,[source]+candidates,160)
    assert [r['track']['id'] for r in result['items']]==['corrected']
    assert result['excluded']==5


def test_style_group_order_override_and_strict_filter():
    source=track('s')
    candidates=[track('neighbor',161,DEEP),track('same',163),track('other',160.2,HARD),track('unknown',160.2,None)]
    r=rank(source,candidates,160.2)
    assert [i['track']['id'] for i in r['items']]==['same','neighbor','other','unknown']
    assert [i['reason'] for i in r['items']]==['Même style','Style voisin','Tempo proche','Tempo proche']
    assert [i['track']['id'] for i in rank(source,candidates,160.2,same=True)['items']]==['same']
    candidates[2]['styleOverride']=HOUSE
    assert rank(source,candidates,160.2,same=True)['items'][0]['track']['id']=='other'
    source['styleStatus']='uncertain'
    assert rank(source,candidates,160.2)['items'][0]['track']['id']=='other'
    assert not rank(source,candidates,160.2)['styleAvailable']


def test_multiple_labels_neighbors_ties_and_limits():
    assert all((b,a) in styles.NEIGHBORS for a,b in styles.NEIGHBORS)
    assert all(a in styles.taxonomy() and b in styles.taxonomy() for a,b in styles.NEIGHBORS)
    s=track('s');s['styles'].append({'label':HARD,'score':.3})
    candidates=[track(str(i),160.2,HARD) for i in range(8)]
    assert rank(s,candidates,160.2,limit=5)['total']==8
    assert len(rank(s,candidates,160.2,limit=10)['items'])==8
    assert [i['track']['id'] for i in rank(s,list(reversed(candidates)),160.2)['items']]==['0','1','2','3','4']


@pytest.fixture
def library(tmp_path,monkeypatch):
    monkeypatch.setattr(store,'ROOT',tmp_path)
    store.init()
    # API tests do not run real inference; worker and real model tested separately.
    monkeypatch.setattr(style_jobs.StyleJobs,'start',lambda self:None)
    monkeypatch.setattr(style_jobs.StyleJobs,'close',lambda self:None)
    source=track('source');source['duration']=60
    for t in [source,track('near',161,DEEP),track('half',80)]:
        with store.db() as conn:
            conn.execute('INSERT INTO tracks VALUES (?,?,?)',(t['id'],t['id'],json.dumps(t)))
    points=[[n+.5,160,.8] for n in range(60)]
    (tmp_path/'analysis/source.json').write_text(json.dumps({'points':points}))
    with TestClient(main.app,headers={'x-mylib-token':main.TOKEN}) as client:
        yield client


def test_recommendation_api_and_validation(library):
    c=library
    assert c.post('/tracks/source/recommendations',json={}).json()['items'][0]['track']['id']=='near'
    assert c.post('/tracks/source/recommendations',json={'same':True}).json()['items']==[]
    for body in [{'mode':'wrong'},{'tolerance':3},{'limit':0},{'mode':'selection','start':-1,'end':20},{'mode':'selection','start':0,'end':61},{'mode':'selection','start':0,'end':20,'factor':3}]:
        assert c.post('/tracks/source/recommendations',json=body).status_code in (400,422)
    r=c.post('/tracks/source/recommendations',json={'mode':'selection','start':0,'end':4}).json()
    assert r['referenceBpm'] is None and r['items']==[]
    r=c.post('/tracks/source/recommendations',json={'mode':'selection','start':0,'end':20,'factor':.5}).json()
    assert r['referenceBpm']==80 and r['items'][0]['track']['id']=='half'
    store.update('source',quality='variable')
    assert c.post('/tracks/source/recommendations',json={}).json()['referenceBpm'] is None
    assert c.post('/tracks/source/recommendations',json={'mode':'selection','start':0,'end':20}).json()['referenceBpm']==160
    c.delete('/tracks/near')
    assert c.post('/tracks/source/recommendations',json={'mode':'selection','start':0,'end':20}).json()['total']==0
    assert c.post('/tracks/missing/recommendations',json={}).status_code==404


def test_style_correction_persistence_reset_and_retry(library):
    c=library
    assert HOUSE in c.get('/styles').json()['labels']
    assert c.patch('/tracks/source/style',json={'label':'made up'}).status_code==400
    assert c.patch('/tracks/source/style',json={'label':DEEP}).status_code==200
    assert styles.effective(store.get('source'))==[DEEP]
    store.update('source',styleStatus='uncertain',styles=[])
    assert styles.effective(store.get('source'))==[DEEP]
    assert c.post('/tracks/source/recommendations',json={'same':True}).json()['total']==1
    assert c.patch('/tracks/source/style',json={'label':None}).status_code==200
    assert styles.effective(store.get('source'))==[]
    assert c.post('/tracks/source/style/retry').status_code==200
    store.update('near',mediaReady=False)
    assert c.post('/tracks/near/style/retry').status_code==409


def test_selection_uncertainty_and_missing_analysis(library):
    c=library
    file=store.ROOT/'analysis/source.json'
    for points in [[[n+.5,160,.2] for n in range(60)], [[n+.5,100 if n<30 else 170,.8] for n in range(60)], [[1,160,.8]]]:
        file.write_text(json.dumps({'points':points}))
        assert c.post('/tracks/source/recommendations',json={'mode':'selection','start':0,'end':60}).json()['referenceBpm'] is None
    file.unlink()
    assert c.post('/tracks/source/recommendations',json={'mode':'selection','start':0,'end':20}).json()['referenceBpm'] is None


def test_abstention_and_heterogeneous_set():
    labels=[HOUSE,HARD,'Rock---Punk']
    assert styles.aggregate([],labels)['styleStatus']=='uncertain'
    assert styles.aggregate([np.array([.1,.1,.1])]*3,labels)['styleStatus']=='uncertain'
    # Different principal styles with no consistent support => no forced label.
    assert styles.aggregate([np.array([.8,.1,0]),np.array([0,.8,.1]),np.array([.1,0,.8])],labels)['styleStatus']=='uncertain'
    r=styles.aggregate([np.array([.35,.3,.05])]*3,labels)
    assert [s['label'] for s in r['styles']]==[HOUSE,HARD]


def test_missing_or_corrupt_model(tmp_path,monkeypatch):
    monkeypatch.setattr(styles,'MODEL_DIR',tmp_path);monkeypatch.setattr(styles,'_session',None)
    with pytest.raises(RuntimeError,match='absent ou endommagé'):styles.session()
    (tmp_path/'discogs-effnet.onnx').write_bytes(b'invalid')
    with pytest.raises(RuntimeError,match='absent ou endommagé'):styles.session()


def wait_until(predicate):
    deadline=time.monotonic()+5
    while time.monotonic()<deadline:
        if predicate():return
        time.sleep(.01)
    raise AssertionError('Worker did not settle')


def test_worker_recovery_priority_failure_and_override(tmp_path,monkeypatch):
    monkeypatch.setattr(store,'ROOT',tmp_path);store.init()
    t=track('job');t.update(styleVersion=None,styleStatus='running',styleOverride=DEEP)
    importer=track('importer');importer.update(status='analyze',mediaReady=False)
    media=store.ROOT/'media'/'job';media.mkdir()
    (media/'source.webm').write_bytes(b'original source')
    (media/'playback.m4a').write_bytes(b'playback audio')
    for row in [t,importer]:
        with store.db() as conn:conn.execute('INSERT INTO tracks VALUES (?,?,?)',(row['id'],row['id'],json.dumps(row)))
    calls=[]
    def analyze(*args):
        calls.append(args)
        return {'styleStatus':'ready','styles':[{'label':HOUSE,'score':.4}],'styleVersion':styles.VERSION}
    monkeypatch.setattr(style_jobs,'analyze_style',analyze)
    jobs=style_jobs.StyleJobs();jobs.start()
    try:
        time.sleep(.1);assert calls==[]
        store.update('importer',status='ready')
        wait_until(lambda:store.get('job')['styleStatus']=='ready')
        assert styles.effective(store.get('job'))==[DEEP]
        source=media/'Test_job_Deep_House_160.2.webm'
        playback=media/'preview_Test_job_Deep_House_160.2.m4a'
        assert source.read_bytes()==b'original source'
        assert playback.read_bytes()==b'playback audio'
        assert store.get('job')['mediaSource']==source.name
        assert store.get('job')['mediaPlayback']==playback.name
        jobs.schedule('job');time.sleep(.05);assert len(calls)==1
        jobs.schedule('job',force=True);jobs.schedule('job',force=True)
        wait_until(lambda:store.get('job')['styleStatus']=='ready' and len(calls)==2)
        def fail(*args):raise RuntimeError('model missing')
        monkeypatch.setattr(style_jobs,'analyze_style',fail)
        jobs.schedule('job',force=True);wait_until(lambda:store.get('job')['styleStatus']=='error')
        assert store.get('job')['bpm']==160.2 and store.get('job')['mediaReady']
        assert styles.effective(store.get('job'))==[DEEP]
    finally:jobs.close()


def test_real_model_offline_and_silent_audio(tmp_path,monkeypatch):
    import subprocess, socket
    file=tmp_path/'silence.wav'
    subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','anullsrc=r=16000:cl=mono','-t','12',str(file)],check=True)
    monkeypatch.setattr(socket,'getaddrinfo',lambda *a,**k: (_ for _ in ()).throw(OSError('offline')))
    assert styles.analyze_style(file,12)['styleStatus']=='uncertain'
    # Actual ONNX inference, no mocked predictions; dimensions finite and bounded.
    y=np.sin(np.arange(12*16000)*2*np.pi*220/16000).astype(np.float32)*.1
    patches=styles.features(y)
    p=styles.session().run(['activations'],{'melspectrogram':patches})[0]
    assert p.shape[1]==400 and np.isfinite(p).all() and p.min()>=0 and p.max()<=1


def test_worker_deleted_track_is_not_resurrected(tmp_path,monkeypatch):
    monkeypatch.setattr(store,'ROOT',tmp_path);store.init()
    t=track('delete');t['styleVersion']=None
    with store.db() as conn:conn.execute('INSERT INTO tracks VALUES (?,?,?)',('delete','delete',json.dumps(t)))
    media=store.ROOT/'media'/'delete';media.mkdir()
    (media/'source.webm').write_bytes(b'original source')
    (media/'playback.m4a').write_bytes(b'playback audio')
    started=threading.Event();release=threading.Event()
    def analyze(*args):
        started.set();release.wait(3)
        return {'styleStatus':'ready','styles':[{'label':HOUSE,'score':.5}],'styleVersion':styles.VERSION}
    monkeypatch.setattr(style_jobs,'analyze_style',analyze)
    jobs=style_jobs.StyleJobs();jobs.start()
    try:
        assert started.wait(2)
        with store.db() as conn:conn.execute('DELETE FROM tracks WHERE id=?',('delete',))
        release.set();wait_until(lambda:not jobs.pending)
        assert store.get('delete') is None
    finally:release.set();jobs.close()


def test_model_install_verifies_and_is_atomic(tmp_path,monkeypatch):
    import importlib.util, io
    module_path=__import__('pathlib').Path(__file__).resolve().parents[1]/'scripts/install-style-model.py'
    spec=importlib.util.spec_from_file_location('installer',module_path);installer=importlib.util.module_from_spec(spec);spec.loader.exec_module(installer)
    calls=[]
    def download(url,**kwargs):
        calls.append(url)
        name='discogs-effnet.json' if url.endswith('.json') else 'discogs-effnet.onnx'
        return io.BytesIO((styles.MODEL_DIR/name).read_bytes())
    monkeypatch.setattr(installer.urllib.request,'urlopen',download)
    installer.install(tmp_path);assert len(calls)==2
    installer.install(tmp_path);assert len(calls)==2
    file=tmp_path/'discogs-effnet.onnx';file.write_bytes(b'old invalid model')
    monkeypatch.setattr(installer.urllib.request,'urlopen',lambda *a,**k:io.BytesIO(b'corrupt response'))
    with pytest.raises(RuntimeError,match='version attendue'):installer.install(tmp_path)
    assert file.read_bytes()==b'old invalid model'
    assert not file.with_suffix('.onnx.partial').exists()
