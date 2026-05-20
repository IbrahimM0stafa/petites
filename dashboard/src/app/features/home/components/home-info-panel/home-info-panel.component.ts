import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-info-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home-info-panel.component.html',
  styleUrls: ['./home-info-panel.component.css']
})
export class HomeInfoPanelComponent {}
