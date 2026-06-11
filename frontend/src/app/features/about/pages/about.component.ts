import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
} from '@angular/core';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css',
})
export class AboutComponent implements AfterViewInit, OnDestroy {
  private observer!: IntersectionObserver;

  constructor(private el: ElementRef) {}

  ngAfterViewInit(): void {
    this.initScrollAnimations();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  /** Observe all animated elements and add `.visible` when they enter the viewport */
  private initScrollAnimations(): void {
    const targets = this.el.nativeElement.querySelectorAll(
      '.anim-slide-left, .anim-slide-right, .anim-fade-up'
    );

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('visible');
            this.observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    targets.forEach((target: Element) => this.observer.observe(target));
  }
}
