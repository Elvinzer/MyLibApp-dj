import os
os.environ.setdefault('MYLIB_DATA',os.path.abspath('.test-data'))
import json
import time
import uuid
from fastapi.testclient import TestClient
from backend import main,store


def track():
    tid=str(uuid.uuid4())
    data=dict(id=tid,url='https://youtube.com/watch?v=lz1iVBswhqI',source='YouTube',title='Test',author='Test',duration=60,created=time.time(),status='ready',progress=None,error=None,mediaReady=True,analysisReady=True,factor=1,bpm=128,span=[128,128],quality='stable',hasCover=False)
    with store.db() as conn: conn.execute('INSERT INTO tracks VALUES (?,?,?)',(tid,tid,json.dumps(data)))
    return tid


def test_security_and_playlists():
    with TestClient(main.app) as c:
        assert c.get('/library').status_code==403
        c.headers['x-mylib-token']=main.TOKEN
        a,b=track(),track()
        pid=c.post('/playlists',json={'name':'Test playlist'}).json()['id']
        assert c.patch('/playlists/'+pid,json={'name':'   '}).status_code==400
        for tid in [a,b,a]: assert c.put(f'/playlists/{pid}/tracks/{tid}').status_code==200
        p=next(p for p in c.get('/library').json()['playlists'] if p['id']==pid)
        assert p['tracks']==[a,b]
        assert c.put(f'/playlists/{pid}/order',json={'ids':[a,a]}).status_code==400
        assert c.put(f'/playlists/{pid}/order',json={'ids':[b,a]}).status_code==200
        assert c.patch(f'/tracks/{a}/correction',json={'factor':3}).status_code==400
        assert c.patch(f'/tracks/{a}/correction',json={'factor':.5}).status_code==200
        assert store.get(a)['factor']==.5
        assert c.delete('/playlists/'+pid).status_code==200
        assert store.get(a)
        for tid in [a,b]: assert c.delete('/tracks/'+tid).status_code==200


def test_bad_links():
    with TestClient(main.app,headers={'x-mylib-token':main.TOKEN}) as c:
        for url in ['file:///etc/passwd','http://127.0.0.1','https://youtube.com.evil.com/watch?v=lz1iVBswhqI','https://youtube.com/playlist?list=abc']:
            assert c.post('/import',json={'url':url}).status_code==400


def test_export_filename_uses_metadata_and_safe_segments():
    data={
        'author':'AC/DC & Co.', 'title':'Song: Remix.mp3', 'bpm':124.78, 'factor':1,
        'styleStatus':'ready', 'styles':[{'label':'Electronic---House'}],
    }
    assert main.export_filename(data)=='AC_DC_Co_Song_Remix_House_124.8.mp3'
    data['styleOverride']='Electronic---Hardcore'
    assert main.export_filename(data)=='AC_DC_Co_Song_Remix_Hardcore_124.8.mp3'
    data['bpm']=None
    assert main.export_filename(data)=='AC_DC_Co_Song_Remix_Hardcore_BPM_inconnu.mp3'


def test_media_filenames_follow_track_metadata_and_preserve_audio(monkeypatch):
    import hashlib
    import shutil
    import subprocess
    from types import SimpleNamespace
    from backend.media_files import media_playback_path, media_source_path

    with TestClient(main.app,headers={'x-mylib-token':main.TOKEN}) as c:
        tid=track();folder=store.ROOT/'media'/tid;folder.mkdir()
        source=folder/'source.m4a'
        subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','sine=frequency=440:duration=3','-c:a','aac',str(source)],capture_output=True,check=True)
        playback=folder/'playback.m4a';shutil.copyfile(source,playback)
        source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
        playback_hash=hashlib.sha256(playback.read_bytes()).hexdigest()
        store.update(tid,duration=3,styleStatus='ready',styles=[{'label':'Electronic---Hardcore','score':.9}])
        finder_calls=[]
        monkeypatch.setattr(main,'subprocess',SimpleNamespace(run=lambda args,**kwargs: finder_calls.append((args,kwargs))))

        assert c.patch(f'/tracks/{tid}/correction',json={'factor':.5}).status_code==200
        source=folder/'Test_Test_Hardcore_64.m4a'
        playback=folder/'preview_Test_Test_Hardcore_64.m4a'
        assert media_source_path(store.get(tid))==source
        assert media_playback_path(store.get(tid))==playback
        assert hashlib.sha256(source.read_bytes()).hexdigest()==source_hash
        assert hashlib.sha256(playback.read_bytes()).hexdigest()==playback_hash
        assert c.get(f'/tracks/{tid}/media',headers={'Range':'bytes=0-31'}).status_code==206
        assert c.post(f'/tracks/{tid}/reveal').status_code==200
        assert finder_calls[-1][0]==['/usr/bin/open','-R',str(source)]

        assert c.patch(f'/tracks/{tid}/style',json={'label':'Electronic---House'}).status_code==200
        assert (folder/'Test_Test_House_64.m4a').is_file()
        assert (folder/'preview_Test_Test_House_64.m4a').is_file()
        assert not source.exists() and not playback.exists()
        assert c.post(f'/tracks/{tid}/reveal').status_code==200
        assert finder_calls[-1][0]==['/usr/bin/open','-R',str(folder/'Test_Test_House_64.m4a')]
        c.delete(f'/tracks/{tid}')


def test_reveal_source_in_finder(monkeypatch):
    calls=[]
    def open_finder(args, **kwargs):
        calls.append((args,kwargs))
    monkeypatch.setattr(main.subprocess,'run',open_finder)
    with TestClient(main.app,headers={'x-mylib-token':main.TOKEN}) as c:
        tid=track();folder=store.ROOT/'media'/tid;folder.mkdir()
        source=folder/'source.flac';source.write_bytes(b'local source')
        response=c.post(f'/tracks/{tid}/reveal')
        assert response.status_code==200 and response.json()=={'ok':True}
        assert calls==[(['/usr/bin/open','-R',str(source)],{
            'check':True,'capture_output':True,'text':True,'timeout':10
        })]
        store.update(tid,mediaReady=False)
        assert c.post(f'/tracks/{tid}/reveal').status_code==409
        store.update(tid,mediaReady=True)
        source.unlink()
        assert c.post(f'/tracks/{tid}/reveal').status_code==404
        assert len(calls)==1
        c.delete(f'/tracks/{tid}')


def test_reveal_source_reports_finder_failure(monkeypatch):
    def open_finder(*args, **kwargs):
        raise OSError('Finder unavailable')
    monkeypatch.setattr(main.subprocess,'run',open_finder)
    with TestClient(main.app,headers={'x-mylib-token':main.TOKEN}) as c:
        tid=track();folder=store.ROOT/'media'/tid;folder.mkdir()
        (folder/'source.m4a').write_bytes(b'local source')
        response=c.post(f'/tracks/{tid}/reveal')
        assert response.status_code==503
        assert 'Finder' in response.json()['detail']
        c.delete(f'/tracks/{tid}')


def test_source_identity_and_resume(monkeypatch):
    submitted=[]
    monkeypatch.setattr(main.POOL,'submit',lambda *args: submitted.append(args))
    monkeypatch.setattr(main,'safe_public',lambda url,allowed=None:url)
    with TestClient(main.app,headers={'x-mylib-token':main.TOKEN}) as c:
        first=c.post('/import',json={'url':'https://youtu.be/lz1iVBswhqI'}).json()['track']
        duplicate=c.post('/import',json={'url':'https://www.youtube.com/watch?v=lz1iVBswhqI&list=abc'}).json()
        assert duplicate['duplicate'] and duplicate['track']['id']==first['id']
        assert len(submitted)==1
        assert c.post(f'/tracks/{first["id"]}/retry').status_code==409
        c.post(f'/tracks/{first["id"]}/cancel')
        assert store.get(first['id']) is None
        tid=track()
        store.update(tid,status='analyze',analysisReady=False)
    with TestClient(main.app,headers={'x-mylib-token':main.TOKEN}) as c:
        assert store.get(tid)['status']=='interrupted'
        assert c.post(f'/tracks/{tid}/retry').status_code==200
        assert len(submitted)==2
        c.delete(f'/tracks/{tid}')


def test_media_range_export_and_persistence(tmp_path, monkeypatch):
    import subprocess
    from mutagen.id3 import ID3
    with TestClient(main.app,headers={'x-mylib-token':main.TOKEN}) as c:
        tid=track();folder=store.ROOT/'media'/tid;folder.mkdir()
        store.update(tid,styleStatus='ready',styles=[{'label':'Electronic---Hardcore','score':.9}])
        subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','sine=frequency=440:duration=10','-c:a','aac',str(folder/'source.m4a')],check=True)
        import shutil
        shutil.copyfile(folder/'source.m4a',folder/'playback.m4a')
        store.update(tid,duration=10)
        r=c.get(f'/tracks/{tid}/media',headers={'Range':'bytes=0-127'})
        assert r.status_code==206 and len(r.content)==128
        assert r.headers['content-range'].startswith('bytes 0-127/')
        # Source network is unavailable: local export must still succeed.
        with monkeypatch.context() as blocked:
            blocked.setattr(main.socket,'getaddrinfo',lambda *a,**k: (_ for _ in ()).throw(OSError('Network unavailable')))
            prepared=c.post(f'/tracks/{tid}/export')
            assert prepared.json()=={'filename':'Test_Test_Hardcore_128.mp3','format':'mp3'}
            export=c.get(f'/tracks/{tid}/export')
        assert (store.ROOT/'exports'/tid/'Test_Test_Hardcore_128.mp3').is_file()
        assert export.status_code==200
        assert export.headers['content-type'].startswith('audio/mpeg')
        assert 'attachment' in export.headers['content-disposition']
        assert 'Test_Test_Hardcore_128.mp3' in export.headers['content-disposition']
        path=tmp_path/'test.mp3';path.write_bytes(export.content)
        assert str(ID3(path)['TBPM'])=='128'
        assert str(ID3(path)['TIT2'])=='Test'
        c.patch(f'/tracks/{tid}/correction',json={'factor':.5})
        assert (folder/'Test_Test_Hardcore_64.m4a').is_file()
        assert (folder/'preview_Test_Test_Hardcore_64.m4a').is_file()
        prepared=c.post(f'/tracks/{tid}/export')
        assert prepared.json()=={'filename':'Test_Test_Hardcore_64.mp3','format':'mp3'}
        export=c.get(f'/tracks/{tid}/export');path.write_bytes(export.content)
        assert str(ID3(path)['TBPM'])=='64'
        c.patch(f'/tracks/{tid}/style',json={'label':'Electronic---House'})
        assert (folder/'Test_Test_House_64.m4a').is_file()
        assert (folder/'preview_Test_Test_House_64.m4a').is_file()
        assert c.post(f'/tracks/{tid}/export').json()=={'filename':'Test_Test_House_64.mp3','format':'mp3'}
        store.update(tid,bpm=None)
        export=c.get(f'/tracks/{tid}/export');path.write_bytes(export.content)
        assert 'Test_Test_House_BPM_inconnu.mp3' in export.headers['content-disposition']
        assert 'TBPM' not in ID3(path)
    with TestClient(main.app,headers={'x-mylib-token':main.TOKEN}) as c:
        assert store.get(tid)['factor']==.5
        pid=c.post('/playlists',json={'name':'Survive'}).json()['id']
        c.put(f'/playlists/{pid}/tracks/{tid}')
        (store.ROOT/'exports'/f'{tid}-legacy.mp3').write_bytes(b'old cache')
        c.delete(f'/tracks/{tid}')
        assert not folder.exists()
        assert not (store.ROOT/'exports'/tid).exists()
        assert not (store.ROOT/'exports'/f'{tid}-legacy.mp3').exists()
        p=next(p for p in c.get('/library').json()['playlists'] if p['id']==pid)
        assert p['tracks']==[]
        assert c.get(f'/tracks/{tid}/media').status_code==404
        c.delete('/playlists/'+pid)


def test_restart_without_source_network(tmp_path, monkeypatch):
    import subprocess
    tid=None
    headers={'x-mylib-token':main.TOKEN}
    with TestClient(main.app,headers=headers) as c:
        tid=track();folder=store.ROOT/'media'/tid;folder.mkdir()
        subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','sine=frequency=220:duration=2','-c:a','aac',str(folder/'source.m4a')],capture_output=True,check=True)
        import shutil
        shutil.copyfile(folder/'source.m4a',folder/'playback.m4a')
        store.update(tid,duration=2)
        pid=c.post('/playlists',json={'name':'Offline persistence'}).json()['id']
        c.put(f'/playlists/{pid}/tracks/{tid}')
    with monkeypatch.context() as offline:
        offline.setattr(main.socket,'getaddrinfo',lambda *a,**k: (_ for _ in ()).throw(OSError('Network unavailable')))
        with TestClient(main.app,headers=headers) as c:
            data=c.get('/library').json()
            assert any(t['id']==tid for t in data['tracks'])
            assert next(p for p in data['playlists'] if p['id']==pid)['tracks']==[tid]
            assert c.get(f'/tracks/{tid}/media',headers={'Range':'bytes=0-63'}).status_code==206
            prepared=c.post(f'/tracks/{tid}/export')
            assert prepared.status_code==200,prepared.json()
            assert prepared.json()['filename'].endswith('.mp3')
            assert c.get(f'/tracks/{tid}/export').status_code==200
            c.delete('/playlists/'+pid)
            c.delete('/tracks/'+tid)
