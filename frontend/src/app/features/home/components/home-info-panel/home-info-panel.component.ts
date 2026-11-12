import { Component, ChangeDetectionStrategy } from '@angular/core';

import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-info-panel',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-info-panel.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./home-info-panel.component.css']
})
export class HomeInfoPanelComponent {}
