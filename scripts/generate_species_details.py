#!/usr/bin/env python3
"""Fetch species pages referenced from location pages and extract rarity and short description.
Outputs: data/species_details.json
"""
import re, json, time
from urllib.request import urlopen, Request
from urllib.parse import urljoin
from html import unescape

BASE='https://wiki.fishonmc.net/'

def fetch(path):
    url = path if path.startswith('http') else urljoin(BASE, path)
    req = Request(url, headers={'User-Agent':'fishonmc-species-scraper/1.0'})
    with urlopen(req, timeout=30) as r:
        html = r.read().decode('utf-8', errors='replace')
    time.sleep(0.2)
    return html

def strip_tags(s):
    return unescape(re.sub(r'<[^>]+>','',s)).strip()

locations = json.load(open('data/locations.generated.json','r',encoding='utf-8'))
species_by_loc = json.load(open('data/species_by_location.json','r',encoding='utf-8'))

# map species name -> details
details = {}

for loc in locations:
    name = loc['name']
    slug = loc.get('slug')
    print('Processing', name)
    # fetch location page to get links and hrefs
    try:
        html = fetch(f'doku.php?id=location:{slug}')
    except Exception as e:
        print('  failed to fetch location page', e)
        continue
    # find all links and map text -> href
    link_map = {}
    for m in re.finditer(r'<a[^>]+href="([^"]+)"[^>]*>([^<]+)</a>', html, flags=re.I):
        href = m.group(1)
        text = strip_tags(m.group(2))
        if text:
            link_map[text.lower()] = href

    for sp in species_by_loc.get(name, []):
        key = sp.strip()
        if not key: continue
        if key in details: continue
        href = None
        # try direct match
        candidate = link_map.get(key.lower())
        if candidate:
            href = candidate
        else:
            # try fuzzy match: check if any link text contains the species word
            for t,h in link_map.items():
                if key.lower() in t or t in key.lower():
                    href = h; break
        if not href:
            # try default fish slug patterns
            slugname = re.sub(r'[^a-z0-9]+','_', key.lower()).strip('_')
            href = f'doku.php?id=fish:{slugname}'
        # fetch species page
        try:
            shp = fetch(href)
        except Exception:
            details[key] = {'name':key,'href':href,'rarity':None,'description':None}
            continue
        # extract rarity: look for 'Rarity' or 'Rarity:' or rarity table cell
        rarity = None
        m = re.search(r'Rarity[^A-Za-z0-9]{0,6}([A-Za-z]+)', shp, re.I)
        if m:
            rarity = m.group(1).strip()
        else:
            # try to find mentions like 'Common', 'Rare', 'Epic', 'Legendary', 'Mythical'
            m2 = re.search(r'\b(Common|Rare|Epic|Legendary|Mythical)\b', shp, re.I)
            if m2: rarity = m2.group(1)
        # description: first paragraph under content
        desc = None
        p = re.search(r'<p[^>]*>(.*?)</p>', shp, re.S|re.I)
        if p:
            desc = strip_tags(p.group(1))
        details[key] = {'name':key,'href':href,'rarity':rarity,'description':desc}

with open('data/species_details.json','w',encoding='utf-8') as f:
    json.dump(details,f,ensure_ascii=False,indent=2)
print('Wrote data/species_details.json')
