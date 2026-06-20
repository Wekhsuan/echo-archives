/* ============================================================
   ECHO FILES — useSanity: UI Degradation Parameters
   ============================================================ */

import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { SANITY } from '../data/constants';

export type DegradationLevel = 'none' | 'light' | 'medium' | 'heavy' | 'critical';

export interface SanityParams {
  level: DegradationLevel;
  sanity: number;
  /** CSS class for text skew/wobble */
  skewClass: string;
  /** Chromatic aberration intensity */
  chromaticClass: string;
  /** Whether cursor trail effect is active */
  cursorTrail: boolean;
  /** Glitch overlay flash frequency (0 = never) */
  glitchFrequency: number;
  /** Random skew applied per-frame */
  randomSkew: number;
}

export function useSanity(): SanityParams {
  const sanity = useGameStore((s) => s.sanity);

  return useMemo(() => {
    let level: DegradationLevel;
    let skewClass = '';
    let chromaticClass = '';
    let cursorTrail = false;
    let glitchFrequency = 0;
    let randomSkew = 0;

    if (sanity >= SANITY.DEGRADE_LIGHT) {
      level = 'none';
    } else if (sanity >= SANITY.DEGRADE_MEDIUM) {
      level = 'light';
      chromaticClass = 'chromatic-text';
    } else if (sanity >= SANITY.DEGRADE_HEAVY) {
      level = 'medium';
      chromaticClass = 'chromatic-text';
      skewClass = 'sanity-skew-1';
      cursorTrail = true;
    } else if (sanity >= SANITY.DEGRADE_CRITICAL) {
      level = 'heavy';
      chromaticClass = 'chromatic-heavy';
      skewClass = 'sanity-skew-2';
      cursorTrail = true;
      glitchFrequency = 8;
      randomSkew = 0.5;
    } else {
      level = 'critical';
      chromaticClass = 'chromatic-heavy';
      skewClass = 'sanity-skew-3';
      cursorTrail = true;
      glitchFrequency = 3;
      randomSkew = 1.2;
    }

    return {
      level,
      sanity,
      skewClass,
      chromaticClass,
      cursorTrail,
      glitchFrequency,
      randomSkew,
    };
  }, [sanity]);
}
