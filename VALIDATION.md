# Local Validation — FishOnMc Bait Filter

Quick setup

1. Start a local static server from the repo root:

```bash
python3 -m http.server 8000
```

2. Open the SPA at: http://localhost:8000

Optional: regenerate data (best-effort scraper)

```bash
# (optional) use stdlib scraper if you don't want external deps
python3 scripts/scrape_wiki_stdlib.py
python3 scripts/normalize_generated.py
# remove locations if desired
python3 scripts/remove_locations_from_baits.py
```

Quick test checklist

- [ ] Page loads with no console errors.
- [ ] `Location` dropdown shows locations (16 entries).
- [ ] `Type` dropdown allows Any/Freshwater/Saltwater.
- [ ] Selecting a location filters baits to those matching water `type` and species.
- [ ] Searching for a bait name (e.g., "Nightcrawler") shows the expected item.
- [ ] Clicking several locations verifies species-level matching (e.g., baits that target "Salmons" only appear in locations listing salmons).
- [ ] Bait items display: icon (emoji), name, tier, likelihood/size (if present), and targets.
- [ ] If you regenerate data, confirm `data/baits.normalized.json` and `data/species_by_location.normalized.json` update and the SPA reflects changes (refresh browser).

Troubleshooting

- If the SPA shows "Failed to load data", open the DevTools Network tab and verify `data/*.json` paths return 200.
- If generated data is noisy, inspect `data/*.generated.json` and run `scripts/normalize_generated.py` to clean.

That's it — run the checklist and tell me any failing step to fix.
