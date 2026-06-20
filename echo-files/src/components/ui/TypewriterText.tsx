/* ============================================================
   ECHO FILES — TypewriterText: Mechanical Typing Effect
   ============================================================
   Types out text character by character with a blinking cursor.
   Supports variable speed, completion callback, and glitch mode.
   ============================================================ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { TYPING } from '../../data/constants';

interface TypewriterTextProps {
  text: string;
  speed?: number;            // ms per character
  onComplete?: () => void;
  className?: string;
  showCursor?: boolean;
  cursorClassName?: string;
  /** When true, adds random pauses and stutters for glitch effect */
  glitchMode?: boolean;
  /** Auto-start typing */
  autoStart?: boolean;
}

export default function TypewriterText({
  text,
  speed = TYPING.BASE_SPEED,
  onComplete,
  className = '',
  showCursor = true,
  cursorClassName = 'typed-cursor',
  glitchMode = false,
  autoStart = true,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('');
  const [isDone, setIsDone] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const typeNext = useCallback(() => {
    if (indexRef.current >= text.length) {
      setIsDone(true);
      onCompleteRef.current?.();
      return;
    }

    // Calculate delay: base speed + glitch variation
    let delay = speed;
    if (glitchMode) {
      // Random bursts: sometimes fast, sometimes frozen
      const roll = Math.random();
      if (roll < 0.08) {
        delay = 200 + Math.random() * 300; // Sudden freeze
      } else if (roll < 0.2) {
        delay = 8 + Math.random() * 10; // Burst of speed
      } else {
        delay = speed + (Math.random() - 0.5) * 20;
      }
    }

    timerRef.current = setTimeout(() => {
      // Sometimes output 2-3 chars at once in glitch mode
      const charsToAdd = glitchMode && Math.random() < 0.05 ? 3 : 1;
      const end = Math.min(indexRef.current + charsToAdd, text.length);
      setDisplayed(text.slice(0, end));
      indexRef.current = end;

      if (end >= text.length) {
        setIsDone(true);
        onCompleteRef.current?.();
      } else {
        typeNext();
      }
    }, delay);
  }, [text, speed, glitchMode]);

  useEffect(() => {
    // Reset on text change
    setDisplayed('');
    setIsDone(false);
    indexRef.current = 0;

    if (autoStart && text) {
      // Small initial delay for dramatic effect
      const initialTimer = setTimeout(() => {
        typeNext();
      }, 200);

      return () => {
        clearTimeout(initialTimer);
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <span className={`inline ${className}`}>
      <span className="whitespace-pre-wrap">{displayed}</span>
      {showCursor && !isDone && (
        <span className={cursorClassName}>&nbsp;</span>
      )}
      {isDone && showCursor && (
        <span className={`${cursorClassName} opacity-30`}>&nbsp;</span>
      )}
    </span>
  );
}
