"""Install original MTG weights atomically, checking pinned SHA256 digests."""
import hashlib
import sys
import urllib.request
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from backend.styles import MODEL_HASH, META_HASH

BASE='https://essentia.upf.edu/models/music-style-classification/discogs-effnet/'

def install(folder):
    folder.mkdir(parents=True,exist_ok=True)
    for name, remote, digest in [('discogs-effnet.onnx','discogs-effnet-bsdynamic-1.onnx',MODEL_HASH),
                                 ('discogs-effnet.json','discogs-effnet-bsdynamic-1.json',META_HASH)]:
        path=folder/name
        if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest()==digest:
            continue
        temp=path.with_suffix(path.suffix+'.partial')
        try:
            with urllib.request.urlopen(BASE+remote,timeout=60) as response, temp.open('wb') as out:
                size=0
                while chunk:=response.read(1024*1024):
                    size+=len(chunk)
                    if size>25_000_000:raise RuntimeError('Modèle trop volumineux.')
                    out.write(chunk)
            if hashlib.sha256(temp.read_bytes()).hexdigest()!=digest:
                raise RuntimeError('Le modèle téléchargé ne correspond pas à la version attendue.')
            temp.replace(path)
        finally:
            temp.unlink(missing_ok=True)

if __name__=='__main__':
    install(Path(__file__).resolve().parents[1]/'backend/models')
    print('Modèle de style vérifié et installé.')
