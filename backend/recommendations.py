"""Deterministic DJ ranking using corrected, unrounded tempos."""
import math
from decimal import Decimal
from .styles import effective, NEIGHBORS


def valid_bpm(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value > 0


def rank(source, tracks, bpm, tolerance=5, same=False, limit=5):
    source_styles = set(effective(source))
    items = []
    excluded = 0
    for t in tracks:
        if t['id'] == source['id'] or t.get('status') == 'deleting' or not t.get('mediaReady'):
            continue
        tempo = t.get('bpm')
        factor = t.get('factor', 1)
        if not valid_bpm(tempo) or factor not in (.5, 1, 2) or t.get('quality') != 'stable':
            excluded += 1
            continue
        corrected = Decimal(str(tempo))*Decimal(str(factor))
        delta = corrected-Decimal(str(bpm))
        if abs(delta) > Decimal(str(tolerance)):
            continue
        styles = set(effective(t))
        group = 0 if source_styles & styles else 1 if any((a,b) in NEIGHBORS for a in source_styles for b in styles) else 2
        if same and group != 0:
            continue
        reason = ('Même style', 'Style voisin', 'Tempo proche')[group]
        items.append((group if source_styles else 0, abs(delta), t.get('title','').casefold(), t['id'],
                      {'track':t, 'bpm':float(corrected), 'delta':float(delta), 'reason':reason}))
    items.sort(key=lambda x:x[:4])
    return {'items':[i[4] for i in items[:limit]], 'total':len(items), 'excluded':excluded,
            'styleAvailable':bool(source_styles), 'referenceBpm':bpm}
