#!/usr/bin/env python3
import json
from pathlib import Path

p = Path('data/baits.normalized.json')
if not p.exists():
    print('data/baits.normalized.json not found')
    raise SystemExit(1)
data = json.loads(p.read_text(encoding='utf-8'))
for item in data:
    item.pop('locations', None)
    if 'raw' in item and isinstance(item['raw'], dict):
        item['raw'].pop('locations', None)
p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print('Removed locations from data/baits.normalized.json')
