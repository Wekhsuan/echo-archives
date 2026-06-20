/* ============================================================
   ECHO FILES — EndingPage: Mirror Shattering → Settlement Console
   ============================================================ */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useAudio } from '../hooks/useAudio';
import ParticleBg from '../components/ui/ParticleBg';
import TypewriterText from '../components/ui/TypewriterText';
import { unlockArchive102 } from './ArchiveHubPage';

// ── Crack paths for mirror shattering ──
const CRACK_SEGMENTS = [
  { angle: 15, length: 140, delay: 0.3 },
  { angle: -25, length: 180, delay: 0.5 },
  { angle: 70, length: 120, delay: 0.7 },
  { angle: -60, length: 160, delay: 0.9 },
  { angle: 110, length: 150, delay: 1.1 },
  { angle: -120, length: 130, delay: 1.3 },
  { angle: 35, length: 100, delay: 1.0 },
  { angle: -85, length: 110, delay: 1.2 },
  { angle: 155, length: 90, delay: 1.5 },
  { angle: -150, length: 100, delay: 1.6 },
  { angle: 0, length: 200, delay: 0.4 },
  { angle: 90, length: 170, delay: 0.8 },
];

// ── Fragment memories floating in cracks ──
const FRAGMENT_MEMORIES = [
  { text: '咖啡洒了', stage: 1, delay: 1.8, x: 15, y: -10 },
  { text: '无人机开火', stage: 2, delay: 2.2, x: -20, y: 5 },
  { text: '针管插入后颈', stage: 3, delay: 2.6, x: 10, y: 15 },
  { text: 'Weaver 在看着', stage: 4, delay: 3.0, x: -15, y: -8 },
];

export default function EndingPage() {
  const navigate = useNavigate();
  const sanity = useGameStore((s) => s.sanity);
  const revealedWords = useGameStore((s) => s.revealedWords);
  const interrogationHistory = useGameStore((s) => s.interrogationHistory);
  const resetGame = useGameStore((s) => s.resetGame);
  const currentArchive = useGameStore((s) => s.currentArchive);
  const stageCompleted = useGameStore((s) => s.stageCompleted);
  const { play, startAmbient, stopAmbient } = useAudio();

  // ── Ref to track if console audio has been triggered (one-shot) ──
  const consoleAudioTriggered = useRef(false);

  // ── Phase state machine ──
  const [phase, setPhase] = useState<'intro' | 'shatter' | 'reveal' | 'final' | 'silence' | 'console'>('intro');
  const [finalTextDone, setFinalTextDone] = useState(false);
  const [deniedActive, setDeniedActive] = useState(false);

  // ── Computed diagnosis data ──
  const revealedCount = Object.keys(revealedWords).length;
  const completedStages = stageCompleted.filter(Boolean).length;
  const interrogations = interrogationHistory.length;
  const isArchive102 = currentArchive === '102';
  /** Whether this is a "complete game" ending (102 finished or both archives done) */
  const isGrandFinale = isArchive102;

  // ── Reset & return to hub handler ──
  const handleRestart = useCallback(() => {
    play('ui_confirm');
    resetGame();
    // If just completed 404, auto-unlock 102 before returning
    if (!isArchive102) {
      unlockArchive102();
    }
    navigate('/archive-hub', { replace: true });
  }, [play, resetGame, navigate, isArchive102]);

  // ── Next File / Archive 102 unlock handler ──
  const handleNextFile = useCallback(() => {
    if (isArchive102) {
      // Already on final archive — grand finale denial
      play('system_alert');
      setDeniedActive(true);
      setTimeout(() => setDeniedActive(false), 2500);
      return;
    }

    // Archive #404 completed → unlock 102
    unlockArchive102();
    play('ui_confirm');
    setDeniedActive(true);
    // Auto-redirect after showing unlock message
    setTimeout(() => {
      resetGame();
      navigate('/archive-hub', { replace: true });
    }, 3000);
  }, [play, resetGame, navigate, isArchive102]);

  // ── Phase progression timeline ──
  useEffect(() => {
    startAmbient('game');

    const t1 = setTimeout(() => setPhase('shatter'), 2000);
    const t2 = setTimeout(() => {
      setPhase('reveal');
      play('system_alert');
    }, 5000);
    const t3 = setTimeout(() => setPhase('final'), 9000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [play, startAmbient]);

  // ── After typewriter finishes → 3s dead silence → console fade-in ──
  useEffect(() => {
    if (!finalTextDone || phase !== 'final') return;
    const t = setTimeout(() => setPhase('silence'), 100); // brief pause before silence indicator
    return () => clearTimeout(t);
  }, [finalTextDone, phase]);

  // ── Silence phase → auto advance to console after 3s ──
  // ⚡ Stop BGM for absolute dead silence during this phase
  useEffect(() => {
    if (phase !== 'silence') return;
    stopAmbient(); // Fade-out BGM → create dead silence
    const t = setTimeout(() => setPhase('console'), 3000);
    return () => clearTimeout(t);
  }, [phase, stopAmbient]);

  // ── Phase 5 (Console): Settlement panel visible → reboot chime + menu BGM ──
  // Task 19: One-shot reboot SFX when console appears, then restore menu music
  useEffect(() => {
    if (phase === 'console' && !consoleAudioTriggered.current) {
      consoleAudioTriggered.current = true;
      play('reboot');     // System reboot chime on settlement reveal
      startAmbient('menu'); // Return to menu BGM for the console phase
    }
  }, [phase, play, startAmbient]);

  return (
    <div className="relative h-screen overflow-hidden bg-cyber-bg flex items-center justify-center">
      {/* ── Ambient radial glow ── */}
      <div className="absolute inset-0 bg-gradient-radial from-cyber-red/5 via-transparent to-transparent pointer-events-none" />

      {/* ── CRT Scanlines overlay ── */}
      <div className="crt-scanlines" />

      {/* ── Particle field ── */}
      <ParticleBg />

      {/* ══════════════════════════════════════════════════
          MIRROR ANIMATION SEQUENCE (Phases 1-4)
         ══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {phase !== 'console' && (
          <motion.div
            key="mirror-sequence"
            className="relative z-10"
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          >
            {/* Mirror container */}
            <div className="relative w-[380px] h-[380px]">
              {/* Phase 1: Whole mirror */}
              <AnimatePresence>
                {phase === 'intro' && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-cyber-cyan/40 bg-gradient-to-br from-cyber-cyan/15 via-cyber-aqua/10 to-cyber-bg overflow-hidden shadow-lg shadow-cyber-cyan/10"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    transition={{ duration: 1.5 }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        className="w-24 h-48 bg-gradient-to-b from-cyber-cyan/30 to-cyber-aqua/20 rounded-full blur-sm"
                        animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.95, 1.05, 0.95] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      />
                    </div>
                    <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent rounded-t-full" />
                    <div className="absolute inset-0 rounded-full bg-cyber-cyan/5 animate-pulse-slow" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Phase 2+: Shattering crack lines */}
              <AnimatePresence>
                {(phase === 'shatter' || phase === 'reveal' || phase === 'final' || phase === 'silence') && (
                  <div className="absolute inset-0">
                    {CRACK_SEGMENTS.map((crack, i) => (
                      <motion.div
                        key={i}
                        className="absolute top-1/2 left-1/2 origin-center"
                        style={{ rotate: `${crack.angle}deg` }}
                        initial={{ width: 0 }}
                        animate={{ width: crack.length }}
                        transition={{ duration: 0.6, delay: crack.delay, ease: 'easeOut' }}
                      >
                        <div
                          className="h-[2px]"
                          style={{
                            background: 'linear-gradient(90deg, rgba(0,240,255,0.7), rgba(255,45,85,0.5), transparent)',
                            boxShadow: '0 0 8px rgba(0,240,255,0.4)',
                          }}
                        />
                        {i % 3 === 0 && (
                          <motion.div
                            className="absolute right-0 top-0 origin-right"
                            style={{ rotate: `${15 + i * 10}deg` }}
                            initial={{ width: 0 }}
                            animate={{ width: crack.length * 0.4 }}
                            transition={{ duration: 0.4, delay: crack.delay + 0.3 }}
                          >
                            <div className="h-px bg-cyber-red/20" />
                          </motion.div>
                        )}
                      </motion.div>
                    ))}

                    {/* Falling shards */}
                    {(phase === 'reveal' || phase === 'final' || phase === 'silence') && (
                      <>
                        {Array.from({ length: 12 }).map((_, i) => (
                          <motion.div
                            key={`shard_${i}`}
                            className="absolute w-8 h-12 bg-cyber-cyan/10 border border-cyber-cyan/5 rounded-sm"
                            style={{ top: `${30 + Math.random() * 40}%`, left: `${30 + Math.random() * 40}%` }}
                            initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
                            animate={{
                              opacity: [0.6, 0],
                              x: (Math.random() - 0.5) * 200,
                              y: (Math.random() - 0.5) * 200 - 100,
                              rotate: (Math.random() - 0.5) * 180,
                            }}
                            transition={{ duration: 2 + Math.random(), delay: 0.5 + Math.random() * 1.5 }}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </AnimatePresence>

              {/* Fragment memory texts */}
              {(phase === 'reveal' || phase === 'final' || phase === 'silence') && (
                <>
                  {FRAGMENT_MEMORIES.map((frag, i) => (
                    <motion.div
                      key={i}
                      className="absolute text-xs font-mono text-cyber-red/70 tracking-wider"
                      style={{
                        top: `${40 + (i % 2) * 20}%`,
                        left: `${30 + (i % 3) * 25}%`,
                        textShadow: '0 0 10px rgba(255,45,85,0.5)',
                      }}
                      initial={{ opacity: 0, x: 0, y: 0 }}
                      animate={{ opacity: [0, 0.9, 0.6, 0], x: frag.x, y: frag.y }}
                      transition={{ duration: 3, delay: frag.delay, repeat: 1 }}
                    >
                      {frag.text}
                    </motion.div>
                  ))}
                </>
              )}
            </div>

            {/* Final truth typewriter text */}
            <AnimatePresence>
              {(phase === 'final' || phase === 'silence') && (
                <motion.div
                  className="absolute bottom-32 left-0 right-0 text-center z-10 px-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.5, delay: 1 }}
                >
                  <div className="max-w-lg mx-auto space-y-4">
                    <TypewriterText
                      text="那面镜子里的人……是我。"
                      speed={50}
                      className="text-lg text-text-primary font-mono leading-relaxed"
                      showCursor={false}
                    />
                    <div className="h-6" />
                    <TypewriterText
                      text="我在抹除我自己。"
                      speed={60}
                      className="text-xl text-cyber-red font-mono font-bold leading-relaxed"
                      showCursor={false}
                    />
                    <div className="h-4" />
                    <TypewriterText
                      text="Weaver，你赢了……"
                      speed={80}
                      className="text-base text-text-dim font-mono leading-relaxed"
                      onComplete={() => setFinalTextDone(true)}
                      showCursor={false}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top label */}
            {phase !== 'intro' && (
              <motion.div
                className="absolute top-8 left-0 right-0 text-center z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3 }}
              >
                <p className="text-[10px] tracking-[0.5em] text-text-dim/40 font-mono uppercase">
                  {isArchive102 ? '档案 #102 · 深渊回响终结' : '档案 #404 · 记忆修复中止'}
                </p>
              </motion.div>
            )}

            {/* Silence indicator */}
            <AnimatePresence>
              {phase === 'silence' && (
                <motion.div
                  className="absolute bottom-20 left-0 right-0 text-center z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.3, 0] }}
                  transition={{ duration: 2 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="text-[10px] font-mono tracking-widest text-cyber-red/30">
                    {isGrandFinale ? '■ ALL SIGNALS EXHAUSTED' : '■ SIGNAL LOST — AWAITING REBOOT'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════
          PHASE 5: CYBER SETTLEMENT CONSOLE
         ══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {phase === 'console' && (
          <motion.div
            key="settlement-console"
            className="relative z-20 w-full max-w-3xl mx-auto px-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
          >
            {/* ── Console frame ── */}
            <div className="relative border border-cyber-cyan/30 bg-black/80 backdrop-blur-sm overflow-hidden">
              {/* Scanline overlay on console only */}
              <div className="absolute inset-0 pointer-events-none opacity-10"
                   style={{
                     backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.03) 2px, rgba(0,240,255,0.03) 4px)',
                   }}
              />

              {/* Top warning banner */}
              <div className="border-b border-cyber-cyan/20 bg-gradient-to-r from-cyber-red/10 via-cyber-red/5 to-transparent px-6 py-4">
                <div className="flex items-center gap-3">
                  {/* Blinking alert icon */}
                  <motion.span
                    className="w-2 h-2 rounded-full bg-cyber-red"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <h1 className="font-mono text-sm md:text-base tracking-[0.3em] text-cyber-red uppercase">
                    {isGrandFinale ? 'System Reboot… All Archives Exhausted' : 'System Reboot… ECHO-7 Disconnected'}
                  </h1>
                  <span className="ml-auto text-[10px] font-mono text-cyber-cyan/30">
                    ERROR_CODE: 0x7F_FFFF
                  </span>
                </div>
              </div>

              {/* Body: diagnostics + actions */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-0 md:gap-0 p-6">
                {/* Left: Diagnosis Data Panel (3 cols on md) */}
                <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-cyber-cyan/15 pr-0 md:pr-6 pb-6 md:pb-0 mb-6 md:mb-0 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] font-mono text-cyber-cyan/50 tracking-widest">DIAGNOSTICS</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-cyber-cyan/20 to-transparent" />
                  </div>

                  {/* Stat rows */}
                  {[
                    { label: 'SANITY_LEVEL', value: `${sanity.toFixed(0)}%`, critical: sanity <= 10 },
                    { label: 'TRUTH_EXTRACTION', value: completedStages >= 4 ? 'COMPLETE' : 'PARTIAL', critical: false },
                    { label: 'REVEALED_FRAGMENTS', value: String(revealedCount), critical: false },
                    { label: 'INTERROGATION_ROUNDS', value: String(interrogations), critical: false },
                    { label: 'OPERATOR_STATUS', value: 'COMPROMISED', critical: true },
                  ].map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between font-mono text-xs group">
                      <span className="text-text-dim/50 group-hover:text-text-dim/70 transition-colors">
                        {'>'} {stat.label.replace('_', '_')}
                      </span>
                      <span className={`font-bold tabular-nums ${stat.critical ? 'text-cyber-red animate-pulse-slow' : stat.value === 'COMPLETE' ? 'text-cyber-aqua' : 'text-cyber-cyan'}`}>
                        {stat.value}
                      </span>
                    </div>
                  ))}

                  {/* ASCII art divider */}
                  <pre className="text-[9px] leading-tight text-text-dim/25 font-mono overflow-hidden">
{`╔════════════════════════╗
║  ▓▓▓░░░░░░░▓▓▓░░░░░  ║
║  ░░▓▓░░░░░▓▓░░░░▓▓░  ║
║  ░░░░▓▓▓▓░░░▓▓▓▓░░░  ║
╚════════════════════════╝`}
                  </pre>
                </div>

                {/* Right / Bottom: Action buttons (2 cols on md) */}
                <div className="md:col-span-2 pl-0 md:pl-6 pt-6 md:pt-0 flex flex-col justify-end gap-4">
                  {/* Glitch denial message (appears when Button B clicked) */}
                  <AnimatePresence>
                    {deniedActive && (
                      <motion.div
                        initial={{ opacity: 0, x: 10, filter: 'blur(4px)' }}
                        animate={{
                          opacity: [0, 1, 1, 0],
                          x: [10, 0, -2, 0],
                          filter: ['blur(4px)', 'blur(0)', 'blur(0)', 'blur(4px)'],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2.5, times: [0, 0.15, 0.5, 1] }}
                        className="mb-2"
                      >
                        <motion.p
                          className="font-mono text-xs text-cyber-red tracking-wider"
                          animate={{
                            textShadow: [
                              '0 0 4px rgba(255,45,85,0)',
                              '0 0 16px rgba(255,45,85,0.8)',
                              '0 0 4px rgba(255,45,85,0)',
                              '0 0 16px rgba(255,45,85,0.8)',
                              '0 0 4px rgba(255,45,85,0)',
                            ],
                          }}
                          transition={{ duration: 0.3, repeat: 6 }}
                        >
                          {isArchive102
                            ? '[ 所有档案已归档。无更多可访问数据。 ]'
                            : isGrandFinale
                              ? '[ 档案 #102 已解锁。返回大厅查看。 ]'
                              : '[ 权限拒绝：您的精神评级过低，无法访问该档案 ]'}
                        </motion.p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Button A: Restart */}
                  <button
                    onClick={handleRestart}
                    className="group relative w-full py-3 px-4 border border-cyber-cyan/40 
                               bg-cyber-cyan/5 hover:bg-cyber-cyan/10
                               font-mono text-xs text-cyber-cyan tracking-wider
                               transition-all duration-300
                               hover:border-cyber-cyan/70 hover:shadow-lg hover:shadow-cyber-cyan/20
                               active:scale-[0.98]
                               overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-cyber-cyan/0 via-cyber-cyan/5 to-cyber-cyan/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <span className="relative flex items-center justify-between">
                      <span>[ A ]</span>
                      <span>返回档案大厅</span>
                    </span>
                  </button>

                  {/* Button B: Next File (narrative hook) */}
                  <button
                    onClick={handleNextFile}
                    className="group relative w-full py-3 px-4 border border-cyber-red/30 
                               bg-cyber-red/5 hover:bg-cyber-red/10
                               font-mono text-xs text-cyber-red/70 hover:text-cyber-red
                               tracking-wider transition-all duration-300
                               hover:border-cyber-red/60 hover:shadow-lg hover:shadow-cyber-red/10
                               active:scale-[0.98]
                               overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-cyber-red/0 via-cyber-red/5 to-cyber-red/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <span className="relative flex items-center justify-between">
                      <span>[ B ]</span>
                      <span>{isArchive102 ? '全通关数据' : '解锁档案 #102'}</span>
                    </span>
                    <span className="block mt-1 text-[9px] text-cyber-red/30 group-hover:text-cyber-red/50 text-right">
                      {isArchive102 ? 'EXHAUSTED' : 'LOCKED'}
                    </span>
                  </button>

                  {/* Footer timestamp */}
                  <p className="text-[9px] font-mono text-text-dim/20 text-right mt-2">
                    SESSION_END: {new Date().toISOString().replace('T', '_').slice(0, 19)}
                  </p>
                </div>
              </div>

              {/* Bottom scan bar decoration */}
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyber-cyan/30 to-transparent" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
