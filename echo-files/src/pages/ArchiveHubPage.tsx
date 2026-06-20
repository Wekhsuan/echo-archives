/* ============================================================
   ECHO FILES — ArchiveHubPage: PCA 档案馆选单大厅
   冷酷青色/复古终端风格 · 双档案热插拔模块
   ============================================================ */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { useAudio } from '../hooks/useAudio';
import ParticleBg from '../components/ui/ParticleBg';

/** LocalStorage key for 102 unlock persistence */
const LS_KEY_102_UNLOCKED = 'echo-files-archive-102-unlocked';

export default function ArchiveHubPage() {
  const navigate = useNavigate();
  const selectArchive = useGameStore((s) => s.selectArchive);
  const stageCompleted = useGameStore((s) => s.stageCompleted);
  const { stopAmbient, startAmbient } = useAudio();

  const [archive102Unlocked, setArchive102Unlocked] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<'404' | '102' | null>(null);

  // ── Check localStorage for 102 unlock status + play menu BGM ──
  useEffect(() => {
    const unlocked = localStorage.getItem(LS_KEY_102_UNLOCKED) === 'true';
    setArchive102Unlocked(unlocked);
    startAmbient('menu');
  }, [startAmbient]);

  // ── Select archive handler: fade out menu BGM before navigating ──
  const handleSelectArchive = useCallback(
    (archive: '404' | '102') => {
      if (archive === '102' && !archive102Unlocked) return;
      selectArchive(archive);
      // 1s smooth fade-out of current BGM, then navigate
      stopAmbient().then(() => {
        navigate('/memory', { replace: true });
      });
    },
    [archive102Unlocked, selectArchive, navigate, stopAmbient],
  );

  return (
    <div className="relative h-screen overflow-hidden bg-cyber-bg flex items-center justify-center">
      {/* Atmosphere layers */}
      <div className="crt-scanlines" />
      <ParticleBg />

      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center top, rgba(0,240,255,0.03), transparent 70%)',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 w-full max-w-4xl px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-[10px] tracking-[0.5em] text-text-dim/30 font-mono uppercase mb-3">
            PCA Central Archives — Operator Interface
          </p>
          <h1 className="text-2xl md:text-3xl font-mono font-bold text-cyber-cyan/90 tracking-[0.2em]">
            档 案 大 厅
          </h1>
          <div className="mt-3 h-[1px] w-48 mx-auto bg-gradient-to-r from-transparent via-cyber-cyan/30 to-transparent" />
        </motion.div>

        {/* Archive cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* ════════════════════════════════════════
              MODULE A: ARCHIVE #404
              ════════════════════════════════════════ */}
          <motion.button
            onClick={() => handleSelectArchive('404')}
            onMouseEnter={() => setHoveredCard('404')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative text-left cursor-pointer focus:outline-none"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div
              className={`relative p-6 rounded-sm border transition-all duration-500 ${
                hoveredCard === '404'
                  ? 'border-cyber-cyan bg-cyber-cyan/5 shadow-lg shadow-cyber-cyan/10'
                  : 'border-cyber-cyan/20 bg-black/40'
              }`}
            >
              {/* Card header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[9px] tracking-[0.4em] text-cyber-cyan/40 font-mono uppercase mb-1">
                    ARCHIVE #404
                  </p>
                  <h2 className="text-lg font-mono font-bold text-text-primary group-hover:text-cyber-cyan transition-colors">
                    裂痕与倒戈
                  </h2>
                </div>
                {/* Status badge */}
                <span className="px-2 py-0.5 text-[8px] font-mono tracking-wider bg-cyber-aqua/10 text-cyber-aqua border border-cyber-aqua/20">
                  AVAILABLE
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-text-dim/60 leading-relaxed font-mono mb-4">
                记忆修复任务 #404。包含 5 个记忆片段，涵盖从「裂痕」到「归零」的完整叙事链。
                <br />
                <span className="text-text-dim/30">预计耗时：25-40 分钟</span>
              </p>

              {/* Meta info row */}
              <div className="flex items-center gap-4 text-[9px] text-text-dim/30 font-mono">
                <span>STAGES: 1-5</span>
                <span>|</span>
                <span>RISK: MODERATE</span>
              </div>

              {/* Hover glow effect */}
              {hoveredCard === '404' && (
                <motion.div
                  className="absolute inset-0 pointer-events-none rounded-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    boxShadow: 'inset 0 0 30px rgba(0,240,255,0.05)',
                  }}
                />
              )}
            </div>
          </motion.button>

          {/* ════════════════════════════════════════
              MODULE B: ARCHIVE #102
              ════════════════════════════════════════ */}
          <motion.button
            onClick={() => handleSelectArchive('102')}
            disabled={!archive102Unlocked}
            onMouseEnter={() => setHoveredCard('102')}
            onMouseLeave={() => setHoveredCard(null)}
            className={`group relative text-left cursor-pointer focus:outline-none ${
              !archive102Unlocked ? 'cursor-not-allowed' : ''
            }`}
            whileHover={archive102Unlocked ? { scale: 1.02 } : {}}
            whileTap={archive102Unlocked ? { scale: 0.98 } : {}}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <div
              className={`relative p-6 rounded-sm border transition-all duration-500 ${
                !archive102Unlocked
                  ? 'border-white/5 bg-black/20'
                  : hoveredCard === '102'
                    ? 'border-cyber-red/50 bg-cyber-red/5 shadow-lg shadow-cyber-red/10'
                    : 'border-cyber-red/20 bg-black/40'
              }`}
            >
              {/* Card header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p
                    className={`text-[9px] tracking-[0.4em] font-mono uppercase mb-1 ${
                      archive102Unlocked ? 'text-cyber-red/50' : 'text-white/10'
                    }`}
                  >
                    ARCHIVE #102
                  </p>
                  <h2
                    className={`text-lg font-mono font-bold transition-colors ${
                      archive102Unlocked
                        ? 'text-text-primary group-hover:text-cyber-red'
                        : 'text-white/20'
                    }`}
                  >
                    深渊与回响
                  </h2>
                </div>
                {/* Status badge */}
                <span
                  className={`px-2 py-0.5 text-[8px] font-mono tracking-wider border ${
                    archive102Unlocked
                      ? 'bg-cyber-red/10 text-cyber-red border-cyber-red/20'
                      : 'bg-white/5 text-white/20 border-white/10'
                  }`}
                >
                  {archive102Unlocked ? 'UNLOCKED' : 'LOCKED'}
                </span>
              </div>

              {/* Description */}
              <p
                className={`text-xs leading-relaxed font-mono mb-4 ${
                  archive102Unlocked ? 'text-text-dim/60' : 'text-white/15'
                }`}
              >
                {archive102Unlocked ? (
                  <>
                    第二篇章：深渊回响。包含 5 个深层记忆片段，从「阳光温室」到终极真相。
                    <br />
                    <span className="text-text-dim/30">预计耗时：30-45 分钟</span>
                  </>
                ) : (
                  <>完成档案 #404 后自动解锁此档案。</>
                )}
              </p>

              {/* Meta info row */}
              <div className="flex items-center gap-4 text-[9px] font-mono">
                <span className={archive102Unlocked ? 'text-text-dim/30' : 'text-white/10'}>
                  STAGES: 6-10
                </span>
                <span className={archive102Unlocked ? 'text-text-dim/30' : 'text-white/10'}>|</span>
                <span className={`${archive102Unlocked ? 'text-cyber-red/40' : 'text-white/10'}`}>
                  RISK: EXTREME
                </span>
              </div>

              {/* Lock overlay */}
              {!archive102Unlocked && (
                <div className="absolute inset-0 flex items-center justify-center rounded-sm bg-black/30 backdrop-blur-[1px]">
                  <motion.div
                    className="text-center"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <p className="text-lg font-mono text-white/15 tracking-[0.3em]">[ LOCKED ]</p>
                    <p className="text-[9px] font-mono text-white/10 mt-1">
                      COMPLETE ARCHIVE #404 TO UNLOCK
                    </p>
                  </motion.div>
                </div>
              )}
            </div>
          </motion.button>
        </div>

        {/* ── Bottom Status Bar ── */}
        <motion.div
          className="fixed bottom-0 left-0 right-0 h-7 border-t border-white/5 flex items-center px-5 text-[9px] text-text-dim/40 font-mono z-30 bg-cyber-bg/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <span>OPERATOR: ECHO-7 (LEVEL 3 ACCESS)</span>
          <span className="ml-auto text-cyber-cyan/30">
            ARCHIVES: 2 / 2{' '}
            <span className={archive102Unlocked ? 'text-cyber-aqua/40' : ''}>
              ({archive102Unlocked ? 'BOTH AVAILABLE' : '1 LOCKED'})
            </span>
          </span>
        </motion.div>
      </div>
    </div>
  );
}

/** Utility: unlock archive 102 in localStorage (called from EndingPage) */
export function unlockArchive102(): void {
  localStorage.setItem(LS_KEY_102_UNLOCKED, 'true');
}

/** Utility: check if archive 102 is unlocked */
export function isArchive102Unlocked(): boolean {
  return localStorage.getItem(LS_KEY_102_UNLOCKED) === 'true';
}
