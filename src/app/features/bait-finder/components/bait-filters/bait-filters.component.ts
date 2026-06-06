import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocationInfo, RarityFilter, SelectOption, SpeciesViewModel } from '../../../../core/models/bait.models';

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
  @Input({ required: true }) selectedRarity: RarityFilter = 'any';
  @Input({ required: true }) rarityOptions: SelectOption<RarityFilter>[] = [];

  @Output() locationChange = new EventEmitter<string>();
  @Output() fishChange = new EventEmitter<string>();
  @Output() rarityChange = new EventEmitter<RarityFilter>();
}
