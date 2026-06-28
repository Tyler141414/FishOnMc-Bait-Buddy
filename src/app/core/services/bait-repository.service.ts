import { Injectable } from '@angular/core';
import { Bait, LocationInfo, Species } from '../models/bait.models';
import { assetUrl } from '../utils/asset-url.utils';
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
      .then((payload) => {
        const species = normalizeSpeciesPayload(payload, location, slug);

        if (species.length === 0) {
          throw new Error(`No species data found for ${location.name}`);
        }

        return species;
      })
      .catch((error) => {
        this.speciesCache.delete(slug);
        throw error;
      });

    this.speciesCache.set(slug, request);
    return request;
  }

  private async loadJson<T>(path: string): Promise<T> {
    const response = await fetch(assetUrl(path), { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Unable to load ${path}`);
    }

    return response.json() as Promise<T>;
  }
}
