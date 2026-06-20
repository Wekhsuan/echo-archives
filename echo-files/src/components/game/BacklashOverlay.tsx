/* ============================================================
   ECHO FILES — BacklashOverlay: System Overwrite Attack
   ============================================================
   Triggered in stages 4-5 when Weaver fights back.
   - Full-screen red tint + violent screen shake
   - Revealed word gets overwritten by fake word
   - Player must click 4 times OR type OV in 4.5 seconds
   - Jump scare audio on trigger
   - Heavy sanity penalty on failure
   ============================================================ */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, getCurrentStageData } from '../../store/gameStore';
import { BACKLASH, SANITY } from '../../data/constants';
import { useAudio } from '../../hooks/useAudio';

export default function BacklashOverlay() {
  const backlashRestoring = useGameStore((s) => s.backlashRestoring);
  const revealedWords = useGameStore((s) => s.revealedWords);
  const endRestoringWord = useGameStore((s) => s.endRestoringWord);
  const unrevealWord = useGameStore((s) => s.unrevealWord);

  const { play } = useAudio();

  const [active, setActive] = useState(false);
  const [wordId, setWordId] = useState<string | null>(null);
  const [clickCount, setClickCount] = useState(0);
  const clicksRequired = 4; // HCI-tuned: reduced from 5 to balance click vs keyboard paths
  const [overrideInput, setOverrideInput] = useState('');
  const [method, setMethod] = useState<'click' | 'override'>('click');
  const [timeLeft, setTimeLeft] = useState(BACKLASH.OVERRIDE_WINDOW);
  const [result, setResult] = useState<'fighting' | 'won' | 'lost'>('fighting');

  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect new word in restoring list → trigger backlash
  useEffect(() => {
    if (backlashRestoring.length > 0 && !active) {
      const newWordId = backlashRestoring[backlashRestoring.length - 1];
      const stage = getCurrentStageData();
      if (!stage) return;

      // Only trigger in backlash-enabled stages
      if (!stage.requiresBacklash) return;

      // Only if the word is actually revealed
      if (!revealedWords[newWordId]) {
        endRestoringWord(newWordId);
        return;
      }

      // TRIGGER
      setWordId(newWordId);
      setClickCount(0);
      setOverrideInput('');
      setMethod('click');
      setTimeLeft(BACKLASH.OVERRIDE_WINDOW);
      setResult('fighting');
      setActive(true);
      startTimeRef.current = Date.now();

      // TODO: playHowl('backlash_start') — LOUD jump scare
      play('backlash_start');

      // Focus input for override typing
      setTimeout(() => inputRef.current?.focus(), 100);

      // Start countdown
      startCountdown(newWordId);
    }
  }, [backlashRestoring, active, revealedWords, endRestoringWord, play]);

  const startCountdown = useCallback(
    (targetWordId: string) => {
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, BACKLASH.OVERRIDE_WINDOW - elapsed);

        setTimeLeft(remaining);

        if (remaining <= 0) {
          // TIME'S UP — Weaver wins
          handleLoss(targetWordId);
        }
      }, 100);
    },
    [],
  );

  // Handle rapid click on the word
  const handleClick = useCallback(() => {
    if (result !== 'fighting') return;

    setClickCount((prev) => {
      const next = prev + 1;
      if (next >= clicksRequired) {
        handleWin();
        return next;
      }
      return next;
    });
  }, [result]);

  // Handle keyboard input for OVERRIDE command
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (result !== 'fighting') return;

      if (e.key === 'Backspace') {
        setOverrideInput((prev) => prev.slice(0, -1));
        e.preventDefault();
        return;
      }

      if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
        setOverrideInput((prev) => {
          const next = prev + e.key.toUpperCase();
          // TODO: playHowl('override_type')
          play('override_type');

          if (next === BACKLASH.OVERRIDE_COMMAND) {
            handleWin();
            return next;
          }

          // Reset if wrong prefix
          if (!BACKLASH.OVERRIDE_COMMAND.startsWith(next)) {
            return '';
          }

          return next;
        });
        setMethod('override');
        e.preventDefault();
      }
    },
    [result, play],
  );

  const handleWin = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setResult('won');
    // TODO: playHowl('backlash_end')
    play('backlash_end');

    setTimeout(() => {
      if (wordId) endRestoringWord(wordId);
      setActive(false);
      setWordId(null);
    }, 1200);
  }, [wordId, endRestoringWord, play]);

  const handleLoss = useCallback(
    (targetWordId: string) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setResult('lost');

      // Weaver wins: un-reveal the word + heavy sanity penalty
      unrevealWord(targetWordId);

      setTimeout(() => {
        endRestoringWord(targetWordId);
        setActive(false);
        setWordId(null);
      }, 1500);
    },
    [unrevealWord, endRestoringWord],
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stage = getCurrentStageData();
  const restoringMapping = stage?.wordMappings.find((m) => m.id === wordId);
  const fakeWord = restoringMapping?.fakeWord ?? '???';
  const realWord = restoringMapping?.realWord ?? '???';

  const timePercent = (timeLeft / BACKLASH.OVERRIDE_WINDOW) * 100;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleClick}
        >
          {/* ── Red tint background ── */}
          <div className="absolute inset-0 bg-cyber-red/8 backdrop-blur-[2px]" />

          {/* ── Screen shake wrapper ── */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-8"
            animate={
              result === 'fighting'
                ? {
                    x: [0, -6, 4, -8, 3, -2, 0],
                    y: [0, 3, -4, 2, -5, 1, 0],
                  }
                : {}
            }
            transition={
              result === 'fighting'
                ? { duration: 0.6, repeat: Infinity, ease: 'linear' }
                : {}
            }
          >
            {/* ── Overwrite title ── */}
            <motion.div
              className="text-center"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <p className="text-cyber-red text-sm tracking-[0.4em] font-mono uppercase">
                ⚠ 强制覆写进行中
              </p>
              <p className="text-text-dim text-[10px] font-mono mt-1">
                Weaver 正在恢复系统伪造数据
              </p>
            </motion.div>

            {/* ── The word fight ── */}
            <div className="relative flex flex-col items-center gap-4">
              {/* Restoring fake word (slamming back) */}
              <motion.span
                className="text-5xl font-bold font-mono text-cyber-cyan/80"
                animate={
                  result === 'fighting'
                    ? {
                        scale: [1, 1.15, 1],
                        textShadow: [
                          '0 0 20px rgba(0,240,255,0.4)',
                          '0 0 40px rgba(0,240,255,0.8)',
                          '0 0 20px rgba(0,240,255,0.4)',
                        ],
                      }
                    : {}
                }
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                {fakeWord}
              </motion.span>

              {/* Truth word fading out */}
              <motion.span
                className="text-2xl font-mono text-cyber-red/60 line-through"
                animate={{ opacity: [0.8, 0.2, 0.8] }}
                transition={{ duration: 0.4, repeat: Infinity }}
              >
                {realWord}
              </motion.span>
            </div>

            {/* ── Progress bar ── */}
            <div className="w-80">
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  animate={{
                    width: `${timePercent}%`,
                    backgroundColor:
                      timePercent > 60
                        ? '#FF2D55'
                        : timePercent > 30
                          ? '#FFB800'
                          : '#00FF41',
                  }}
                  transition={{ duration: 0.15 }}
                />
              </div>
            </div>

            {/* ── Click counter / Override input ── */}
            <div className="text-center space-y-3">
              {method === 'click' && (
                <div className="flex items-center gap-3">
                  {Array.from({ length: clicksRequired }).map((_, i) => (
                    <motion.div
                      key={i}
                      className={`w-5 h-5 rounded-sm border ${
                        i < clickCount
                          ? 'border-cyber-green bg-cyber-green/20'
                          : 'border-cyber-red/30 bg-transparent'
                      }`}
                      animate={i === clickCount ? { scale: [1, 1.3, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    />
                  ))}
                  <span className="text-cyber-red text-sm font-mono ml-2">
                    {clickCount}/{clicksRequired}
                  </span>
                </div>
              )}
              {method === 'override' && (
                <div className="flex items-center gap-2">
                  <span className="text-text-dim text-sm font-mono">&gt;</span>
                  <span className="text-cyber-cyan text-2xl font-bold font-mono tracking-[0.3em]">
                    {overrideInput}
                    <span className="typed-cursor" />
                  </span>
                </div>
              )}
              <p className="text-text-dim/40 text-[10px] font-mono mt-2">
                连点词汇 {clicksRequired} 次 或 键盘输入「OV」
              </p>
            </div>

            {/* ── Result overlay ── */}
            <AnimatePresence>
              {result === 'won' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-cyber-green/5"
                >
                  <span className="text-3xl font-bold font-mono text-cyber-green tracking-[0.3em]">
                    覆写已阻止
                  </span>
                </motion.div>
              )}
              {result === 'lost' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-cyber-red/10"
                >
                  <div className="text-center">
                    <span className="text-2xl font-bold font-mono text-cyber-red tracking-[0.3em]">
                      强制覆写成功
                    </span>
                    <p className="text-text-dim text-xs font-mono mt-2">
                      Sanity -{SANITY.REVEAL_COST * 2}%
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Hidden input for keyboard capture */}
          <input
            ref={inputRef}
            type="text"
            className="absolute w-0 h-0 opacity-0"
            onKeyDown={handleKeyDown}
            autoFocus
            // eslint-disable-next-line jsx-a11y/no-autofocus
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
