import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { BaitViewModel } from '../../../../core/models/bait.models';
import { FallbackImageComponent } from '../fallback-image/fallback-image.component';

@Component({
  selector: 'app-bait-card',
  standalone: true,
  imports: [CommonModule, FallbackImageComponent],
  templateUrl: './bait-card.component.html',
  styleUrl: './bait-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaitCardComponent {
  @Input({ required: true }) bait!: BaitViewModel;
  @Input() selected = false;

  @Output() selectedChange = new EventEmitter<BaitViewModel>();

  select(): void {
    this.selectedChange.emit(this.bait);
  }
}
