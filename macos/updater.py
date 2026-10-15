"""Local source updates. No remote updater and no user-library replacement."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import shutil
import signal
import subprocess
import tempfile
import time
import urllib.request

IDENTIFIER = 'local.mylib.desktop'
SOURCE_DIRS = ('app', 'backend', 'lib', 'macos', 'scripts', 'public')
SOURCE_FILES = ('package.json', 'package-lock.json', 'requirements.lock', 'requirements-spotify.lock', 'next.config.ts', 'tsconfig.json')


def fingerprint(source):
    source = Path(source)
    if not (source/'package.json').is_file() or not (source/'macos/MyLib.swift').is_file():
        raise FileNotFoundError('Le dossier de développement est indisponible.')
    paths = [source/name for name in SOURCE_FILES if (source/name).is_file()]
    for folder in SOURCE_DIRS:
        if (source/folder).is_dir():
            paths += [p for p in (source/folder).rglob('*') if p.is_file()
                      and not any(part in ('__pycache__', '.DS_Store') for part in p.parts)
                      and p.suffix not in ('.pyc', '.log') and p.name != 'validation.json']
    digest = hashlib.sha256()
    for path in sorted(paths):
        digest.update(str(path.relative_to(source)).encode()+b'\0')
        digest.update(path.read_bytes()+b'\0')
    return digest.hexdigest()


def check(source, runtime):
    try:
        current = fingerprint(source)
        manifest = json.loads((Path(runtime)/'install-manifest.json').read_text())
        return {'available': current != manifest.get('fingerprint'), 'fingerprint': current, 'reachable': True}
    except (OSError, ValueError):
        return {'available': False, 'reachable': False}


def clone(source, destination):
    subprocess.run(['/bin/cp', '-cR', str(source), str(destination)], check=True)


def stop_runtime(runtime):
    runtime = Path(runtime)
    try:
        instance = json.loads((runtime/'.runtime/instance.json').read_text())
        health = json.load(urllib.request.urlopen(instance['url']+'/api/health', timeout=2))
    except (OSError, ValueError):
        return
    if health.get('installation') != str(runtime):
        raise RuntimeError('Un autre service utilise cette adresse. Mise à jour annulée.')
    pid = int(instance['pid'])
    command = subprocess.check_output(['ps', '-p', str(pid), '-o', 'command='], text=True)
    if str(runtime/'scripts/launch.mjs') not in command:
        raise RuntimeError('Le serveur ne peut pas être arrêté en sécurité.')
    os.kill(pid, signal.SIGTERM)
    for _ in range(100):
        try:
            urllib.request.urlopen(instance['url']+'/api/health', timeout=.2)
        except OSError:
            return
        time.sleep(.1)
    raise RuntimeError('Le serveur ne s’est pas arrêté. Réessayez après avoir quitté MyLib.')


def swap_install(staged_runtime, runtime, staged_app, app, validate):
    """Promote both artifacts together; restore both if validation fails."""
    runtime, app = Path(runtime), Path(app)
    backup_runtime = runtime.with_name(runtime.name+'.previous')
    backup_app = app.with_name(app.name+'.previous')
    promoted_runtime = promoted_app = old_runtime = old_app = False
    try:
        for backup in (backup_runtime, backup_app):
            if backup.exists(): shutil.rmtree(backup)
        if runtime.exists(): runtime.rename(backup_runtime); old_runtime = True
        Path(staged_runtime).rename(runtime); promoted_runtime = True
        if app.exists(): app.rename(backup_app); old_app = True
        Path(staged_app).rename(app); promoted_app = True
        validate(runtime)
    except BaseException:
        if promoted_app and app.exists(): shutil.rmtree(app)
        if old_app: backup_app.rename(app)
        if promoted_runtime and runtime.exists(): shutil.rmtree(runtime)
        if old_runtime: backup_runtime.rename(runtime)
        raise
    # Backups are application files only, never media or library.sqlite.
    for backup in (backup_runtime, backup_app):
        if backup.exists(): shutil.rmtree(backup)


def validate_runtime(runtime):
    logfile = runtime.parent/'logs/update-probe.log'
    logfile.parent.mkdir(exist_ok=True)
    with logfile.open('w') as log:
        process = subprocess.Popen(['node', str(runtime/'scripts/launch.mjs'), '--no-open'],
                                   cwd=runtime, stdout=log, stderr=log, start_new_session=True)
        try:
            deadline = time.monotonic()+60
            while time.monotonic() < deadline:
                if process.poll() is not None:
                    raise RuntimeError('La nouvelle version ne démarre pas ; ancienne version restaurée.')
                try:
                    instance = json.loads((runtime/'.runtime/instance.json').read_text())
                    health = json.load(urllib.request.urlopen(instance['url']+'/api/health',timeout=1))
                    if health.get('installation') == str(runtime):
                        response = urllib.request.urlopen(instance['url']+'/api/library',timeout=2)
                        if response.status == 200: return
                except (OSError, ValueError): pass
                time.sleep(.2)
            raise RuntimeError('La nouvelle version ne répond pas ; ancienne version restaurée.')
        finally:
            if process.poll() is None:
                os.killpg(process.pid,signal.SIGTERM)
                try: process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid,signal.SIGKILL);process.wait()


def apply(source, runtime, app):
    source, runtime, app = map(lambda p: Path(p).resolve(), (source,runtime,app))
    parent = runtime.parent
    lock = parent/'.update-lock'
    if lock.exists():
        try:
            pid=int((lock/'pid').read_text());os.kill(pid,0)
        except (OSError,ValueError): shutil.rmtree(lock)
        else: raise RuntimeError('Une mise à jour est déjà en cours.')
    lock.mkdir();(lock/'pid').write_text(str(os.getpid()))
    try:
        expected = fingerprint(source)
        logs = parent/'logs';logs.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='.update-build-',dir=parent) as scratch:
            work = Path(scratch)
            for name in SOURCE_DIRS+SOURCE_FILES:
                if (source/name).exists(): clone(source/name,work/name)
            for name in ('.venv','node_modules'):
                origin = source/name if (source/name).exists() else runtime/name
                clone(origin,work/name)
            for origin in (source/'.spotify-venv', runtime/'.spotify-venv'):
                if origin.exists():
                    clone(origin,work/'.spotify-venv')
                    break
            with (logs/'update.log').open('w') as log:
                env={**os.environ,'MYLIB_UPDATE_SOURCE':str(source),'MYLIB_RUNTIME_DIR':str(runtime),'MYLIB_APP_DEST':str(app),'MYLIB_INSTALL_EXPECTED':expected}
                installed=json.loads((runtime/'install-manifest.json').read_text())
                for lockfile,command in [('package-lock.json',['npm','ci']),('requirements.lock',[str(work/'.venv/bin/python'),'-m','pip','install','-r','requirements.lock'])]:
                    digest=hashlib.sha256((work/lockfile).read_bytes()).hexdigest()
                    if installed.get(lockfile) != digest:
                        subprocess.run(command,cwd=work,env=env,stdout=log,stderr=log,check=True,timeout=900)
                subprocess.run([str(work/'.venv/bin/python'),'scripts/install-style-model.py'],cwd=work,env=env,stdout=log,stderr=log,check=True,timeout=180)
                subprocess.run(['npm','run','build'],cwd=work,env=env,stdout=log,stderr=log,check=True,timeout=600)
                if fingerprint(source) != expected:
                    raise RuntimeError('Le code a changé pendant la préparation. Relancez la mise à jour.')
                subprocess.run([str(work/'.venv/bin/python'),str(work/'scripts/package-mac.py')],cwd=work,env=env,stdout=log,stderr=log,check=True,timeout=600)
        return {'updated':True}
    finally:
        shutil.rmtree(lock,ignore_errors=True)


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--source',required=True);parser.add_argument('--runtime',required=True);parser.add_argument('--app');parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    try:
        result=apply(args.source,args.runtime,args.app) if args.apply else check(args.source,args.runtime)
        print(json.dumps(result))
    except Exception as exc:
        print(json.dumps({'updated':False,'error':str(exc)}));raise SystemExit(1)

if __name__ == '__main__': main()
