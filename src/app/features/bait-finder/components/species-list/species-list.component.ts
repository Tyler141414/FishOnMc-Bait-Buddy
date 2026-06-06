import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { SpeciesViewModel } from '../../../../core/models/bait.models';
import { FallbackImageComponent } from '../fallback-image/fallback-image.component';

@Component({
    selector: 'app-species-list',
    imports: [CommonModule, FallbackImageComponent],
    templateUrl: './species-list.component.html',
    styleUrl: './species-list.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpeciesListComponent {
  @Input({ required: true }) species: SpeciesViewModel[] = [];
}
