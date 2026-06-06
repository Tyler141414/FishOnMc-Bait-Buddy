import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { BaitViewModel, SpeciesViewModel } from '../../../../core/models/bait.models';
import { SpeciesListComponent } from '../species-list/species-list.component';

@Component({
  selector: 'app-species-modal',
  standalone: true,
  imports: [SpeciesListComponent],
  templateUrl: './species-modal.component.html',
  styleUrl: './species-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpeciesModalComponent {
  @Input() isOpen = false;
  @Input() selectedLocationName = '';
  @Input() bait?: BaitViewModel;
  @Input({ required: true }) species: SpeciesViewModel[] = [];

  @Output() closed = new EventEmitter<void>();

  get title(): string {
    if (!this.bait || !this.selectedLocationName) {
      return 'Details';
    }

    return `Location: ${this.selectedLocationName} - ${this.bait.kind || 'Bait'}: ${this.bait.name}`;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.closed.emit();
    }
  }
}
