import { Component } from '@angular/core';

import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-info-panel',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-info-panel.component.html',
  styleUrls: ['./home-info-panel.component.css']
})
export class HomeInfoPanelComponent {}
