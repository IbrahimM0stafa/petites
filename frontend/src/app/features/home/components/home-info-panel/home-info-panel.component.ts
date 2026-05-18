import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-info-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="home-info-panel" aria-label="About and newsletter">
      <div class="panel-left">
        <div class="panel-text">
          <h3>Made with love <span class="panel-heart">♥</span></h3>
          <p>At Petites, we believe the best things come in small packages. Each treat is crafted with care, using quality ingredients, for your sweetest moments.</p>
          <a class="panel-cta" routerLink="/about">Our Story <span class="cta-heart">♥</span></a>
        </div>

        <div class="panel-art bowl" aria-hidden="true">
          <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" width="200" height="120" role="img" aria-hidden="true">
            <ellipse cx="100" cy="95" rx="60" ry="12" fill="#c78657" opacity="0.18"/>
            <path d="M40 60c0-18 28-28 60-28s60 10 60 28v6H40z" fill="#f6e1c7"/>
            <path d="M48 58c8-14 20-20 52-20s44 6 52 20" fill="#b0663f" opacity="0.15"/>
            <rect x="30" y="70" width="30" height="12" rx="3" fill="#b36a4b"/>
          </svg>
        </div>
      </div>

      <div class="panel-right">
        <div class="panel-text">
          <h3>Stay Sweet <span class="panel-heart">♥</span></h3>
          <p>Be the first to know about new treats, special offers, and sweet surprises!</p>
          <form class="newsletter" (submit)="$event.preventDefault()">
            <label class="visually-hidden" for="email">Email address</label>
            <input id="email" type="email" placeholder="Your email address" />
            <button class="email-btn" aria-label="Subscribe"><span class="btn-heart">♥</span></button>
          </form>
        </div>

        <div class="panel-art envelope" aria-hidden="true">
          <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" width="200" height="120" role="img" aria-hidden="true">
            <rect x="20" y="30" width="160" height="80" rx="8" fill="#fff1ea" stroke="#e1bdb1"/>
            <path d="M20 30l80 48 80-48" fill="none" stroke="#e1bdb1" stroke-width="3"/>
            <path d="M60 58l40 24 40-24" fill="#f6c3c1" opacity="0.95"/>
          </svg>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
    .home-info-panel {
      max-width: 1220px;
      margin: 1.6rem auto 2rem;
      padding: 1rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      align-items: center;
      background: linear-gradient(180deg, #fff3ee 0%, #fdeee6 100%);
      border: 1px solid rgba(175, 132, 111, 0.16);
      border-radius: 12px;
      box-shadow: 0 8px 18px rgba(83, 47, 32, 0.04);
    }

    .panel-left, .panel-right {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .panel-text h3 {
      margin: 0 0 0.5rem;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 1.05rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--petites-ink);
    }

    .panel-text p {
      margin: 0 0 0.9rem;
      color: rgba(74,43,33,0.85);
    }

    .panel-cta {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 0.9rem;
      border-radius: 10px;
      background: #9a5445;
      color: #ffffff;
      text-decoration: none;
      font-weight: 700;
    }

    .panel-art { width: 220px; height: 120px; display: block; flex-shrink: 0; }

    .panel-right .newsletter { display: flex; gap: 0.5rem; align-items: center; }
    .newsletter input[type="email"] { padding: 0.6rem 0.75rem; border-radius: 8px; border: 1px solid rgba(180,120,100,0.18); min-width: 220px; }
    .email-btn { padding: 0.55rem 0.7rem; border-radius: 8px; background: #9a5445; border: none; color: #ffffff; font-weight: 700; }

    .panel-heart, .cta-heart, .btn-heart { color: #d9877b; }

    @media (max-width: 880px) {
      .home-info-panel { grid-template-columns: 1fr; padding: 0.85rem; }
      .panel-art { width: 140px; height: 84px; }
      .newsletter input[type="email"] { min-width: 140px; }
    }
    `
  ]
})
export class HomeInfoPanelComponent {}
