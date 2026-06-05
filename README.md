# FishOnMc Bait Filter

Static single-page app to filter baits/lures for FishOnMc by location. Designed to be hosted on GitHub Pages — no server required.

Usage
- Push this repository to GitHub and enable GitHub Pages (branch: main).
- Open `index.html` in a browser locally or via Pages.

Scraper
------

Run the scraper to generate full JSON exports from the wiki (best-effort):

```bash
python3 -m pip install -r requirements.txt
python3 scripts/scrape_wiki.py
```

Outputs will be written to `data/*.generated.json` for review and integration.

Notes
- Data is a sample subset pulled from the FishOnMc wiki tacklebox and locations pages. Add or extend `data/baits.json` and `data/locations.json` to include more items.
# FishOnMc-Bait-Buddy
Helpful tool for tracking bait uses
