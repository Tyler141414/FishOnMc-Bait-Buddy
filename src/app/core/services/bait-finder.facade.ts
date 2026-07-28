import { Injectable, signal } from '@angular/core';
import {
  Bait,
  BaitFinderState,
  BaitViewModel,
  LocationInfo,
  RarityFilter,
  Species,
  SpeciesViewModel,
} from '../models/bait.models';
import { baitMatchesLocation, baitTypeMatchesLocation, speciesMatchesTargets } from '../utils/bait-matching.utils';
import { toBaitViewModel, toSpeciesViewModel } from '../utils/view-model.utils';
import { BaitRepositoryService } from './bait-repository.service';

const initialState: BaitFinderState = {
  locations: [],
  selectedLocationName: '',
  availableSpecies: [],
  availableFishGroups: [],
  selectedFishGroupName: '',
  selectedFishName: '',
  selectedRarity: 'any',
  baits: [],
  selectedBait: undefined,
  selectedSpecies: [],
  isLoading: true,
  loadError: '',
  isModalOpen: false,
  isContestMode: false,
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

  toggleContestMode(): void {
    const next = !this.state().isContestMode;
    this.patchState({
      isContestMode: next,
      selectedFishGroupName: '',
      selectedFishName: '',
      selectedBait: undefined,
      selectedSpecies: [],
      isModalOpen: false,
    });
    void this.refreshBaits();
  }

  async setLocation(locationName: string): Promise<void> {
    this.patchState({
      selectedLocationName: locationName,
      selectedFishGroupName: '',
      selectedFishName: '',
      selectedBait: undefined,
      selectedSpecies: [],
      isModalOpen: false,
    });
    this.unlockBodyScroll();
    await this.refreshBaits();
  }

  async setFishGroup(groupName: string): Promise<void> {
    this.patchState({
      selectedFishGroupName: groupName,
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
      selectedFishGroupName: '',
      selectedBait: undefined,
      selectedSpecies: [],
      isModalOpen: false,
    });
    await this._doRefreshBaits(fishName);
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

  async refreshBaits(): Promise<void> {
    await this._doRefreshBaits(this.state().selectedFishName);
  }

  private async _doRefreshBaits(fishNameOverride?: string): Promise<void> {
    const requestId = ++this.refreshRequestId;
    const state = this.state();
    const location = this.selectedLocation(state);
    const selectedRarity = state.selectedRarity;
    const fishName = fishNameOverride ?? state.selectedFishName;
    const isContestMode = state.isContestMode;

    if (!location) {
      this.patchState({ baits: [], availableFishGroups: [] });
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
          availableFishGroups: [],
          loadError: `Failed to load species for ${location.name}: ${error instanceof Error ? error.message : String(error)}`,
        });
      }

      return;
    }

    if (requestId !== this.refreshRequestId) {
      return;
    }

    const fishGroups = [
      ...new Set(
        species
          .map(s => s['Fish Group'] || s.fishGroup || s.group)
          .filter((g): g is string => Boolean(g))
      ),
    ] as string[];

    let baits: BaitViewModel[];

    if (isContestMode && state.selectedFishGroupName) {
      // Contest mode with a selected fish group — match baits by targeting that group
      baits = this.allBaits
        .filter(bait => baitTypeMatchesLocation(bait, location))
        .filter(bait => speciesMatchTargetGroup(bait.targets || [], state.selectedFishGroupName))
        .filter(bait => selectedRarity === 'any'
          || (bait.rarity || '').toLowerCase() === selectedRarity.toLowerCase())
        .map(toBaitViewModel);

      const matchedSpecies = species.filter(s => {
        const group = s['Fish Group'] || s.fishGroup || s.group;
        return group === state.selectedFishGroupName;
      });

      this.patchState({
        availableFishGroups: fishGroups,
        availableSpecies: matchedSpecies.map(toSpeciesViewModel),
        baits,
        loadError: '',
      });
    } else if (isContestMode) {
      // Contest mode without a group — show all location-compatible baits
      const selectedFish = fishName
        ? findSpecies(species, fishName)
        : undefined;

      if (selectedFish) {
        const fishGroup = getFishGroup(selectedFish);
        baits = this.allBaits
          .filter(bait => baitTypeMatchesLocation(bait, location))
          .filter(bait => fishGroup ? speciesMatchTargetGroup(bait.targets || [], fishGroup) : true)
          .filter(bait => selectedRarity === 'any'
            || (bait.rarity || '').toLowerCase() === selectedRarity.toLowerCase())
          .map(toBaitViewModel);

        const matchedSpecies = species.filter(s => getFishGroup(s) === fishGroup);

        this.patchState({
          availableFishGroups: fishGroups,
          availableSpecies: matchedSpecies.map(toSpeciesViewModel),
          baits,
          loadError: '',
        });
      } else {
        // No fish selected in contest mode — show all location-compatible baits
        baits = this.allBaits
          .filter(bait => baitTypeMatchesLocation(bait, location))
          .filter(bait => selectedRarity === 'any'
            || (bait.rarity || '').toLowerCase() === selectedRarity.toLowerCase())
          .map(toBaitViewModel);

        this.patchState({
          availableFishGroups: fishGroups,
          availableSpecies: species.map(toSpeciesViewModel),
          baits,
          loadError: '',
        });
      }
    } else {
      // Normal mode — individual fish filter
      const selectedFish = fishName
        ? findSpecies(species, fishName)
        : undefined;

      if (selectedFish) {
        // Extract the Fish Group from this specific species and use that to match baits
        const fishGroup = getFishGroup(selectedFish);

        baits = this.allBaits
          .filter(bait => baitTypeMatchesLocation(bait, location))
          .filter(bait => fishGroup ? speciesMatchTargetGroup(bait.targets || [], fishGroup) : true)
          .filter(bait => selectedRarity === 'any'
            || (bait.rarity || '').toLowerCase() === selectedRarity.toLowerCase())
          .map(toBaitViewModel);

        // Keep all species in dropdown; bait filtering is done by the selected fish's group above
        this.patchState({
          availableFishGroups: fishGroups,
          availableSpecies: species.map(toSpeciesViewModel),
          baits,
          loadError: '',
        });
      } else {
        // No fish selected — show all location-compatible baits that match any local species
        baits = this.allBaits
          .filter(bait => baitMatchesLocation(bait, location, species))
          .filter(bait => selectedRarity === 'any'
            || (bait.rarity || '').toLowerCase() === selectedRarity.toLowerCase())
          .map(toBaitViewModel);

        this.patchState({
          availableFishGroups: fishGroups,
          availableSpecies: species.map(toSpeciesViewModel),
          baits,
          loadError: '',
        });
      }
    }
  }

  private async matchSpeciesForBait(bait: Bait, location: LocationInfo): Promise<SpeciesViewModel[]> {
    if (!baitTypeMatchesLocation(bait, location)) {
      return [];
    }

    const species = await this.repository.loadLocationSpecies(location);

    return species
      .filter(item => speciesMatchesTargets(item, bait.targets || []))
      .map(toSpeciesViewModel);
  }

  private selectedLocation(state = this.state()): LocationInfo | undefined {
    return state.locations.find(location => location.name === state.selectedLocationName)
      || state.locations[0];
  }

  private patchState(patch: Partial<BaitFinderState>): void {
    this.state.update(current => ({ ...current, ...patch }));
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

function getFishGroup(species: Species): string | undefined {
  const raw = species['Fish Group'] || species.fishGroup || species.group;
  return typeof raw === 'string' ? raw.trim() : undefined;
}

function findSpecies(speciesList: Species[], name: string): Species | undefined {
  if (!name?.trim()) return undefined;
  const target = name.trim();
  return speciesList.find(item => {
    const itemName = (item.Species || item.species || '').trim();
    return itemName.toLowerCase() === target.toLowerCase();
  });
}

function speciesMatchTargetGroup(targets: string[], group: string): boolean {
  if (!targets.length || !group) return false;

  const normalizedGroup = group.trim().toLowerCase();
  const singularGroup = normalizedGroup.endsWith('s') 
    ? normalizedGroup.slice(0, -1) 
    : normalizedGroup;

  return targets.some(target => {
    const normTarget = target.toLowerCase().trim();
    const singularTarget = normTarget.endsWith('s')
      ? normTarget.slice(0, -1)
      : normTarget;

    return (normTarget === normalizedGroup || 
            normTarget === singularGroup ||
            singularTarget === normalizedGroup ||
            singularTarget === singularGroup);
  });
}
