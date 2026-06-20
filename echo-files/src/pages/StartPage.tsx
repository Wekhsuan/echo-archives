/* ============================================================
   ECHO FILES — StartPage: Terminal Login Sequence
   ============================================================ */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { useAudio } from '../hooks/useAudio';
import TypewriterText from '../components/ui/TypewriterText';
import GlitchText from '../components/ui/GlitchText';
import ParticleBg from '../components/ui/ParticleBg';

const LOGIN_LINES = [
  'Connecting to Pan-Continental Archives...',
  'Channel established. Latency: 14ms',
  'Authenticating operator identity...',
  'Biometric handshake: ACCEPTED',
  'Operator ID: ECHO-7 — Clearance: TIER-ALPHA',
  'Access granted. Welcome back.',
  '',
  '系统就绪',
  '等待操作员身份验证…',
];

export default function StartPage() {
  const navigate = useNavigate();
  const startGame = useGameStore((s) => s.startGame);
  const { play, startAmbient, resumeAudio } = useAudio();

  // ── Audio unlock state: BGM only starts on first user interaction ──
  // Task 20/21: Autoplay Policy bypass + non-blocking fault tolerance
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  /**
   * Called once on first click/touch/keydown anywhere on page.
   * Task 21: Fire-and-forget async — audio ops run in detached domain,
   * never blocking caller (especially navigate()).
   */
  const unlockAudio = useCallback(() => {
    if (audioUnlocked) return;
    setAudioUnlocked(true); // Set flag immediately to prevent double-fire

    // Detached async domain: even if Howler hangs/crashes, caller is unblocked
    (async () => {
      try {
        await resumeAudio();       // Unlock Web Audio ctx (safe, never throws)
        startAmbient('menu');      // Play bgm_menu with 1s fade-in
      } catch {
        // Absolute safety net — should never reach here since resumeAudio
        // and startAmbient are both internally guarded. But just in case:
        console.warn('[StartPage] Audio unlock degraded silently');
      }
    })();
  }, [audioUnlocked, resumeAudio, startAmbient]);

  const [currentLine, setCurrentLine] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Progress through lines
  const handleLineComplete = useCallback(() => {
    setCurrentLine((prev) => {
      const next = prev + 1;
      if (next >= LOGIN_LINES.length) {
        setAllDone(true);
        // Show prompt after a beat
        setTimeout(() => setShowPrompt(true), 600);
      }
      return next;
    });
  }, []);

  // Start game on Enter or click
  const handleStart = useCallback(() => {
    // Always attempt audio unlock on first interaction
    unlockAudio();

    if (isTransitioning) return;
    // Allow start even if animation hasn't fully finished
    if (!allDone) {
      setAllDone(true);
      setShowPrompt(true);
    }
    setIsTransitioning(true);
    play('stage_transition');

    // Route to credential page (new flow)
    setTimeout(() => {
      navigate('/credential');
    }, 800);
  }, [allDone, isTransitioning, startGame, navigate, play, unlockAudio]);

  // Listen for Enter key — also unlocks audio on first keypress
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleStart();
      else unlockAudio(); // Any keypress also unlocks audio context
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleStart, unlockAudio]);

  return (
    <motion.div
      className="relative h-screen overflow-hidden bg-cyber-bg flex flex-col items-center justify-center cursor-pointer"
      onClick={unlockAudio} // First click anywhere unlocks audio + starts BGM
      animate={
        isTransitioning
          ? { filter: 'brightness(2) blur(4px)', opacity: 0 }
          : {}
      }
      transition={{ duration: 0.6 }}
    >
      {/* ── CRT Scanlines ── */}
      <div className="crt-scanlines" />

      {/* ── Particles ── */}
      <ParticleBg />

      {/* ── Main content ── */}
      <div className="relative z-10 w-full max-w-3xl px-8 font-mono">
        {/* PCA Logo */}
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
        >
          <div className="text-[10px] tracking-[0.5em] text-cyber-cyan/40 uppercase mb-3">
            Pan-Continental Archives
          </div>
          <div className="text-[11px] tracking-[0.3em] text-text-dim/50 uppercase mb-6">
            The Deep Sea Project · 深海计划
          </div>
          <GlitchText
            text="ECHO FILES"
            className="text-4xl font-bold text-cyber-cyan tracking-[0.2em]"
            active={true}
            intensity={0.4}
          />
          <motion.div
            className="mt-2 text-xs text-text-dim tracking-[0.3em]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
          >
            回声档案 · 记忆修复终端
          </motion.div>
        </motion.div>

        {/* ── Terminal output ── */}
        <div className="space-y-1.5 mb-12 ml-4 border-l-2 border-cyber-cyan/10 pl-6">
          {LOGIN_LINES.map((line, i) => {
            if (i > currentLine) return null;

            const isCurrent = i === currentLine && !allDone;

            return (
              <div key={i} className="flex">
                <span className="text-cyber-cyan/30 text-xs mr-3 mt-0.5 shrink-0 font-mono">
                  &gt;
                </span>
                {isCurrent ? (
                  <TypewriterText
                    text={line}
                    speed={line.length > 40 ? 12 : 25}
                    onComplete={handleLineComplete}
                    showCursor={true}
                    className="text-sm text-cyber-green/80 font-mono"
                  />
                ) : line === '' ? (
                  <div className="h-3" />
                ) : (
                  <span
                    className={`text-sm font-mono ${
                      i >= 7 ? 'text-cyber-amber/80' : 'text-cyber-green/60'
                    }`}
                  >
                    {line}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Start prompt / Enter Button (always visible) ── */}
        <AnimatePresence>
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.5, duration: 0.8 }}
          >
            <motion.button
              onClick={handleStart}
              className="px-10 py-3 border border-cyber-cyan/40 text-cyber-cyan font-mono text-sm
                bg-cyber-cyan/5 hover:bg-cyber-cyan/15 hover:border-cyber-cyan/80
                cursor-pointer tracking-[0.2em] uppercase
                transition-colors duration-300"
              whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(0,255,200,0.15)' }}
              whileTap={{ scale: 0.97 }}
            >
              {isTransitioning ? '同步中...' : '执行精神同步'}
            </motion.button>
            <p className="text-[10px] text-text-dim/30 font-mono mt-4">
              [ ENTER ] 或点击按钮执行精神同步
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom status bar ── */}
      <div className="absolute bottom-0 left-0 right-0 h-8 border-t border-white/5 flex items-center px-5 text-[9px] text-text-dim/40 font-mono">
        <span>PCA://深海/修复终端/v3.7.4</span>
        <span className="ml-auto">
          {new Date().toLocaleTimeString('zh-CN', { hour12: false })}
        </span>
      </div>
    </motion.div>
  );
}
