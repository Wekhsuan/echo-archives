/* ============================================================
   ECHO FILES — GlitchText: Cyberpunk Glitch Text Effect
   ============================================================ */

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface GlitchTextProps {
  text: string;
  className?: string;
  /** Whether to apply continuous glitch animation */
  active?: boolean;
  /** Glitch intensity 0-1 */
  intensity?: number;
  /** Tag to render as */
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div';
}

export default function GlitchText({
  text,
  className = '',
  active = true,
  intensity = 0.5,
  as: Tag = 'span',
}: GlitchTextProps) {
  const [glitchFrame, setGlitchFrame] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) return;

    const interval = 2000 + Math.random() * 3000; // Random interval
    timerRef.current = setInterval(() => {
      setGlitchFrame((prev) => (prev + 1) % 4);
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active]);

  const baseStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
  };

  // No glitch: render clean
  if (!active || glitchFrame === 0) {
    return (
      <Tag className={className} style={baseStyle}>
        {text}
      </Tag>
    );
  }

  // Glitch: render with RGB split clones
  const redOffset = (Math.random() - 0.5) * 6 * intensity;
  const blueOffset = (Math.random() - 0.5) * 6 * intensity;
  const clipPercent = 20 + Math.random() * 40;

  return (
    <Tag className={className} style={baseStyle}>
      {/* Blue channel offset */}
      <motion.span
        aria-hidden
        className="absolute inset-0 select-none"
        style={{
          color: '#00F0FF',
          clipPath: `inset(${clipPercent}% 0 0 0)`,
          transform: `translate(${blueOffset}px, 0)`,
          opacity: 0.6 * intensity,
        }}
        animate={{ x: [blueOffset, blueOffset * -1, blueOffset] }}
        transition={{ duration: 0.1, repeat: 2 }}
      >
        {text}
      </motion.span>

      {/* Red channel offset */}
      <motion.span
        aria-hidden
        className="absolute inset-0 select-none"
        style={{
          color: '#FF2D55',
          clipPath: `inset(0 0 ${100 - clipPercent - 10}% 0)`,
          transform: `translate(${redOffset}px, 0)`,
          opacity: 0.6 * intensity,
        }}
        animate={{ x: [redOffset, redOffset * -1, redOffset] }}
        transition={{ duration: 0.1, repeat: 2 }}
      >
        {text}
      </motion.span>

      {/* Main text slightly offset */}
      <span style={{ opacity: 0.9 }}>{text}</span>
    </Tag>
  );
}
