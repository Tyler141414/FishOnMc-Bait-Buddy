import { LocationInfo, Species } from '../models/bait.models';

export function normalizeSpeciesPayload(payload: unknown, location: LocationInfo, slug: string): Species[] {
  let items: unknown[] = [];

  if (Array.isArray(payload)) {
    items = payload;
  } else if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const named = record[location.name] || record[slug];

    if (Array.isArray(named)) {
      items = named;
    } else {
      const values = Object.values(record);
      const first = values[0];

      if (Array.isArray(first)) {
        items = first;
      } else if (first && typeof first === 'object') {
        items = values;
      }
    }
  }

  return items.map((item) => typeof item === 'string' ? { Species: item } : item as Species);
}
