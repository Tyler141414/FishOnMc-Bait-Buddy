import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocationInfo, RarityFilter, SpeciesViewModel } from '../../../../core/models/bait.models';

@Component({
    selector: 'app-bait-filters',
    imports: [FormsModule],
    templateUrl: './bait-filters.component.html',
    styleUrl: './bait-filters.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BaitFiltersComponent {
  @Input({ required: true }) locations: LocationInfo[] = [];
  @Input({ required: true }) species: SpeciesViewModel[] = [];
  @Input({ required: true }) selectedLocationName = '';
  @Input({ required: true }) selectedFishName = '';
  @Input() availableFishGroups: string[] = [];
  @Input() selectedFishGroupName = '';
  @Input() isContestMode = false;
  @Input({ required: true }) selectedRarity: RarityFilter = 'any';
  @Input({ required: true }) rarityOptions: RarityFilter[] = ['any', 'Common', 'Rare', 'Epic', 'Legendary', 'Mythical'];

  readonly rarityDisplayLabels: Record<string, string> = {
    any: 'Any',
    Common: 'Common',
    Rare: 'Rare',
    Epic: 'Epic',
    Legendary: 'Legendary',
    Mythical: 'Mythical',
  };

  @Output() locationChange = new EventEmitter<string>();
  @Output() fishGroupChange = new EventEmitter<string>();
  @Output() fishChange = new EventEmitter<string>();
  @Output() rarityChange = new EventEmitter<RarityFilter>();
}
