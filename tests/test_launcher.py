from pathlib import Path
import subprocess


def test_missing_installation_has_helpful_message(tmp_path):
    scripts=tmp_path/'scripts';scripts.mkdir()
    (scripts/'launch.mjs').write_text(Path('scripts/launch.mjs').read_text())
    (scripts/'ports.mjs').write_text(Path('scripts/ports.mjs').read_text())
    result=subprocess.run(['node',str(scripts/'launch.mjs'),'--no-open'],capture_output=True,text=True,timeout=15)
    assert result.returncode==1
    assert 'Installer.command' in result.stderr


def test_missing_dependency_has_helpful_message(tmp_path):
    import shutil,os
    scripts=tmp_path/'scripts';scripts.mkdir()
    (scripts/'launch.mjs').write_text(Path('scripts/launch.mjs').read_text())
    (scripts/'ports.mjs').write_text(Path('scripts/ports.mjs').read_text())
    env={**os.environ,'PATH':str(tmp_path)}
    result=subprocess.run([shutil.which('node'),str(scripts/'launch.mjs'),'--no-open'],env=env,capture_output=True,text=True,timeout=15)
    assert result.returncode==1
    assert 'Dépendance absente' in result.stderr
