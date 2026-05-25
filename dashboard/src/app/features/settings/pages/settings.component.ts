import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SettingsService, AdminSetting } from '../../../core/services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);

  settings: AdminSetting[] = [];
  settingsForm!: FormGroup;
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.initForm();
    this.loadSettings();
  }

  private initForm(): void {
    this.settingsForm = this.fb.group({
      delivery_cutoff_time: ['19:00', [Validators.required, Validators.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)]],
      delivery_fee: [0, [Validators.required, Validators.min(0)]]
    });
  }

  loadSettings(): void {
    this.loading = true;
    this.errorMessage = '';
    this.settingsService.list().subscribe({
      next: (res) => {
        this.settings = res;
        const cutoffSetting = res.find(s => s.key === 'delivery_cutoff_time');
        const feeSetting = res.find(s => s.key === 'delivery_fee');

        this.settingsForm.patchValue({
          delivery_cutoff_time: cutoffSetting ? cutoffSetting.value : '19:00',
          delivery_fee: feeSetting ? Number(feeSetting.value) : 50
        });
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load settings from server.';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formVal = this.settingsForm.value;

    forkJoin({
      cutoff: this.settingsService.update('delivery_cutoff_time', formVal.delivery_cutoff_time),
      fee: this.settingsService.update('delivery_fee', formVal.delivery_fee.toString())
    }).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Global rules settings saved successfully!';
        this.loadSettings();
      },
      error: (err) => {
        this.errorMessage = 'Failed to save settings. Please try again.';
        this.saving = false;
      }
    });
  }
}
