/* ============================================================
   ECHO FILES — SanityOverlay: Progressive UI Degradation
   ============================================================
   Applies visual degradation layers based on current sanity.
   Operates as a purely visual fixed overlay.
   ============================================================ */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSanity, type SanityParams } from '../../hooks/useSanity';
import { SANITY } from '../../data/constants';

export default function SanityOverlay() {
  const params = useSanity();

  // Random glitch flash interval
  const glitchFlash = useMemo(() => {
    if (params.glitchFrequency === 0) return false;
    // Random boolean based on frequency
    // Higher frequency = more likely to flash at any moment
    return Math.random() < 1 / (params.glitchFrequency * 10);
  }, [params.glitchFrequency]);

  if (params.level === 'none') return null;

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[99] ${params.skewClass}`}
    >
      {/* ── Chromatic aberration edge overlay ── */}
      {(params.level === 'heavy' || params.level === 'critical') && (
        <div className="absolute inset-0 overflow-hidden">
          {/* RGB split edges */}
          <div
            className="absolute top-0 left-0 right-0 h-px bg-red-500/20"
            style={{ filter: 'blur(2px)' }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-px bg-blue-500/20"
            style={{ filter: 'blur(2px)' }}
          />
        </div>
      )}

      {/* ── Random glitch flash ── */}
      <AnimatePresence>
        {glitchFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.04, 0, 0.02, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-cyber-red"
          />
        )}
      </AnimatePresence>

      {/* ── Critical: persistent red vignette ── */}
      {params.level === 'critical' && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 50%, rgba(255,45,85,0.06) 100%)',
          }}
        />
      )}

      {/* ── Cursor trail (would need custom cursor implementation) ── */}
      {params.cursorTrail && (
        <div className="absolute inset-0 bg-black/5 mix-blend-overlay" />
      )}
    </div>
  );
}

// ── Re-export params type for consumers ──
export type { SanityParams };
