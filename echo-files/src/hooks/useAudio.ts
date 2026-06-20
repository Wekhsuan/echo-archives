/* ============================================================
   ECHO FILES — Audio Engine Hook (Howler)
   ============================================================
   React hook that wraps the AudioManager singleton.
   Provides play / startAmbient / stopAmbient for components.
   ============================================================ */

import { useCallback } from 'react';
import { AudioManager, type SFXEffect } from '../services/audio/audioManager';

// Re-export AudioEffect type for backward compat
export type AudioEffect = SFXEffect | 'stage_transition';

/** Map internal effect names to SFXEffect */
const EFFECT_MAP: Record<string, SFXEffect> = {
  click: 'click',
  click_select: 'click',
  glitch_reveal: 'click',
  system_alert: 'error',
  error: 'error',
  backlash_start: 'backlash',
  backlash_end: 'reboot', // Override success = reboot-like chime
  override_type: 'click',
  stage_transition: 'reboot',
  reboot: 'reboot',
};

export function useAudio() {
  /** Play a one-shot sound effect */
  const play = useCallback((effect: AudioEffect) => {
    const sfxKey = EFFECT_MAP[effect] || effect as SFXEffect;
    AudioManager.playSFX(sfxKey);
  }, []);

  /** Start (or switch to) background music — handles same-track dedup & cross-fade internally */
  const startAmbient = useCallback((track: 'menu' | 'game' = 'game') => {
    AudioManager.playBGM(track);
  }, []);

  /** Stop background music with fade-out */
  const stopAmbient = useCallback(() => {
    return AudioManager.stopBGM();
  }, []);

  /** Stop all currently playing SFX effects */
  const stopSFX = useCallback((effect?: SFXEffect) => {
    if (effect) {
      AudioManager.stopSFX(effect);
    } else {
      AudioManager.stopAllSFX();
    }
  }, []);

  /** Duck BGM volume during intense events (e.g. backlash) */
  const duckBGM = useCallback((volume?: number) => {
    AudioManager.setBGMVolume(volume ?? 0.1);
  }, []);

  /** Restore BGM to default volume after ducking */
  const restoreBGM = useCallback(() => {
    AudioManager.restoreBGMVolume();
  }, []);

  /**
   * Resume Web Audio context inside a user gesture to unlock autoplay.
   * Task 21: Fire-and-forget async — never throws, never blocks navigation.
   */
  const resumeAudio = useCallback(async (): Promise<void> => {
    await AudioManager.resumeAudioContext();
  }, []);

  return { play, startAmbient, stopAmbient, stopSFX, duckBGM, restoreBGM, resumeAudio };
}
