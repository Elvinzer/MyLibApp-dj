import importlib.util
import json
from pathlib import Path
import pytest
spec=importlib.util.spec_from_file_location('mylib_updater',Path('macos/updater.py'))
u=importlib.util.module_from_spec(spec);spec.loader.exec_module(u)


def source(tmp_path):
    root=tmp_path/'source';(root/'macos').mkdir(parents=True)
    (root/'package.json').write_text('{}')
    (root/'macos/MyLib.swift').write_text('version one')
    (root/'backend').mkdir();(root/'backend/main.py').write_text('a=1')
    return root


def test_fingerprint_and_missing_source(tmp_path):
    root=source(tmp_path);runtime=tmp_path/'Runtime';runtime.mkdir()
    (runtime/'install-manifest.json').write_text(json.dumps({'fingerprint':u.fingerprint(root)}))
    assert not u.check(root,runtime)['available']
    (root/'README.md').write_text('docs');(root/'backend/__pycache__').mkdir();(root/'backend/__pycache__/x.pyc').write_bytes(b'cache')
    assert not u.check(root,runtime)['available']
    (root/'backend/main.py').write_text('a=2')
    assert u.check(root,runtime)['available']
    assert not u.check(tmp_path/'missing',runtime)['available']
    assert not u.check(tmp_path/'missing',runtime)['reachable']


@pytest.mark.parametrize('failure',[True,False])
def test_atomic_install_and_rollback(tmp_path,failure):
    runtime=tmp_path/'Runtime';app=tmp_path/'MyLib.app';staged=tmp_path/'new-runtime';new_app=tmp_path/'new-app'
    for p,value in [(runtime,'old'),(app,'old'),(staged,'new'),(new_app,'new')]:p.mkdir();(p/'version').write_text(value)
    media=tmp_path/'media';media.mkdir();(media/'song.mp3').write_bytes(b'unchanged')
    def validate(p):
        assert (p/'version').read_text()=='new'
        if failure:raise RuntimeError('healthcheck failed')
    if failure:
        with pytest.raises(RuntimeError):u.swap_install(staged,runtime,new_app,app,validate)
    else:u.swap_install(staged,runtime,new_app,app,validate)
    assert (runtime/'version').read_text()==('old' if failure else 'new')
    assert (app/'version').read_text()==('old' if failure else 'new')
    assert (media/'song.mp3').read_bytes()==b'unchanged'


def test_failure_before_build_preserves_installation_and_releases_lock(tmp_path):
    runtime=tmp_path/'Runtime';runtime.mkdir();(runtime/'version').write_text('old')
    app=tmp_path/'MyLib.app';app.mkdir();(app/'version').write_text('old')
    with pytest.raises(FileNotFoundError):u.apply(tmp_path/'missing-source',runtime,app)
    assert (runtime/'version').read_text()=='old'
    assert (app/'version').read_text()=='old'
    assert not (tmp_path/'.update-lock').exists()


def test_active_update_lock_blocks_second_update(tmp_path):
    import os
    runtime=tmp_path/'Runtime';runtime.mkdir()
    lock=tmp_path/'.update-lock';lock.mkdir();(lock/'pid').write_text(str(os.getpid()))
    with pytest.raises(RuntimeError,match='déjà en cours'):u.apply(tmp_path/'source',runtime,tmp_path/'App')
    assert lock.exists()
