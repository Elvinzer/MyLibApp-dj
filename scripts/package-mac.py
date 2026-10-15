"""Build and atomically install the local macOS app and its independent runtime."""
from pathlib import Path
import hashlib,json,os,plistlib,shutil,subprocess,sys,tempfile
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'macos'))
from updater import IDENTIFIER,fingerprint,clone,stop_runtime,swap_install,validate_runtime
source=Path(os.environ.get('MYLIB_UPDATE_SOURCE',str(root))).resolve()
runtime=Path(os.environ.get('MYLIB_RUNTIME_DIR',str(Path.home()/'Library/Application Support/MyLibApp/Runtime')))
destination=Path(os.environ.get('MYLIB_APP_DEST','/Applications/MyLib.app'))
destination.parent.mkdir(parents=True,exist_ok=True);runtime.parent.mkdir(parents=True,exist_ok=True)
if destination.exists():
    info=destination/'Contents/Info.plist'
    if not info.exists() or plistlib.loads(info.read_bytes()).get('CFBundleIdentifier')!=IDENTIFIER:
        raise SystemExit('Une autre application MyLib existe déjà ; aucun fichier remplacé.')
if runtime.exists() and not (runtime/'.mylib-runtime').exists():
    raise SystemExit('Le dossier Runtime ne porte pas le marqueur MyLib ; aucun fichier remplacé.')
subprocess.run([sys.executable,str(root/'scripts/install-style-model.py')],check=True)
subprocess.run([sys.executable,str(root/'scripts/install-spotify.py')],check=True)
expected=os.environ.get('MYLIB_INSTALL_EXPECTED',fingerprint(source))
with tempfile.TemporaryDirectory(prefix='.mylib-app-',dir=destination.parent) as scratch, tempfile.TemporaryDirectory(prefix='.mylib-runtime-',dir=runtime.parent) as runtime_scratch:
    temp=Path(scratch);bundle=temp/'MyLib.app';contents=bundle/'Contents';resources=contents/'Resources';executable=contents/'MacOS'
    resources.mkdir(parents=True);executable.mkdir()
    subprocess.run(['swiftc','-swift-version','5','-parse-as-library','-target','arm64-apple-macos14.0','-O','-framework','AppKit',str(root/'macos/MyLib.swift'),'-o',str(executable/'MyLib')],check=True)
    subprocess.run(['swift',str(root/'macos/Icon.swift'),str(temp/'icon.png')],check=True)
    iconset=temp/'MyLib.iconset';iconset.mkdir()
    for size in (16,32,128,256,512):
        for scale in (1,2):
            name=f'icon_{size}x{size}'+('@2x' if scale==2 else '')+'.png'
            subprocess.run(['sips','-z',str(size*scale),str(size*scale),str(temp/'icon.png'),'--out',str(iconset/name)],check=True,stdout=subprocess.DEVNULL)
    subprocess.run(['iconutil','-c','icns',str(iconset),'-o',str(resources/'MyLib.icns')],check=True)
    (resources/'project-path.txt').write_text(str(runtime)+'\n')
    (resources/'source-path.txt').write_text(str(source)+'\n')
    shutil.copyfile(root/'macos/updater.py',resources/'updater.py')
    (contents/'Info.plist').write_bytes(plistlib.dumps({'CFBundleIdentifier':IDENTIFIER,'CFBundleName':'MyLib','CFBundleDisplayName':'MyLib','CFBundleExecutable':'MyLib','CFBundlePackageType':'APPL','CFBundleShortVersionString':'1.1.0','CFBundleVersion':'2','CFBundleIconFile':'MyLib.icns','LSMinimumSystemVersion':'14.0','NSHighResolutionCapable':True,'NSDocumentsFolderUsageDescription':'MyLib vérifie le code local pour proposer et installer les mises à jour de l’application.'}))
    subprocess.run(['codesign','--force','--sign','-',str(bundle)],check=True)
    subprocess.run(['codesign','--verify','--deep','--strict',str(bundle)],check=True)
    staged=Path(runtime_scratch)/'Runtime';staged.mkdir()
    for name in ('.venv','.spotify-venv','node_modules','.next-build','public','backend','scripts','macos','package.json','package-lock.json','next.config.ts','requirements.lock','requirements-spotify.lock'):
        clone(root/name,staged/name)
    (staged/'.mylib-runtime').write_text(IDENTIFIER+'\n')
    manifest={'schema':1,'fingerprint':expected,'source':str(source)}
    for name in ('package-lock.json','requirements.lock','requirements-spotify.lock'):manifest[name]=hashlib.sha256((root/name).read_bytes()).hexdigest()
    (staged/'install-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    if fingerprint(source)!=expected:raise SystemExit('Le code a changé pendant la préparation ; installation annulée.')
    stop_runtime(runtime)
    swap_install(staged,runtime,bundle,destination,validate_runtime)
shortcut=Path.home()/'Desktop/MyLib.app'
if destination==Path('/Applications/MyLib.app'):
    if shortcut.is_symlink() and os.readlink(shortcut) in (str(Path.home()/'Applications/MyLib.app'),str(destination)):
        shortcut.unlink()
    if not shortcut.exists() and not shortcut.is_symlink():shortcut.symlink_to(destination)
print('Application installée :',destination)
