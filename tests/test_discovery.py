import json
import pytest
import httpx
from fastapi.testclient import TestClient
from backend import main, store, discovery, styles, style_jobs


def track(tid, bpm=124, style='Electronic---Afro House', **extra):
    return dict(id=tid,title=tid,author='Nora Vale',duration=240,status='ready',mediaReady=True,
                bpm=bpm,factor=1,quality='stable',source='YouTube',url='https://www.youtube.com/watch?v=abcdefghijk',
                styleStatus='ready',styles=[{'label':style,'score':.6}], **extra)


def row(tid=123, title='Mirage (Extended Mix)', artist='Nora Vale', **extra):
    return dict(kind='song',trackId=tid,trackName=title,artistName=artist,
                trackViewUrl=f'https://music.apple.com/fr/album/mirage/{tid}?i={tid}',
                previewUrl='https://audio-ssl.itunes.apple.com/preview.m4a',
                artworkUrl100='https://is1-ssl.mzstatic.com/cover.jpg',trackTimeMillis=240000,
                primaryGenreName='Dance',**extra)


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(store,'ROOT',tmp_path)
    store.init()
    discovery._cache.clear()
    discovery._candidates.clear()
    monkeypatch.setattr(style_jobs.StyleJobs,'start',lambda self:None)
    monkeypatch.setattr(style_jobs.StyleJobs,'close',lambda self:None)
    for t in [track('source'), track('near',126),track('far',140),track('corrected',62),track('other',124,'Electronic---Hardcore')]:
        if t['id']=='corrected':t['factor']=2
        with store.db() as conn:conn.execute('INSERT INTO tracks VALUES (?,?,?)',(t['id'],t['id'],json.dumps(t)))
    with TestClient(main.app,headers={'x-mylib-token':main.TOKEN}) as c:yield c


def test_local_reference_filters_corrections_and_boundaries(client):
    def search(**kw):return client.post('/tracks/source/discovery',json=kw).json()
    data=search()
    assert [i['trackId'] for i in data['items']]==['corrected','near','other']
    assert data['items'][0]['bpm']==124
    assert search(reference='style')['total']==2
    assert search(reference='artist')['total']==3
    assert search(tolerance=2)['total']==3
    assert search(term='near')['items'][0]['trackId']=='near'
    assert client.post('/tracks/source/discovery',json={'tolerance':3}).status_code==422
    assert client.post('/tracks/missing/discovery',json={}).status_code==404
    store.update('source',quality='variable')
    data=search(reference='style')
    assert data['referenceBpm'] is None
    assert data['total']==3
    assert 'sans filtre BPM' in data['message']


def test_external_dedup_preserves_versions_and_marks_owned(client,monkeypatch):
    seen=[]
    def catalogue(params):
        seen.append(params)
        return [row(),row(124),row(125,'Mirage (Radio Edit)'),row(126,'near'),row(127,'source')]
    monkeypatch.setattr(discovery,'catalogue',catalogue)
    result=client.post('/tracks/source/discovery',json={'scope':'external'}).json()
    assert result['total']==3
    assert result['items'][0]['preview'].startswith('https://audio-ssl.itunes.apple.com/')
    assert result['items'][0]['bpm'] is None
    assert any(i['trackId']=='near' and i['available'] for i in result['items'])
    assert any(i['title']=='Mirage (Radio Edit)' for i in result['items'])
    assert all('source'!=i['title'] for i in result['items'])
    assert len(seen)==2


def test_catalogue_failure_isolated_and_validation(client,monkeypatch):
    discovery._cache.clear()
    def fail(*args,**kw):raise httpx.ConnectError('offline')
    monkeypatch.setattr(discovery.httpx,'get',fail)
    assert client.post('/tracks/source/discovery',json={'scope':'external'}).status_code==503
    assert client.post('/tracks/source/discovery',json={}).status_code==200
    assert client.get('/discovery/selection').status_code==200
    assert client.put('/discovery/selection/bad').status_code==400


def test_retain_remove_restart_and_deleted_local(client):
    assert client.put('/discovery/selection/local:near').status_code==200
    client.put('/discovery/selection/local:near')
    store.init()
    data=client.get('/discovery/selection').json()['items']
    assert len(data)==1 and data[0]['available']
    with store.db() as conn:conn.execute('DELETE FROM tracks WHERE id=?',('near',))
    data=client.get('/discovery/selection').json()['items']
    assert data[0]['status']=='missing' and not data[0]['available']
    assert client.delete('/discovery/selection/local:near').status_code==200
    assert not client.get('/discovery/selection').json()['items']


def test_mixed_selection_atomic_save_and_undo_only_new_members(client,monkeypatch):
    monkeypatch.setattr(discovery,'catalogue',lambda params:[row()])
    for key in ['local:near','local:other','itunes:123']:assert client.put('/discovery/selection/'+key).status_code==200
    pid=client.post('/playlists',json={'name':'Warm-up'}).json()['id']
    client.put(f'/playlists/{pid}/tracks/near')
    data=client.post('/discovery/playlist',json={'keys':['local:near','local:other','itunes:123'],'playlistId':pid}).json()
    assert data['added']==1 and data['available']==2
    assert len(client.get('/discovery/selection').json()['items'])==3
    assert client.post('/discovery/undo/'+data['undo']).status_code==200
    pl=client.get('/library').json()['playlists'][0]
    assert pl['tracks']==['near']
    assert client.post('/discovery/undo/'+data['undo']).status_code==409
    assert client.post('/discovery/playlist',json={'keys':['itunes:123'],'name':'Empty'}).status_code==409
    assert len(client.get('/library').json()['playlists'])==1
    assert client.post('/discovery/playlist',json={'keys':['local:near'],'playlistId':'gone'}).status_code==404


def test_save_new_playlist_idempotent_and_bounded(client):
    client.put('/discovery/selection/local:near')
    saved=client.post('/discovery/playlist',json={'keys':['local:near','local:near'],'name':'Set'}).json()
    assert saved['added']==1
    repeated=client.post('/discovery/playlist',json={'keys':['local:near'],'playlistId':saved['playlistId']}).json()
    assert repeated['added']==0
    assert client.post('/discovery/playlist',json={'keys':[],'name':'none'}).status_code==422
    assert client.post('/discovery/playlist',json={'keys':['local:near'],'name':'   '}).status_code==400


def test_import_link_association_failure_and_progress(client,monkeypatch):
    monkeypatch.setattr(discovery,'catalogue',lambda params:[row()])
    client.put('/discovery/selection/itunes:123')
    calls=[]
    def add(link):
        calls.append(link.url)
        t=track('imported');t.update(mediaReady=False,status='download',progress=25)
        with store.db() as conn:conn.execute('INSERT INTO tracks VALUES (?,?,?)',(t['id'],t['id'],json.dumps(t)))
        return {'track':t,'duplicate':False}
    monkeypatch.setattr(main,'add',add)
    result=client.post('/discovery/selection/itunes:123/import',json={'url':'https://www.youtube.com/watch?v=abcdefghijk'})
    assert result.status_code==200 and calls
    idea=client.get('/discovery/selection').json()['items'][0]
    assert idea['trackId']=='imported' and idea['status']=='download' and idea['progress']==25
    assert client.post('/discovery/selection/itunes:123/import',json={'url':'https://www.youtube.com/watch?v=abcdefghijk'}).status_code==409
    store.update('imported',mediaReady=True,status='ready')
    assert client.get('/discovery/selection').json()['items'][0]['available']


@pytest.mark.parametrize('url',['https://evil.example/a','https://apple.com.evil.example/a','https://user:pass@music.apple.com/a','javascript:alert(1)','https://music.apple.com:bad/a'])
def test_catalogue_urls_reject_untrusted_hosts(url):
    assert discovery.safe_apple_url(url) is None


def test_preview_urls_allow_real_apple_cdn_only():
    assert discovery.safe_apple_url('http://audio-ssl.itunes.apple.com/a',True)=='https://audio-ssl.itunes.apple.com/a'
    assert discovery.safe_apple_url('https://is1-ssl.mzstatic.com/a',True)
    assert discovery.safe_apple_url('https://apple.com/a',True) is None


def test_custom_artist_and_style_override_local_reference(client):
    store.update('near',author='Another Artist')
    data=client.post('/tracks/source/discovery',json={'reference':'artist','term':'Another Artist'}).json()
    assert [i['trackId'] for i in data['items']]==['near']
    data=client.post('/tracks/source/discovery',json={'reference':'style','term':'Hardcore'}).json()
    assert [i['trackId'] for i in data['items']]==['other']


def test_retaining_searched_result_does_not_require_second_network_request(client,monkeypatch):
    calls=[]
    def catalogue(params):
        calls.append(params)
        return [row()]
    monkeypatch.setattr(discovery,'catalogue',catalogue)
    result=client.post('/tracks/source/discovery',json={'scope':'external','reference':'artist'})
    assert result.status_code==200 and calls[0]['attribute']=='artistTerm'
    assert client.put('/discovery/selection/itunes:123').status_code==200
    assert len(calls)==1


def test_associating_an_existing_retained_file_merges_duplicate_ideas(client,monkeypatch):
    monkeypatch.setattr(discovery,'catalogue',lambda params:[row()])
    client.put('/discovery/selection/local:near')
    client.put('/discovery/selection/itunes:123')
    monkeypatch.setattr(main,'add',lambda link:{'track':store.get('near'),'duplicate':True})
    result=client.post('/discovery/selection/itunes:123/import',json={'url':'https://www.youtube.com/watch?v=abcdefghijk'})
    assert result.status_code==200 and result.json()['duplicate']
    ideas=client.get('/discovery/selection').json()['items']
    assert len(ideas)==1 and ideas[0]['key']=='itunes:123' and ideas[0]['trackId']=='near'
    saved=client.post('/discovery/playlist',json={'keys':[i['key'] for i in ideas],'name':'Merged'}).json()
    assert saved['available']==1 and saved['added']==1


def test_artist_search_rejects_title_homonyms(client,monkeypatch):
    monkeypatch.setattr(discovery,'catalogue',lambda params:[row(1,'Nora Vale','Unrelated'),row(2,'Song','Nora Vale'),row(3,'Collaboration','Nora Vale & Guest')])
    data=client.post('/tracks/source/discovery',json={'scope':'external','reference':'artist'}).json()
    assert {i['key'] for i in data['items']}=={'itunes:2','itunes:3'}


def test_electronic_style_discovery_does_not_recommend_rap_homonyms(client,monkeypatch):
    store.update('source',author='',styles=[{'label':'Electronic---Hardcore','score':.8}])
    rap=row(1,'Hardcore','Rap Artist');rap['primaryGenreName']='Hip-Hop/Rap'
    dance=row(2,'Hardcore (Extended)','DJ');dance['primaryGenreName']='Dance'
    dancehall=row(3,'Hardcore','Artist');dancehall['primaryGenreName']='Modern Dancehall'
    monkeypatch.setattr(discovery,'catalogue',lambda params:[rap,dance,dancehall])
    result=client.post('/tracks/source/discovery',json={'scope':'external','reference':'style'}).json()
    assert [i['key'] for i in result['items']]==['itunes:2']
