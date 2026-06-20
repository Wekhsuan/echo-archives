/* ============================================================
   ECHO FILES — HUD: Top Bar with Stage Info + Sanity
   ============================================================ */

import { motion } from 'framer-motion';
import { useGameStore, getCurrentStageData } from '../../store/gameStore';
import { STAGES } from '../../data/constants';

export default function HUD() {
  const currentStage = useGameStore((s) => s.currentStage);
  const sanity = useGameStore((s) => s.sanity);
  const stage = getCurrentStageData();

  if (!stage) return null;

  const sanityColor =
    sanity > 50 ? '#00FF41' : sanity > 25 ? '#FFB800' : '#FF2D55';

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-11 glass-panel border-b border-white/5 flex items-center px-5 select-none">
      {/* ── Left: Stage info ── */}
      <div className="flex items-center gap-4">
        <span className="text-[10px] tracking-[0.3em] text-cyber-cyan/60 font-mono uppercase">
          Echo Files
        </span>
        <span className="w-px h-4 bg-white/10" />
        <span className="text-xs text-text-primary font-mono">
          档案 #{stage.id.toString().padStart(2, '0')}
        </span>
        <span className="text-xs text-text-dim font-mono">·</span>
        <GlitchText
          text={stage.title}
          className="text-xs text-cyber-cyan font-mono"
          intensity={sanity < 30 ? 0.7 : 0.3}
          active={sanity < 45}
        />
      </div>

      {/* ── Center: Stage progress dots ── */}
      <div className="flex-1 flex items-center justify-center gap-2">
        {STAGES.map((s) => {
          const isCurrent = s.id === currentStage;
          const isCompleted = useGameStore.getState().stageCompleted[s.id - 1];
          const isUnlocked = s.id <= useGameStore.getState().unlockedStages;

          return (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full transition-all duration-500 ${
                  isCurrent
                    ? 'bg-cyber-cyan shadow-[0_0_8px_rgba(0,240,255,0.6)] animate-pulse'
                    : isCompleted
                      ? 'bg-cyber-green'
                      : isUnlocked
                        ? 'bg-text-dim/40'
                        : 'bg-text-dim/10'
                }`}
              />
              {s.id < 5 && (
                <div
                  className={`w-3 h-px ${
                    isCompleted ? 'bg-cyber-green/30' : 'bg-white/5'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Right: Sanity meter ── */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-text-dim font-mono tracking-wider">
          SANITY
        </span>
        <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            animate={{
              width: `${sanity}%`,
              backgroundColor: sanityColor,
            }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <motion.span
          className="text-xs font-mono tabular-nums min-w-[2.5rem] text-right"
          animate={{ color: sanityColor }}
          transition={{ duration: 0.3 }}
        >
          {sanity}%
        </motion.span>
      </div>
    </div>
  );
}

// Inline import to avoid circular dependency (HUD → GlitchText)
import GlitchText from '../ui/GlitchText';
