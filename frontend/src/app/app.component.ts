import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map } from 'rxjs';
import { ShellComponent } from './layout/shell/shell.component';
import { SeoService } from './core/services/seo.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ShellComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'frontend';

  constructor(
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly seoService: SeoService
  ) {}

  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => {
        let child = this.activatedRoute.firstChild;
        while (child?.firstChild) {
          child = child.firstChild;
        }
        return {
          data: child?.snapshot.data,
          url: this.router.url
        };
      })
    ).subscribe(routeInfo => {
      const seoData = routeInfo.data;
      if (seoData) {
        this.seoService.generateTags({
          title: seoData['title'],
          description: seoData['description'],
          keywords: seoData['keywords'],
          url: routeInfo.url
        });
      }
    });
  }
}
