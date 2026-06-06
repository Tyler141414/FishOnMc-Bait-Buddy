import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { BaitViewModel, SpeciesViewModel } from '../../../../core/models/bait.models';
import { SpeciesListComponent } from '../species-list/species-list.component';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

@Component({
    selector: 'app-species-modal',
    imports: [SpeciesListComponent],
    templateUrl: './species-modal.component.html',
    styleUrl: './species-modal.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpeciesModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() selectedLocationName = '';
  @Input() bait?: BaitViewModel;
  @Input({ required: true }) species: SpeciesViewModel[] = [];

  @Output() closed = new EventEmitter<void>();

  @ViewChild('modalContent') private modalContent?: ElementRef<HTMLElement>;
  @ViewChild('closeButton') private closeButton?: ElementRef<HTMLButtonElement>;

  private previouslyFocusedElement?: HTMLElement;

  get title(): string {
    if (!this.bait || !this.selectedLocationName) {
      return 'Details';
    }

    return `Location: ${this.selectedLocationName} - ${this.bait.kind || 'Bait'}: ${this.bait.name}`;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['isOpen']) {
      return;
    }

    if (this.isOpen) {
      this.captureFocus();
      queueMicrotask(() => this.focusDialog());
    } else {
      this.restoreFocus();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.closed.emit();
    }
  }

  @HostListener('document:keydown.tab', ['$event'])
  onTab(event: KeyboardEvent): void {
    if (!this.isOpen || !this.modalContent) {
      return;
    }

    const focusableElements = this.focusableElements();

    if (focusableElements.length === 0) {
      event.preventDefault();
      this.modalContent.nativeElement.focus();
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private captureFocus(): void {
    if (typeof document === 'undefined') {
      return;
    }

    this.previouslyFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : undefined;
  }

  private focusDialog(): void {
    this.closeButton?.nativeElement.focus();
  }

  private restoreFocus(): void {
    if (this.previouslyFocusedElement?.isConnected) {
      this.previouslyFocusedElement.focus();
    }

    this.previouslyFocusedElement = undefined;
  }

  private focusableElements(): HTMLElement[] {
    return Array.from(this.modalContent?.nativeElement.querySelectorAll<HTMLElement>(focusableSelector) || [])
      .filter((element) => element.offsetParent !== null);
  }
}
