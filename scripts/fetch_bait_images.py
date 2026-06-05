#!/usr/bin/env python3
"""Fetch and match bait images from the FishOnMc tacklebox page and local pool.

Usage: python3 scripts/fetch_bait_images.py
"""
import json,os,re,sys
from pathlib import Path
from urllib.parse import urljoin, unquote

ROOT = Path(__file__).resolve().parents[1]
BAITS_JSON = ROOT / 'data' / 'baits.json'
BAITS_DIR = ROOT / 'resources' / 'images' / 'baits'
BAITS_DIR.mkdir(parents=True, exist_ok=True)

def safe_slug(name):
    return re.sub(r'[^a-z0-9]+','_', name.lower()).strip('_')

def list_local_files():
    return [p.name for p in BAITS_DIR.iterdir() if p.is_file()]

def try_local_match(bait_name, files):
    slug = safe_slug(bait_name)
    files_l = [(f, os.path.splitext(f)[0].lower()) for f in files]
    # exact substring
    for f, base in files_l:
        if slug in base:
            return f
    tokens = re.findall(r"\w+", bait_name.lower())
    if not tokens:
        return None
    # try matching by token overlap score (allow singular/plural)
    best = None
    best_score = 0
    for f, base in files_l:
        score = 0
        for t in tokens:
            if t in base:
                score += 2
            elif t.endswith('s') and t[:-1] in base:
                score += 2
            elif t[:-1] in base if len(t)>3 and t.endswith('s') else False:
                score += 1
            elif t in base:
                score += 1
        if score > best_score:
            best = f
            best_score = score
    # require at least 1 match
    if best_score >= 1:
        return best
    return None

def fetch_tacklebox_images():
    # dependency-free fetch using urllib + regex
    import urllib.request
    import ssl
    url = 'https://wiki.fishonmc.net/doku.php?id=tacklebox'
    print('Fetching tacklebox page...')
    req = urllib.request.Request(url, headers={'User-Agent':'bait-bot/1.0', 'Referer': url})
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=20) as r:
            html = r.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print('Failed to fetch page:', e)
        return
    # find img src attributes
    srcs = re.findall(r"<img[^>]+src=[\"']([^\"']+)[\"']", html, flags=re.I)
    found = 0
    for src in srcs:
        if not src: continue
        # fix HTML-escaped ampersands which break the fetch.php URLs
        src = src.replace('&amp;', '&')
        if src.endswith('.svg') or 'icon' in src.lower():
            continue
        imgurl = urljoin(url, src)
        # prefer the `media` query param (fetch.php?w=...&media=NAME)
        from urllib.parse import urlparse, parse_qs
        up = urlparse(imgurl)
        qs = parse_qs(up.query)
        if 'media' in qs and qs['media']:
            fname = unquote(qs['media'][0])
        else:
            fname = unquote(Path(up.path).name)
        dest = BAITS_DIR / fname
        if dest.exists():
            continue
        try:
            rreq = urllib.request.Request(imgurl, headers={'User-Agent':'bait-bot/1.0', 'Referer': url})
            with urllib.request.urlopen(rreq, context=ctx, timeout=20) as rr:
                data = rr.read()
                if data:
                    dest.write_bytes(data)
                    found += 1
                    print('Downloaded', fname)
        except Exception as e:
            print('Error fetching', imgurl, e)
    print('Downloaded', found, 'new images')

def main():
    baits = json.load(open(BAITS_JSON))
    files = list_local_files()
    missing = [b for b in baits if not b.get('image')]
    print('Baits total:', len(baits), 'missing images:', len(missing))
    # try matching against existing files first
    updated = 0
    for bait in missing:
        f = try_local_match(bait.get('name',''), files)
        if f:
            href = f'resources/images/baits/{f}'
            links = bait.get('links') or []
            links = [ln for ln in links if not (isinstance(ln, dict) and ln.get('rel')=='image')]
            links.append({'rel':'image','href':href})
            bait['links'] = links
            bait['image'] = href
            updated += 1
            print('Matched locally:', bait.get('name'), '->', href)
    if updated>0:
        json.dump(baits, open(BAITS_JSON,'w'), indent=2, ensure_ascii=False)
        print('Wrote', BAITS_JSON)

    # refresh files and recompute missing
    files = list_local_files()
    missing = [b for b in baits if not b.get('image')]
    if not missing:
        print('All baits now have images')
        return
    # attempt to download from site
    fetch_tacklebox_images()
    # try matching again after downloads
    files = list_local_files()
    updated2 = 0
    for bait in missing:
        f = try_local_match(bait.get('name',''), files)
        if f:
            href = f'resources/images/baits/{f}'
            links = bait.get('links') or []
            links = [ln for ln in links if not (isinstance(ln, dict) and ln.get('rel')=='image')]
            links.append({'rel':'image','href':href})
            bait['links'] = links
            bait['image'] = href
            updated2 += 1
            print('Matched after download:', bait.get('name'), '->', href)
    if updated2>0:
        json.dump(baits, open(BAITS_JSON,'w'), indent=2, ensure_ascii=False)
        print('Wrote', BAITS_JSON)
    print('Newly matched:', updated2)

if __name__=='__main__':
    main()
