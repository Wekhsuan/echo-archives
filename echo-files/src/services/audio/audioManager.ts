/* ============================================================
   ECHO FILES — AudioManager: Howler.js Singleton
   ============================================================
   Global BGM + SFX manager with fade-in/fade-out transitions.
   All assets served from /audio/ in public directory.
   ============================================================ */

import { Howl, Howler } from 'howler';

// ── Type definitions ──

export type BGMTrack = 'menu' | 'game';
export type SFXEffect = 'click' | 'error' | 'backlash' | 'reboot';

/** Audio asset paths — place these files under public/audio/ */
const ASSETS = {
  bgm: {
    menu: '/audio/bgm_menu.mp3',
    game: '/audio/bgm_game.mp3',
  },
  sfx: {
    click: '/audio/sfx_click.mp3',
    error: '/audio/sfx_error.mp3',
    backlash: '/audio/sfx_backlash.mp3',
    reboot: '/audio/sfx_reboot.mp3',
  },
} as const;

// ── Default volume levels ──

const DEFAULT_BGM_VOLUME = 0.35;
const DEFAULT_SFX_VOLUME = 0.6;
const FADE_DURATION_MS = 1000; // 1s fade for BGM transitions

// ── Singleton instance ──

class AudioManagerClass {
  private currentBGM: Howl | null = null;
  private currentBGMTrack: BGMTrack | null = null;
  private isFadingOut = false;
  private masterMuted = false;
  private activeSFX: Howl[] = []; // Track active SFX instances for cleanup

  // ── BGM: Play with fade-in ──

  /**
   * Play a background music track.
   * @param track Which BGM to play
   * @param loop Whether to loop (default true)
   */
  playBGM(track: BGMTrack, loop = true): void {
    // Task 23: Physically kill any residual sfx_reboot before BGM starts.
    // Prevents the "infinite reboot chime" bug when entering /memory.
    this.stopSFX('reboot');

    // If same track is already playing, do nothing
    if (this.currentBGM && this.currentBGMTrack === track) return;

    // Stop previous BGM first (no fade — quick swap)
    if (this.currentBGM) {
      this.currentBGM.unload();
      this.currentBGM = null;
      this.currentBGMTrack = null;
    }

    const src = ASSETS.bgm[track];

    const howl = new Howl({
      src: [src],
      loop,
      volume: 0, // Start at 0 for fade-in
      html5: true, // Use HTML5 Audio for streaming large files
      onplayerror: (_id, err) => {
        console.warn(`[AudioManager] BGM play error: ${track}`, err);
      },
      onloaderror: (_id, err) => {
        console.warn(`[AudioManager] BGM load error: ${track}`, err);
      },
    });

    howl.play();
    howl.fade(0, DEFAULT_BGM_VOLUME, FADE_DURATION_MS);

    this.currentBGM = howl;
    this.currentBGMTrack = track;
  }

  // ── BGM: Stop with fade-out ──

  /**
   * Stop current BGM with a smooth 1-second fade-out.
   * Returns a promise that resolves when fade-out completes.
   */
  stopBGM(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.currentBGM || this.isFadingOut) {
        resolve();
        return;
      }

      this.isFadingOut = true;
      const howl = this.currentBGM!;

      howl.fade(howl.volume(), 0, FADE_DURATION_MS);

      // Wait for fade to finish, then unload
      setTimeout(() => {
        howl.stop();
        howl.unload();
        this.currentBGM = null;
        this.currentBGMTrack = null;
        this.isFadingOut = false;
        resolve();
      }, FADE_DURATION_MS + 100); // Small buffer
    });
  }

  // ── SFX: One-shot (allow overlap) ──

  /**
   * Play a sound effect. Each call creates a new Howl instance
   * so rapid repeated calls don't cancel each other.
   * Task 23: All SFX explicitly loop:false — one-shot only, never infinite loop.
   */
  playSFX(effect: SFXEffect): void {
    const src = ASSETS.sfx[effect];

    const howl = new Howl({
      src: [src],
      loop: false, // ⚠️ Task 23: Explicit false — SFX are one-shot, must never loop
      volume: this.masterMuted ? 0 : DEFAULT_SFX_VOLUME,
      onplayerror: (_id, err) => {
        console.warn(`[AudioManager] SFX play error: ${effect}`, err);
      },
    });

    howl.play();
    this.activeSFX.push(howl);

    // Auto-unload after playback completes (prevent memory leak)
    howl.on('end', () => {
      this.activeSFX = this.activeSFX.filter((h) => h !== howl);
      setTimeout(() => howl.unload(), 100);
    });
  }

  /**
   * Stop all currently playing SFX effects immediately.
   */
  stopAllSFX(): void {
    for (const howl of this.activeSFX) {
      howl.stop();
      howl.unload();
    }
    this.activeSFX = [];
  }

  /**
   * Stop all playing SFX matching a specific effect type.
   */
  stopSFX(effect: SFXEffect): void {
    const src = ASSETS.sfx[effect];
    const remaining: Howl[] = [];
    for (const howl of this.activeSFX) {
      if ((howl as any)._src?.[0] === src) {
        howl.stop();
        howl.unload();
      } else {
        remaining.push(howl);
      }
    }
    this.activeSFX = remaining;
  }

  // ── Audio Context unlock (Autoplay Policy bypass) ──

  /**
   * Resume the Web Audio context — must be called inside a user gesture
   * event (click/touch/keydown) to unlock audio on modern browsers.
   * Task 21: Absolute fault tolerance — async + try-catch, never throws.
   * Returns a resolved Promise regardless of outcome (graceful degradation).
   */
  async resumeAudioContext(): Promise<void> {
    try {
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        await Howler.ctx.resume();
      }
    } catch (e) {
      // AudioContext resume failed — safe degradation, never blocks caller
      console.warn('[AudioManager] AudioContext unlock failed — audio may be muted:', e);
    }
  }

  // ── BGM volume control ──

  /**
   * Set the current BGM volume directly (for ducking / pumping during events).
   * @param volume Target volume (0–1). Does not affect DEFAULT_BGM_VOLUME.
   */
  setBGMVolume(volume: number): void {
    if (this.currentBGM) {
      this.currentBGM.volume(Math.max(0, Math.min(1, volume)));
    }
  }

  /** Restore BGM to default volume */
  restoreBGMVolume(): void {
    this.setBGMVolume(DEFAULT_BGM_VOLUME);
  }

  setMuted(muted: boolean): void {
    this.masterMuted = muted;
    if (this.currentBGM) {
      this.currentBGM.volume(muted ? 0 : DEFAULT_BGM_VOLUME);
    }
  }

  getMuted(): boolean {
    return this.masterMuted;
  }

  // ── Status queries ──

  isPlayingBGM(): boolean {
    return this.currentBGM !== null && this.currentBGM!.playing();
  }

  getCurrentBGM(): BGMTrack | null {
    return this.currentBGMTrack;
  }
}

// ── Export singleton ──

export const AudioManager = new AudioManagerClass();
