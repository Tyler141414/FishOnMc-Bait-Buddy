#!/usr/bin/env python3
"""Enrich species details by fetching species pages from the wiki.

Outputs: data/species_details.enriched.json

Uses only stdlib (urllib, html.parser, re, json).
"""
import json
import os
import re
import time
from urllib.parse import urljoin, unquote, urlparse, parse_qs
from urllib.request import urlopen, Request

BASE='https://wiki.fishonmc.net'
IN='data/species_details.json'
OUT='data/species_details.enriched.json'

def safe_fetch(path, timeout=15):
    url = urljoin(BASE, path)
    req = Request(url, headers={'User-Agent':'fishonmc-enricher/1.0'})
    with urlopen(req, timeout=timeout) as r:
        return r.read().decode('utf-8', errors='replace')

def extract_first_paragraph(html):
    m = re.search(r'<div[^>]+id="dokuwiki__content".*?>(.*?)</div>', html, re.S)
    block = m.group(1) if m else html
    p = re.search(r'<p[^>]*>(.*?)</p>', block, re.S)
    if not p:
        # fallback: take first text chunk
        t = re.sub(r'<[^>]+>', '', block)
        return ' '.join(t.split())[:400]
    txt = re.sub(r'<[^>]+>', '', p.group(1))
    return ' '.join(txt.split())

def find_icon_url(html):
    # Prefer DokuWiki fetch.php media images that aren't favicons or logos
    imgs = re.findall(r'(?:src|href)=["\']([^"\']*fetch\.php\?media=[^"\']+)["\']', html)
    for src in imgs:
        low = src.lower()
        if 'favicon' in low or 'logo' in low:
            continue
        return urljoin(BASE, src)
    # look for images in content area that look like thumbnails (exclude favicon)
    m2 = re.findall(r'<div[^>]+id="dokuwiki__content".*?<img[^>]+src=["\']([^"\']+)["\']', html, re.S)
    for src in m2:
        if 'favicon' in src.lower() or 'logo' in src.lower():
            continue
        return urljoin(BASE, src)
    # any img except favicon
    m3 = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', html)
    for src in m3:
        if 'favicon' in src.lower() or 'logo' in src.lower():
            continue
        return urljoin(BASE, src)
    return ''

def extract_rarity_from_url(url):
    if not url:
        return None
    try:
        from urllib.parse import urlparse, parse_qs, unquote
        p = urlparse(url)
        qs = parse_qs(p.query)
        cand = None
        if 'media' in qs:
            cand = qs['media'][0]
        else:
            cand = unquote(p.path.split('/')[-1])
        if not cand:
            return None
        m = re.search(r'(?:_|-|)(common|uncommon|rare|epic|legendary|mythic)\.png', cand, re.I)
        if m:
            tok = m.group(1).lower()
            mapping = {'common':'Common','uncommon':'Uncommon','rare':'Rare','epic':'Epic','legendary':'Legendary','mythic':'Mythic'}
            return mapping.get(tok, tok.capitalize())
    except Exception:
        return None
    return None

def extract_rarity_from_media(html):
    # find media=..._common.png or ..._rare.png etc.
    m = re.search(r'media=[^"\'&>]*?([a-zA-Z0-9_\-]+(?:_|-|)(common|uncommon|rare|epic|legendary|mythic)\.png)', html, re.I)
    if m:
        token = m.group(2).lower()
        # normalize
        mapping = {'common':'Common','uncommon':'Uncommon','rare':'Rare','epic':'Epic','legendary':'Legendary','mythic':'Mythic'}
        return mapping.get(token, token.capitalize())
    # sometimes an img filename directly contains common
    m2 = re.search(r'src=["\'][^"\']*?([a-zA-Z0-9_\-]+(?:_|-|)(common|uncommon|rare|epic|legendary|mythic)\.png)["\']', html, re.I)
    if m2:
        token = m2.group(2).lower()
        mapping = {'common':'Common','uncommon':'Uncommon','rare':'Rare','epic':'Epic','legendary':'Legendary','mythic':'Mythic'}
        return mapping.get(token, token.capitalize())
    return None

def extract_lifestyle(html):
    # look for 'Lifestyle' label followed by text
    m = re.search(r'Lifestyle[:\s<\/]*(?:</th>\s*<td>)?([^<\n]+)', html, re.I)
    if m:
        return m.group(1).strip()
    # fallback: look for 'Lifestyle' header then following paragraph
    m2 = re.search(r'Lifestyle</h\d>.*?<p>(.*?)</p>', html, re.I|re.S)
    if m2:
        return re.sub(r'<[^>]+>','',m2.group(1)).strip()
    # table row style: <th>Lifestyle</th><td>...</td>
    m3 = re.search(r'<th[^>]*>\s*Lifestyle\s*</th>\s*<td[^>]*>(.*?)</td>', html, re.I|re.S)
    if m3:
        return re.sub(r'<[^>]+>','',m3.group(1)).strip()
    return None

def enrich():
    with open(IN,'r',encoding='utf-8') as f:
        data = json.load(f)

    out = {}
    keys = list(data.keys())
    total = 0
    for name in keys:
        v = data[name]
        if not isinstance(v, dict):
            continue
        href = v.get('href','')
        if '/doku.php?id=species:' not in (href or ''):
            continue
        total += 1

    print(f'Found {total} species to enrich')
    idx = 0
    for name in keys:
        v = data[name]
        if not isinstance(v, dict):
            continue
        href = v.get('href','')
        if '/doku.php?id=species:' not in (href or ''):
            continue
        idx += 1
        print(f'[{idx}/{total}] Processing {name}')
        try:
            html = safe_fetch(href)
        except Exception as e:
            print('  fetch failed:', e)
            out[name] = {**v, 'icon':'', 'rarity':None, 'group':None, 'description':'', 'lifestyle':None}
            time.sleep(0.5)
            continue

        icon = find_icon_url(html)
        # try media filename first, then icon URL, then original value
        rarity = extract_rarity_from_media(html) or extract_rarity_from_url(icon) or v.get('rarity')
        # group: derive from href like /doku.php?id=species:group:species
        group = None
        m = re.search(r'/doku\.php\?id=species:([^:/]+)', href)
        if m:
            group = m.group(1).replace('_',' ').title()

        desc = extract_first_paragraph(html)
        lifestyle = extract_lifestyle(html)

        enriched = {
            'name': v.get('name') or name,
            'href': href,
            'icon': icon,
            'rarity': rarity,
            'group': group,
            'description': desc,
            'lifestyle': lifestyle,
        }
        out[name] = enriched
        # be polite
        time.sleep(0.35)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT,'w',encoding='utf-8') as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print('Wrote', OUT)

if __name__=='__main__':
    enrich()
