import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'

# load locations (prefer generated)
locs_file = DATA / 'locations.generated.json'
if not locs_file.exists():
    locs_file = DATA / 'locations.json'
locations = json.load(open(locs_file, 'r', encoding='utf-8'))

# load baits (prefer normalized)
baits_file = DATA / 'baits.normalized.json'
if not baits_file.exists():
    baits_file = DATA / 'baits.json'
baits = json.load(open(baits_file, 'r', encoding='utf-8'))

# target location slug
slug = 'cypress_lake'
loc = next((l for l in locations if l.get('slug')==slug), None)
if not loc:
    loc = next((l for l in locations if l.get('name')=='Cypress Lake'), None)

print('Location:', loc)

# load per-location fish if available
fish_file = DATA / 'fish' / f'{slug}.json'
fish = []
if fish_file.exists():
    j = json.load(open(fish_file, 'r', encoding='utf-8'))
    arr = j.get(loc['name']) or j.get(slug) or (j.get(list(j.keys())[0]) if j else [])
    fish = [ (item if isinstance(item, dict) else {'Species': item}) for item in arr ]

# if no per-location fish file, we'll treat species matching as permissive
no_fish = len(fish) == 0

def tokens(s):
    if not s:
        return []
    return re.findall(r"\w+", str(s).lower())

fish_token_sets = []
for f in fish:
    s = set(tokens(f.get('Species') or f.get('species') or ''))
    g = set(tokens(f.get('Fish Group') or f.get('fishGroup') or f.get('group') or ''))
    l = set(tokens(f.get('Lifestyle') or f.get('lifestyle') or ''))
    fish_token_sets.append(s | g | l)
print('Fish count in file:', len(fish))
print('Baits count:', len(baits))

# compute applicable freshwater baits for this location
applicable = []
for bait in baits:
    # debug: show bait name and targets
    # print('Bait:', bait.get('name'), 'targets:', bait.get('targets'))
    # type filter: support Freshwater/Saltwater or location-specific bait types
    bt = bait.get('type')
    if bt and bt not in ('Universal','any'):
        if bt in ('Freshwater','Saltwater'):
            if loc.get('waterType') != bt:
                continue
        else:
            # location-specific bait: only valid for that exact location name
            if bt != loc.get('name'):
                continue
    # species match: if bait has no targets, assume usable; otherwise check targets vs fish names
    targets = (bait.get('targets') or [])
    if targets and not no_fish:
        # tokenized whole-word match against species names, fish groups, or lifestyles
        # strict target match: all tokens of a target must be present in a fish token set
        ok = False
        for t in targets:
            tset = set(tokens(t))
            if not tset:
                continue
            for ftokens in fish_token_sets:
                if tset.issubset(ftokens):
                    ok = True
                    break
            if ok:
                break
        if not ok:
            continue
    applicable.append(bait)

print('\nApplicable freshwater baits for', loc['name'])
for b in applicable:
    print('-', b['name'], '| type:', b['type'], '| targets:', b.get('targets'), '| likelihood:', b.get('likelihood'))
