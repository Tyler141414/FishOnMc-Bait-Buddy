import { Injectable, signal } from '@angular/core';
import {
  Bait,
  BaitFinderState,
  BaitViewModel,
  LocationInfo,
  RarityFilter,
  SpeciesViewModel,
} from '../models/bait.models';
import { baitMatchesLocation, baitTypeMatchesLocation, speciesMatchesTargets } from '../utils/bait-matching.utils';
import { toBaitViewModel, toSpeciesViewModel } from '../utils/view-model.utils';
import { BaitRepositoryService } from './bait-repository.service';

const initialState: BaitFinderState = {
  locations: [],
  selectedLocationName: '',
  selectedRarity: 'any',
  baits: [],
  selectedSpecies: [],
  isLoading: true,
  loadError: '',
  isModalOpen: false,
};

@Injectable()
export class BaitFinderFacade {
  readonly state = signal<BaitFinderState>(initialState);

  private allBaits: Bait[] = [];

  constructor(private readonly repository: BaitRepositoryService) {}

  async initialize(): Promise<void> {
    this.patchState({ isLoading: true, loadError: '' });

    try {
      const [locations, baits] = await Promise.all([
        this.repository.loadLocations(),
        this.repository.loadBaits(),
      ]);

      this.allBaits = baits;
      this.patchState({
        locations,
        selectedLocationName: locations[0]?.name || '',
      });
      await this.refreshBaits();
    } catch (error) {
      this.patchState({
        loadError: `Failed to load data: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      this.patchState({ isLoading: false });
    }
  }

  async setLocation(locationName: string): Promise<void> {
    this.patchState({
      selectedLocationName: locationName,
      selectedBait: undefined,
      selectedSpecies: [],
      isModalOpen: false,
    });
    await this.refreshBaits();
  }

  async setRarity(rarity: RarityFilter): Promise<void> {
    this.patchState({
      selectedRarity: rarity,
      selectedBait: undefined,
      selectedSpecies: [],
      isModalOpen: false,
    });
    await this.refreshBaits();
  }

  async selectBait(bait: BaitViewModel): Promise<void> {
    const location = this.selectedLocation();

    if (!location) {
      return;
    }

    const selectedSpecies = await this.matchSpeciesForBait(bait, location);

    this.patchState({
      selectedBait: bait,
      selectedSpecies,
      isModalOpen: true,
    });
    document.body.style.overflow = 'hidden';
  }

  closeDetails(): void {
    this.patchState({
      isModalOpen: false,
      selectedSpecies: [],
    });
    document.body.style.overflow = '';
  }

  private async refreshBaits(): Promise<void> {
    const location = this.selectedLocation();

    if (!location) {
      this.patchState({ baits: [] });
      return;
    }

    const species = await this.repository.loadLocationSpecies(location);
    const selectedRarity = this.state().selectedRarity;
    const baits = this.allBaits
      .filter((bait) => baitMatchesLocation(bait, location, species))
      .filter((bait) => selectedRarity === 'any'
        || (bait.rarity || '').toLowerCase() === selectedRarity.toLowerCase())
      .map(toBaitViewModel);

    this.patchState({ baits });
  }

  private async matchSpeciesForBait(bait: Bait, location: LocationInfo): Promise<SpeciesViewModel[]> {
    if (!baitTypeMatchesLocation(bait, location)) {
      return [];
    }

    const species = await this.repository.loadLocationSpecies(location);

    return species
      .filter((item) => speciesMatchesTargets(item, bait.targets || []))
      .map(toSpeciesViewModel);
  }

  private selectedLocation(): LocationInfo | undefined {
    const state = this.state();
    return state.locations.find((location) => location.name === state.selectedLocationName)
      || state.locations[0];
  }

  private patchState(patch: Partial<BaitFinderState>): void {
    this.state.update((current) => ({ ...current, ...patch }));
  }
}
