#!/usr/bin/env python3
"""Stdlib-only scraper for FishOnMc wiki.
Produces data/baits.generated.json, data/locations.generated.json, data/species_by_location.json
"""
import json
import re
import time
from urllib.request import urlopen, Request
from urllib.parse import urljoin
from html import unescape

BASE = 'https://wiki.fishonmc.net/'

def fetch(path):
    url = path if path.startswith('http') else urljoin(BASE, path)
    req = Request(url, headers={'User-Agent':'fishonmc-stdlib-scraper/1.0'})
    with urlopen(req, timeout=30) as r:
        data = r.read().decode('utf-8', errors='replace')
    time.sleep(0.2)
    return data

def strip_tags(s):
    # remove tags
    s = re.sub(r'<[^>]+>','',s)
    return unescape(s).strip()

def extract_tables(html):
    # return list of table HTML blocks
    return re.findall(r'<table[^>]*>(.*?)</table>', html, flags=re.S|re.I)

def rows_from_table(table_html):
    trs = re.findall(r'<tr[^>]*>(.*?)</tr>', table_html, flags=re.S|re.I)
    rows = []
    for tr in trs:
        cols = re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', tr, flags=re.S|re.I)
        cols = [strip_tags(c) for c in cols]
        if cols:
            rows.append(cols)
    return rows

def parse_baits(html):
    tables = extract_tables(html)
    items = []
    for table in tables:
        rows = rows_from_table(table)
        for cols in rows:
            # heuristic: a valid bait row has at least 2 cols and a non-empty name
            if len(cols) < 2: continue
            name = cols[0]
            if not name or len(name) < 2: continue
            text = ' | '.join(cols)
            likelihood = None
            m = re.search(r'Likelihood[:\s]*([0-9]{1,3})%', text, re.I)
            if m: likelihood = int(m.group(1))
            size = None
            m2 = re.search(r'Size[:\s]*[+]?([0-9]{1,3})%', text, re.I)
            if m2: size = int(m2.group(1))
            # simple location detection
            locs = []
            if 'Anywhere' in text: locs = ['Anywhere']
            else:
                # pick known location keywords: Lake, River, Sea, Reservoir, Islands, Cod, Everglades
                locs = re.findall(r'([A-Z][A-Za-z0-9 &]+(?: Lake| River| Sea| Reservoir| Islands| Cod| Everglades| Bay)?)', text)
            targets = []
            m3 = re.search(r'Bite Speed[:\s]*[^|]*\:?(.*)', text, re.I)
            if m3:
                tail = m3.group(1)
                targets = [t.strip() for t in re.split('[,;&|]', tail) if t.strip()][:8]
            items.append({'name':name,'raw':cols,'text':text,'likelihood':likelihood,'sizeBonus':size,'locations':locs,'targets':targets})
    return items

def parse_locations(html):
    tables = extract_tables(html)
    for table in tables:
        rows = rows_from_table(table)
        for row in rows:
            if len(row) >= 4 and row[3] in ('Freshwater','Saltwater'):
                # found the locations table
                locs = []
                for r in rows:
                    if len(r) < 4: continue
                    name = r[0]
                    try:
                        level = int(r[1])
                    except Exception:
                        level = None
                    climate = r[2]
                    water = r[3]
                    locs.append({'name':name,'level':level,'climate':climate,'waterType':water})
                return locs
    return []

def scrape_species_for_location(name):
    slug = re.sub(r'[^a-z0-9]+','_', name.lower()).strip('_')
    path = f'doku.php?id=location:{slug}_lake' if 'lake' in slug else f'doku.php?id=location:{slug}'
    html = None
    try:
        html = fetch(path)
    except Exception:
        try:
            html = fetch(f'doku.php?id=location:{slug}')
        except Exception:
            return []
    # find links
    links = re.findall(r'<a[^>]+>([^<]+)</a>', html, flags=re.I)
    species = []
    for txt in links:
        t = strip_tags(txt)
        if len(t) > 3 and not any(x in t.lower() for x in ('edit','back','top','location')):
            species.append(t)
    # dedupe
    out = []
    seen = set()
    for s in species:
        if s not in seen:
            seen.add(s); out.append(s)
    return out

def main():
    print('Fetching tacklebox...')
    tack = fetch('doku.php?id=tacklebox')
    print('Parsing baits...')
    baits = parse_baits(tack)
    print(f'Found {len(baits)} items (heuristic).')
    print('Fetching locations...')
    lochtml = fetch('doku.php?id=locations')
    locs = parse_locations(lochtml)
    print(f'Parsed {len(locs)} locations.')
    species_by_location = {}
    for loc in locs:
        print('Scraping species for', loc['name'])
        species_by_location[loc['name']] = scrape_species_for_location(loc['name'])

    with open('data/baits.generated.json','w',encoding='utf-8') as f:
        json.dump(baits,f,ensure_ascii=False,indent=2)
    with open('data/locations.generated.json','w',encoding='utf-8') as f:
        json.dump(locs,f,ensure_ascii=False,indent=2)
    with open('data/species_by_location.json','w',encoding='utf-8') as f:
        json.dump(species_by_location,f,ensure_ascii=False,indent=2)
    print('Wrote generated files in data/.')

if __name__ == '__main__':
    main()
