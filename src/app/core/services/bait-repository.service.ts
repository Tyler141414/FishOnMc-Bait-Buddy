import { Injectable } from '@angular/core';
import { Bait, LocationInfo, Species } from '../models/bait.models';
import { normalizeSpeciesPayload } from '../utils/species-normalizer.utils';
import { slugify } from '../utils/text.utils';

@Injectable({ providedIn: 'root' })
export class BaitRepositoryService {
  private readonly speciesCache = new Map<string, Promise<Species[]>>();

  async loadLocations(): Promise<LocationInfo[]> {
    return this.loadJson<LocationInfo[]>('data/locations.json');
  }

  async loadBaits(): Promise<Bait[]> {
    const [baits, lures] = await Promise.all([
      this.loadJson<Bait[]>('data/baits.json'),
      this.loadJson<Bait[]>('data/lures.json'),
    ]);

    return [
      ...baits.map((bait) => ({ kind: 'Bait', ...bait })),
      ...lures,
    ];
  }

  async loadLocationSpecies(location: LocationInfo): Promise<Species[]> {
    const slug = location.slug || slugify(location.name);
    const cached = this.speciesCache.get(slug);

    if (cached) {
      return cached;
    }

    const request = this.loadJson<unknown>(`data/locations/${slug}.json`)
      .then((payload) => normalizeSpeciesPayload(payload, location, slug))
      .catch(() => []);

    this.speciesCache.set(slug, request);
    return request;
  }

  private async loadJson<T>(path: string): Promise<T> {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Unable to load ${path}`);
    }

    return response.json() as Promise<T>;
  }
}
