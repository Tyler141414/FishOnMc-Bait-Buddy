import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { BaitViewModel } from '../../../../core/models/bait.models';
import { BaitCardComponent } from '../bait-card/bait-card.component';

@Component({
    selector: 'app-bait-list',
    imports: [BaitCardComponent],
    templateUrl: './bait-list.component.html',
    styleUrl: './bait-list.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BaitListComponent {
  @Input({ required: true }) baits: BaitViewModel[] = [];
  @Input() selectedBait?: BaitViewModel;

  @Output() baitSelected = new EventEmitter<BaitViewModel>();
}
