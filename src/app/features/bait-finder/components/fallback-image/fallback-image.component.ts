import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'app-fallback-image',
  standalone: true,
  templateUrl: './fallback-image.component.html',
  styleUrl: './fallback-image.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FallbackImageComponent implements OnChanges {
  @Input({ required: true }) candidates: string[] = [];
  @Input({ required: true }) alt = '';
  @Input() variant: 'bait' | 'species' = 'bait';

  activeSrc = '';
  isHidden = false;

  ngOnChanges(): void {
    this.activeSrc = this.candidates[0] || '';
    this.isHidden = !this.activeSrc;
  }

  tryNextImage(): void {
    const currentIndex = this.candidates.indexOf(this.activeSrc);
    const next = this.candidates[currentIndex + 1];

    if (next) {
      this.activeSrc = next;
    } else {
      this.isHidden = true;
    }
  }

  get imageClass(): string {
    return `${this.variant}-img`;
  }
}
