import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { BaitViewModel, RarityFilter, SelectOption } from './core/models/bait.models';
import { BaitFinderFacade } from './core/services/bait-finder.facade';
import { BaitFiltersComponent } from './features/bait-finder/components/bait-filters/bait-filters.component';
import { BaitListComponent } from './features/bait-finder/components/bait-list/bait-list.component';
import { SpeciesModalComponent } from './features/bait-finder/components/species-modal/species-modal.component';

@Component({
    selector: 'app-root',
    imports: [BaitFiltersComponent, BaitListComponent, SpeciesModalComponent],
    providers: [BaitFinderFacade],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  private readonly facade = inject(BaitFinderFacade);

  readonly rarityOptions: SelectOption<RarityFilter>[] = [
    { value: 'any', label: 'Any' },
    { value: 'Common', label: 'Common' },
    { value: 'Rare', label: 'Rare' },
    { value: 'Epic', label: 'Epic' },
    { value: 'Legendary', label: 'Legendary' },
    { value: 'Mythical', label: 'Mythical' },
  ];

  readonly state = this.facade.state;
  readonly selectedLocationName = computed(() => this.state().selectedLocationName);
  readonly selectedLocation = computed(() => {
    const state = this.state();
    return state.locations.find((location) => location.name === state.selectedLocationName);
  });
  readonly activeRarityLabel = computed(() => {
    const selectedRarity = this.state().selectedRarity;
    return this.rarityOptions.find((option) => option.value === selectedRarity)?.label || 'Any';
  });

  ngOnInit(): void {
    void this.facade.initialize();
  }

  changeLocation(locationName: string): void {
    void this.facade.setLocation(locationName);
  }

  changeRarity(rarity: RarityFilter): void {
    void this.facade.setRarity(rarity);
  }

  selectBait(bait: BaitViewModel): void {
    void this.facade.selectBait(bait);
  }

  closeDetails(): void {
    this.facade.closeDetails();
  }
}
