import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { BaitViewModel, RarityFilter } from './core/models/bait.models';
import { BaitFinderFacade } from './core/services/bait-finder.facade';
import { applyTheme, persistTheme, ThemeMode, getInitialTheme } from './core/utils/theme.utils';
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
  readonly theme = signal<ThemeMode>(getInitialTheme());
  private readonly themeEffect = effect(() => {
    applyTheme(this.theme());
  });

  readonly state = this.facade.state;
  readonly selectedLocationName = computed(() => this.state().selectedLocationName);
  readonly selectedFishLabel = computed(() => this.state().selectedFishName || 'All fish');
  readonly selectedLocation = computed(() => {
    const state = this.state();
    return state.locations.find(location => location.name === state.selectedLocationName);
  });
  readonly activeRarityLabel = computed(() => {
    const label: Record<RarityFilter, string> = {
      any: 'Any',
      Common: 'Common',
      Rare: 'Rare',
      Epic: 'Epic',
      Legendary: 'Legendary',
      Mythical: 'Mythical',
    };
    return label[this.state().selectedRarity] ?? 'Any';
  });
  readonly themeToggleLabel = computed(() => this.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');

  ngOnInit(): void {
    void this.facade.initialize();
  }

  toggleContestMode(): void {
    this.facade.toggleContestMode();
  }

  setThemeMode(isDarkMode: boolean): void {
    const nextTheme: ThemeMode = isDarkMode ? 'dark' : 'light';
    this.theme.set(nextTheme);
    persistTheme(nextTheme);
  }

  setThemeModeFromEvent(event: Event): void {
    this.setThemeMode((event.target as HTMLInputElement).checked);
  }

  changeLocation(locationName: string): void {
    void this.facade.setLocation(locationName);
  }

  changeFishGroup(fishGroupName: string): void {
    void this.facade.setFishGroup(fishGroupName);
  }

  changeFish(fishName: string): void {
    void this.facade.setFish(fishName);
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
