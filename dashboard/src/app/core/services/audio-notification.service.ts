import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioNotificationService {
  private audioCtx: AudioContext | null = null;
  readonly soundEnabled = signal<boolean>(this.loadSoundPreference());

  constructor() {}

  toggleSound(): boolean {
    const next = !this.soundEnabled();
    this.soundEnabled.set(next);
    localStorage.setItem('petites.admin.sound.enabled', String(next));
    if (next) {
      this.playChime();
    }
    return next;
  }

  playChime(): void {
    if (!this.soundEnabled()) {
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Note 1: E5 (659.25 Hz)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: B5 (987.77 Hz)
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.12);
      gain2.gain.setValueAtTime(0.18, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch (err) {
      // Audio playback might be prevented by browser auto-play policy before first user interaction
      console.warn('Audio chime playback omitted:', err);
    }
  }

  private loadSoundPreference(): boolean {
    const stored = localStorage.getItem('petites.admin.sound.enabled');
    return stored === null ? true : stored === 'true';
  }
}
