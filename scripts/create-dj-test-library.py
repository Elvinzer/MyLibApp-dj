"""Isolated browser library; never modifies the user's database."""
import json, sqlite3, subprocess, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from backend import store, styles
root=Path('.test-data/dj-browser').resolve();root.mkdir(parents=True,exist_ok=True)
source_root=store.ROOT
if root==source_root.resolve():raise SystemExit('La bibliothèque de test doit être indépendante.')
with sqlite3.connect(source_root/'library.sqlite') as src, sqlite3.connect(root/'library.sqlite') as dst:src.backup(dst)
for folder in ('media','analysis'):
    if not (root/folder).exists():subprocess.run(['/bin/cp','-cR',str(source_root/folder),str(root/folder)],check=True)
store.ROOT=root;store.init()
base=next(t for t in store.tracks() if 'Where Is My Mind' in t['title'])
store.update(base['id'],styleStatus='ready',styleVersion=styles.VERSION,styles=[{'label':'Electronic---Hardcore','score':.344}],styleOverride=None)
for i in range(8):
    tid=f'dj-fixture-{i}'
    t={**base,'id':tid,'title':f'Transition test {i+1}','author':'Bibliothèque de test','bpm':base['bpm']+i*.4,'factor':base['factor'],'quality':'stable',
       'styleStatus':'ready','styleVersion':styles.VERSION,
       'styles':[{'label':'Electronic---Hardcore' if i<6 else 'Electronic---Hardstyle','score':.4}],'styleOverride':None}
    with store.db() as conn:conn.execute('INSERT OR REPLACE INTO tracks VALUES (?,?,?)',(tid,tid,json.dumps(t)))
    target=root/'media'/tid
    if not target.exists():subprocess.run(['/bin/cp','-cR',str(root/'media'/base['id']),str(target)],check=True)
    (root/'analysis'/(tid+'.json')).write_bytes((root/'analysis'/(base['id']+'.json')).read_bytes())
print(json.dumps({'source':base['id'],'root':str(root)}))
