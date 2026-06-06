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
  availableSpecies: [],
  selectedFishName: '',
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
  private refreshRequestId = 0;
  private bodyOverflowBeforeModal: string | undefined;

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
      selectedFishName: '',
      selectedBait: undefined,
      selectedSpecies: [],
      isModalOpen: false,
    });
    this.unlockBodyScroll();
    await this.refreshBaits();
  }

  async setFish(fishName: string): Promise<void> {
    this.patchState({
      selectedFishName: fishName,
      selectedBait: undefined,
      selectedSpecies: [],
      isModalOpen: false,
    });
    this.unlockBodyScroll();
    await this.refreshBaits();
  }

  async setRarity(rarity: RarityFilter): Promise<void> {
    this.patchState({
      selectedRarity: rarity,
      selectedBait: undefined,
      selectedSpecies: [],
      isModalOpen: false,
    });
    this.unlockBodyScroll();
    await this.refreshBaits();
  }

  async selectBait(bait: BaitViewModel): Promise<void> {
    const location = this.selectedLocation();

    if (!location) {
      return;
    }

    const selectedSpecies = await this.matchSpeciesForBait(bait, location);

    if (location.name !== this.selectedLocation()?.name) {
      return;
    }

    this.patchState({
      selectedBait: bait,
      selectedSpecies,
      isModalOpen: true,
    });
    this.lockBodyScroll();
  }

  closeDetails(): void {
    this.patchState({
      isModalOpen: false,
      selectedSpecies: [],
    });
    this.unlockBodyScroll();
  }

  private async refreshBaits(): Promise<void> {
    const requestId = ++this.refreshRequestId;
    const state = this.state();
    const location = this.selectedLocation(state);
    const selectedRarity = state.selectedRarity;
    const selectedFishName = state.selectedFishName;

    if (!location) {
      this.patchState({ baits: [] });
      return;
    }

    let species: Awaited<ReturnType<BaitRepositoryService['loadLocationSpecies']>>;

    try {
      species = await this.repository.loadLocationSpecies(location);
    } catch (error) {
      if (requestId === this.refreshRequestId) {
        this.patchState({
          baits: [],
          availableSpecies: [],
          loadError: `Failed to load species for ${location.name}: ${error instanceof Error ? error.message : String(error)}`,
        });
      }

      return;
    }

    if (requestId !== this.refreshRequestId) {
      return;
    }

    const selectedFish = selectedFishName
      ? species.find((item) => this.speciesName(item) === selectedFishName)
      : undefined;
    const baits = this.allBaits
      .filter((bait) => selectedFish
        ? baitTypeMatchesLocation(bait, location) && speciesMatchesTargets(selectedFish, bait.targets || [])
        : baitMatchesLocation(bait, location, species))
      .filter((bait) => selectedRarity === 'any'
        || (bait.rarity || '').toLowerCase() === selectedRarity.toLowerCase())
      .map(toBaitViewModel);

    this.patchState({
      availableSpecies: species.map(toSpeciesViewModel),
      baits,
      loadError: '',
    });
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

  private selectedLocation(state = this.state()): LocationInfo | undefined {
    return state.locations.find((location) => location.name === state.selectedLocationName)
      || state.locations[0];
  }

  private speciesName(species: SpeciesViewModel | { Species?: string; species?: string }): string {
    return species.Species || species.species || '';
  }

  private patchState(patch: Partial<BaitFinderState>): void {
    this.state.update((current) => ({ ...current, ...patch }));
  }

  private lockBodyScroll(): void {
    if (typeof document === 'undefined' || this.bodyOverflowBeforeModal !== undefined) {
      return;
    }

    this.bodyOverflowBeforeModal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    if (typeof document === 'undefined' || this.bodyOverflowBeforeModal === undefined) {
      return;
    }

    document.body.style.overflow = this.bodyOverflowBeforeModal;
    this.bodyOverflowBeforeModal = undefined;
  }
}
