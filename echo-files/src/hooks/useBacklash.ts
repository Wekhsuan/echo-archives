/* ============================================================
   ECHO FILES — useBacklash: System Counter-Attack Timer
   ============================================================
   Manages the timing of system overwrite attacks after a
   truth reveal in stages 4-5.
   ============================================================ */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { BACKLASH, SANITY } from '../data/constants';

export interface BacklashState {
  /** Whether the backlash overlay should be shown */
  active: boolean;
  /** Which word is currently being attacked */
  wordId: string | null;
  /** How many clicks the player has made */
  clickCount: number;
  /** Total clicks required to win */
  clicksRequired: number;
  /** OVERRIDE command characters typed so far */
  overrideInput: string;
  /** Time left in ms before automatic fail */
  timeLeft: number;
  /** Whether player is using click method or override method */
  method: 'click' | 'override';
  /** Whether the current backlash round has failed */
  failed: boolean;
  /** Whether the current backlash round has been won */
  won: boolean;
}

export function useBacklash() {
  const backlashActive = useGameStore((s) => s.backlashActive);
  const currentStage = useGameStore((s) => s.currentStage);
  const revealedWords = useGameStore((s) => s.revealedWords);
  const startRestoringWord = useGameStore((s) => s.startRestoringWord);
  const endRestoringWord = useGameStore((s) => s.endRestoringWord);

  const [state, setState] = useState<BacklashState>({
    active: false,
    wordId: null,
    clickCount: 0,
    clicksRequired: 5,
    overrideInput: '',
    timeLeft: BACKLASH.OVERRIDE_WINDOW,
    method: 'click',
    failed: false,
    won: false,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingBacklashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Schedule a backlash for a specific word after random delay */
  const scheduleBacklash = useCallback(
    (wordId: string) => {
      if (!BACKLASH.ENABLED_STAGES.includes(currentStage)) return;

      const delay =
        BACKLASH.RESTORE_DELAY_MIN +
        Math.random() * (BACKLASH.RESTORE_DELAY_MAX - BACKLASH.RESTORE_DELAY_MIN);

      // TODO: playHowl('backlash_start') — jump scare audio
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[Backlash] scheduled for word ${wordId} in ${delay}ms`);
      }

      pendingBacklashRef.current = setTimeout(() => {
        // Verify the word is still revealed (player might have left the stage)
        if (revealedWords[wordId]) {
          startRestoringWord(wordId);
          setState({
            active: true,
            wordId,
            clickCount: 0,
            clicksRequired: 5,
            overrideInput: '',
            timeLeft: BACKLASH.OVERRIDE_WINDOW,
            method: 'click',
            failed: false,
            won: false,
          });
          startCountdown();
        }
      }, delay);
    },
    [currentStage, revealedWords, startRestoringWord],
  );

  /** Start the countdown timer */
  const startCountdown = useCallback(() => {
    const startTime = Date.now();
    const totalWindow = BACKLASH.OVERRIDE_WINDOW;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, totalWindow - elapsed);

      setState((prev) => {
        if (remaining <= 0 && !prev.won) {
          // Time's up — backlash wins
          return { ...prev, timeLeft: 0, failed: true, active: false };
        }
        return { ...prev, timeLeft: remaining };
      });
    }, 50);
  }, []);

  /** Handle a click on the restoring word */
  const handleBacklashClick = useCallback(() => {
    setState((prev) => {
      if (!prev.active || prev.method === 'override') return prev;

      const newCount = prev.clickCount + 1;
      if (newCount >= prev.clicksRequired) {
        // Player won by clicking
        endBacklash(true);
        return { ...prev, clickCount: newCount, won: true, active: false };
      }

      return { ...prev, clickCount: newCount };
    });
  }, []);

  /** Handle OVERRIDE command typing */
  const handleOverrideInput = useCallback(
    (char: string) => {
      // TODO: playHowl('override_type')
      setState((prev) => {
        if (!prev.active) return prev;

        // Switch to override method on first keystroke
        let newInput: string;
        let newMethod = prev.method;

        if (char === 'BACKSPACE') {
          newInput = prev.overrideInput.slice(0, -1);
        } else if (char.length === 1) {
          newInput = prev.overrideInput + char.toUpperCase();
          newMethod = 'override';
        } else {
          return prev;
        }

        // Check for OVERRIDE command match
        if (newInput === BACKLASH.OVERRIDE_COMMAND) {
          endBacklash(true);
          return {
            ...prev,
            overrideInput: newInput,
            method: newMethod,
            won: true,
            active: false,
          };
        }

        // Reset if wrong path
        if (
          newInput.length > 0 &&
          !BACKLASH.OVERRIDE_COMMAND.startsWith(newInput)
        ) {
          return { ...prev, overrideInput: '', method: 'click' };
        }

        return { ...prev, overrideInput: newInput, method: newMethod };
      });
    },
    [],
  );

  /** Clean up backlash (win or lose) */
  const endBacklash = useCallback(
    (won: boolean) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const wordId = state.wordId;
      if (!wordId) return;

      if (won) {
        // Player wins: word stays revealed
        endRestoringWord(wordId);
        // TODO: playHowl('backlash_end')
      } else {
        // Player loses: word gets restored (un-reveal)
        endRestoringWord(wordId);
        // Store will handle sanity drop
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[Backlash] Player lost — word ${wordId} restored`);
        }
      }

      setState((prev) => ({
        ...prev,
        active: false,
        failed: !won,
        won,
      }));
    },
    [state.wordId, endRestoringWord],
  );

  /** Cancel any pending backlash */
  const cancelBacklash = useCallback(() => {
    if (pendingBacklashRef.current) {
      clearTimeout(pendingBacklashRef.current);
      pendingBacklashRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState({
      active: false,
      wordId: null,
      clickCount: 0,
      clicksRequired: 5,
      overrideInput: '',
      timeLeft: BACKLASH.OVERRIDE_WINDOW,
      method: 'click',
      failed: false,
      won: false,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pendingBacklashRef.current) clearTimeout(pendingBacklashRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  attachBacklashMethods.scheduleBacklash = scheduleBacklash;
  attachBacklashMethods.cancelBacklash = cancelBacklash;

  return {
    state,
    scheduleBacklash,
    cancelBacklash,
    handleBacklashClick,
    handleOverrideInput,
  };
}

// Hack: attach static methods for external callers to schedule backlash
export const attachBacklashMethods: {
  scheduleBacklash?: (wordId: string) => void;
  cancelBacklash?: () => void;
} = {};
