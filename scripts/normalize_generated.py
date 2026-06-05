#!/usr/bin/env python3
"""Normalize generated wiki data into cleaner JSON files.

Outputs:
- data/baits.normalized.json
- data/species_by_location.normalized.json
"""
import json, re
from pathlib import Path

DATA = Path('data')

def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))

def normalize_baits(raw):
    out = []
    for item in raw:
        name = (item.get('name') or '').strip()
        # skip header-like rows
        if not name or len(name) < 3:
            continue
        if re.match(r'^[0-9\.%\-]+$', name):
            continue
        if name.lower() in ('bait','bait rarity','odds','rarity'):
            continue

        text = (item.get('text') or '')
        # type: Freshwater, Saltwater, Universal
        btype = 'Universal'
        if re.search(r'\bFreshwater\b', text, re.I): btype = 'Freshwater'
        if re.search(r'\bSaltwater\b', text, re.I): btype = 'Saltwater'

        # likelihood
        likelihood = None
        m = re.search(r'Likelihood[:\s]*([0-9]{1,3})%', text, re.I)
        if m: likelihood = int(m.group(1))

        # size bonus
        sizeBonus = None
        m2 = re.search(r'Size[:\s]*[+]?([0-9]{1,3})%', text, re.I)
        if m2: sizeBonus = int(m2.group(1))

        # locations
        locs = []
        if 'Anywhere' in text:
            locs = ['Anywhere']
        else:
            # capture known location tokens
            locs = list({t.strip() for t in re.findall(r'([A-Z][A-Za-z0-9 &]+(?: Lake| River| Sea| Reservoir| Islands| Cod| Everglades| Cape Cod| Great Lakes)?)', text)})
        if not locs:
            locs = item.get('locations') or []

        # targets: try to extract after 'Bite Speed:' or known patterns
        targets = item.get('targets') or []
        if not targets:
            m3 = re.search(r'Bite Speed[:\s]*[^:]*?[:\s]*([A-Za-z0-9, &]+)', text)
            if m3:
                targets = [t.strip() for t in re.split('[,;&|]', m3.group(1)) if t.strip()]

        out.append({
            'id': re.sub(r'[^a-z0-9]+','_', name.lower()).strip('_'),
            'name': name,
            'type': btype,
            'tier': item.get('section') or item.get('tier') or '',
            'likelihood': likelihood,
            'sizeBonus': sizeBonus,
            'locations': locs,
            'targets': targets,
            'raw': item,
        })
    return out

def normalize_species(raw):
    # raw: mapping location -> list of link texts
    blacklist = set(k.lower() for k in [
        'skip to content','log in','real life history','points of interest','fish merchants','npc page','recent changes','media manager','sitemap','old revisions','cc attribution-share alike 4.0 international','more information','fishonmc','fish species'
    ])
    # common climate labels to drop
    climates = set(['subtropical','subarctic','semi-arid','savanna','continental','rainforest','mediterranean','oceanic','monsoon'])
    out = {}
    for loc, arr in raw.items():
        cleaned = []
        seen = set()
        for s in arr:
            st = (s or '').strip()
            if not st: continue
            if st.lower() in blacklist: continue
            if st.lower() in climates: continue
            if len(st) < 3: continue
            # drop if contains words like 'event' or year markers or '2025'
            if re.search(r'\b(event|202|2025|2026|more information)\b', st, re.I):
                continue
            # skip if purely capitalized nav labels
            if re.match(r'^[A-Z ]{2,}$', st):
                continue
            # skip location name itself
            if st.lower() == loc.lower():
                continue
            if st in seen: continue
            seen.add(st)
            cleaned.append(st)
        out[loc] = cleaned
    return out

def main():
    raw_baits = []
    if (DATA/'baits.generated.json').exists():
        raw_baits = load(DATA/'baits.generated.json')
    else:
        print('Missing data/baits.generated.json; using data/baits.json sample')
        raw_baits = load(DATA/'baits.json')

    raw_species = {}
    if (DATA/'species_by_location.json').exists():
        raw_species = load(DATA/'species_by_location.json')
    else:
        print('Missing species_by_location.json')

    b = normalize_baits(raw_baits)
    # fallback to sample baits.json if normalization produced no items
    if not b and (DATA/'baits.json').exists():
        print('No normalized items found in generated baits — falling back to data/baits.json')
        b = normalize_baits(load(DATA/'baits.json'))
    s = normalize_species(raw_species)

    (DATA/'baits.normalized.json').write_text(json.dumps(b,ensure_ascii=False,indent=2),encoding='utf-8')
    (DATA/'species_by_location.normalized.json').write_text(json.dumps(s,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Wrote baits.normalized.json and species_by_location.normalized.json')

if __name__ == '__main__':
    main()
