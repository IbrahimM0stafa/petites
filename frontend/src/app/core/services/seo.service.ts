import { Injectable } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

export interface SeoConfig {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: string;
  url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private defaultTitle = 'Petites | Handmade Sweet Treats & Tiny Bites';
  private defaultDesc = "Handmade sweet treats for life's every little moment. Delight in every tiny bite of our cookies, pastries, and baked goods, delivered fresh to your door.";
  private defaultKeywords = 'petites, sweet treats, bakery, cookies, pastries, desserts, handmade sweets, online bakery';
  private defaultImage = 'https://petites-bakery.com/assets/og-image.jpg';
  private baseUrl = 'https://petites-bakery.com';

  constructor(private readonly titleService: Title, private readonly metaService: Meta) {}

  generateTags(config: SeoConfig = {}): void {
    const title = config.title ? config.title : this.defaultTitle;
    const description = config.description || this.defaultDesc;
    const keywords = config.keywords || this.defaultKeywords;
    const image = config.image || this.defaultImage;
    const type = config.type || 'website';
    const url = config.url ? `${this.baseUrl}${config.url}` : this.baseUrl;

    // Set Title
    this.titleService.setTitle(title);

    // Search Engine Meta Tags
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ name: 'keywords', content: keywords });

    // Open Graph / Facebook
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:image', content: image });
    this.metaService.updateTag({ property: 'og:url', content: url });
    this.metaService.updateTag({ property: 'og:type', content: type });

    // Twitter Card
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
    this.metaService.updateTag({ name: 'twitter:image', content: image });
  }
}
