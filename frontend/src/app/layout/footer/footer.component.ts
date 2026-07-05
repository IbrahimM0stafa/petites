import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SOCIAL_LINKS } from '../../core/constants/social-links';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  readonly socialLinks = SOCIAL_LINKS;
}
