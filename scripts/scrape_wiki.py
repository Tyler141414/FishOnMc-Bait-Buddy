#!/usr/bin/env python3
"""Scrape FishOnMc wiki to generate JSON data files for baits, locations and species.

Usage: python3 scripts/scrape_wiki.py

Outputs (into ./data):
- baits.generated.json
- locations.generated.json
- species_by_location.json

This script is best-effort and stores raw scraped text for manual review.
"""
import re
import json
import time
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE = 'https://wiki.fishonmc.net/'

def fetch(path, pause=0.2):
    url = path if path.startswith('http') else urljoin(BASE, path)
    r = requests.get(url, headers={'User-Agent':'fishonmc-scraper/1.0'})
    r.raise_for_status()
    time.sleep(pause)
    return BeautifulSoup(r.text, 'html.parser')

def extract_tables_under_headings(soup):
    # Return mapping heading_text -> list of table elements until next heading
    content = soup
    headings = content.find_all(re.compile('^h[1-6]$'))
    result = {}
    for h in headings:
        key = h.get_text(strip=True)
        tables = []
        # collect following siblings until next heading
        for sib in h.find_next_siblings():
            if sib.name and re.match('^h[1-6]$', sib.name):
                break
            if sib.name == 'table':
                tables.append(sib)
        if tables:
            result[key] = tables
    return result

def parse_bait_tables(soup):
    items = []
    sections = extract_tables_under_headings(soup)
    # Known section keywords we'll treat as bait/lure buckets
    bait_sections = [k for k in sections.keys() if 'Bait' in k or 'Lures' in k or 'Tacklebox' in k]
    for sec in bait_sections:
        tables = sections.get(sec, [])
        for table in tables:
            for tr in table.find_all('tr'):
                cols = [td.get_text(' ',strip=True) for td in tr.find_all(['td','th'])]
                if not cols: continue
                text = ' | '.join([c for c in cols if c])
                # heuristic: name is first non-empty column that is not just numbers
                name = None
                for c in cols:
                    if c and not re.match(r'^[\d\W]+$', c):
                        name = c.strip()
                        break
                if not name:
                    continue
                likelihood = None
                m = re.search(r'Likelihood[:\s]*([0-9]{1,3})%',' '.join(cols), re.I)
                if m: likelihood = int(m.group(1))
                size = None
                m2 = re.search(r'Size[:\s]*[+]?([0-9]{1,3})%',' '.join(cols), re.I)
                if m2: size = int(m2.group(1))
                # extract locations by looking for known tokens or capitalized location names in text
                locs = re.findall(r'([A-Z][a-zA-Z0-9 &]+(?: Lake| River| Sea| Reservoir| Islands| Cod||))', text)
                # fallback: capture 'Anywhere' token
                if 'Anywhere' in text:
                    locs = ['Anywhere']
                # extract targets from common patterns after 'Bite Speed:' or 'Likelihood:'
                targets = []
                m3 = re.search(r'Bite Speed[:\s]*[^:]*?[:\s]*([A-Za-z0-9, &]+)', text)
                if m3:
                    tail = m3.group(1)
                    targets = [t.strip() for t in re.split('[,;&]', tail) if t.strip()]
                # store raw entry
                items.append({
                    'name': name,
                    'section': sec,
                    'raw_columns': cols,
                    'text': text,
                    'likelihood': likelihood,
                    'sizeBonus': size,
                    'locations': locs,
                    'targets': targets,
                })
    return items

def parse_locations(soup):
    # find the main locations table by looking for rows with 4 columns where the 4th is 'Freshwater' or 'Saltwater'
    tables = soup.find_all('table')
    found = []
    for table in tables:
        for tr in table.find_all('tr'):
            cols = [td.get_text(' ',strip=True) for td in tr.find_all(['td','th'])]
            if len(cols) >= 4 and cols[3] in ('Freshwater','Saltwater'):
                found.append(table)
                break
        if found: break
    locations = []
    table = found[0] if found else None
    if not table:
        return locations
    for tr in table.find_all('tr'):
        cols = [td.get_text(' ',strip=True) for td in tr.find_all(['td','th'])]
        if len(cols) < 4: continue
        name = cols[0]
        try:
            level = int(cols[1])
        except Exception:
            level = None
        climate = cols[2]
        waterType = cols[3]
        # try to find link to location page
        a = tr.find('a')
        href = a['href'] if a and a.has_attr('href') else None
        locations.append({'name':name,'level':level,'climate':climate,'waterType':waterType,'href':href})
    return locations

def scrape_species_for_location(loc):
    href = loc.get('href')
    if not href:
        # try constructing location page id
        slug = re.sub(r'[^a-z0-9]+','_', loc['name'].lower()).strip('_')
        href = f'doku.php?id=location:{slug}'
    soup = fetch(href)
    # gather link texts that look like fish names or species lists in tables
    species = []
    content = soup
    # find tables with multiple rows where cells look like species names
    for a in content.find_all('a'):
        txt = a.get_text(strip=True)
        if not txt: continue
        # basic heuristics: ignore navigation links and short words
        if len(txt) < 3: continue
        if any(x in txt.lower() for x in ('back','top','edit','location')): continue
        # likely species names contain spaces or capitalized words
        if re.search(r'[A-Z][a-z]+', txt):
            species.append(txt)
    # dedupe preserving order
    seen = set(); out=[]
    for s in species:
        if s not in seen:
            seen.add(s); out.append(s)
    return out

def main():
    print('Fetching tacklebox page...')
    tackle = fetch('doku.php?id=tacklebox')
    print('Parsing baits/lures...')
    baits = parse_bait_tables(tackle)
    print(f'Found {len(baits)} bait/lure rows (raw).')
    print('Fetching locations page...')
    locpage = fetch('doku.php?id=locations')
    locations = parse_locations(locpage)
    print(f'Parsed {len(locations)} locations.')

    # fetch species for each location (best-effort)
    species_by_location = {}
    for loc in locations:
        name = loc['name']
        print('Scraping species for', name)
        try:
            sp = scrape_species_for_location(loc)
        except Exception as e:
            print('  failed', e)
            sp = []
        species_by_location[name] = sp

    # dump outputs
    with open('data/baits.generated.json','w',encoding='utf-8') as f:
        json.dump(baits,f,indent=2,ensure_ascii=False)
    with open('data/locations.generated.json','w',encoding='utf-8') as f:
        json.dump(locations,f,indent=2,ensure_ascii=False)
    with open('data/species_by_location.json','w',encoding='utf-8') as f:
        json.dump(species_by_location,f,indent=2,ensure_ascii=False)
    print('Wrote data/baits.generated.json, data/locations.generated.json, data/species_by_location.json')

if __name__ == '__main__':
    main()
