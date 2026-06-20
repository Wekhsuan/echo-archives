/* ============================================================
   ECHO FILES — MemoryViewer: Core Narrative Renderer
   ============================================================
   Renders the current memory stage's narrative with embedded
   fake-word anchors. Click → question, click again → reveal.

   States per fake word:
   - default      : dim cyan, dashed underline, clickable
   - questioned   : amber highlight (AI has responded)
   - revealing    : glitch shake animation playing
   - revealed     : fake word struck-through, real word visible
   ============================================================ */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { getCurrentStageData } from '../../store/gameStore';
import type { NarrativeSegment, WordMapping } from '../../types/game';
import { useAudio } from '../../hooks/useAudio';

// ── Props ──
interface MemoryViewerProps {
  /** Callback when player clicks a word for interrogation */
  onInterrogate: (wordId: string, fakeWord: string, mapping: WordMapping) => void;
  /** When true, all word buttons are disabled (backlash animation / stage transition lock) */
  disabled?: boolean;
}

export default function MemoryViewer({ onInterrogate, disabled = false }: MemoryViewerProps) {
  const stage = getCurrentStageData();
  const revealedWords = useGameStore((s) => s.revealedWords);
  const questionedWords = useGameStore((s) => s.questionedWords);
  const questionWord = useGameStore((s) => s.questionWord);
  const revealWord = useGameStore((s) => s.revealWord);

  const { play } = useAudio();

  // Currently animating reveal
  const [revealingId, setRevealingId] = useState<string | null>(null);

  if (!stage) {
    return (
      <div className="flex items-center justify-center h-full text-text-dim font-mono text-sm">
        没有载入的记忆数据。
      </div>
    );
  }

  const mappingMap = new Map(stage.wordMappings.map((m) => [m.id, m]));

  // ── Click handler: question → interrogate → allow reveal ──
  const handleWordClick = useCallback(
    (wordId: string) => {
      // Transition lock: block all clicks during backlash/stage transition
      if (disabled) return;

      const mapping = mappingMap.get(wordId);
      if (!mapping) return;

      // Already revealed — no further action
      if (revealedWords[wordId]) return;

      // Task 22: Always fire a tactile click SFX as the first action —
      // gives immediate audio feedback regardless of subsequent branch
      play('click');

      // Already questioned → reveal on second click
      if (questionedWords[wordId]) {
        // TODO: playHowl('glitch_reveal')
        play('glitch_reveal');

        // Start glitch animation
        setRevealingId(wordId);

        // After animation, actually reveal
        setTimeout(() => {
          revealWord(wordId);
          setRevealingId(null);
        }, 700);
        return;
      }

      // First click → question the word
      // TODO: playHowl('click_select')
      play('click_select');
      questionWord(wordId);
      onInterrogate(wordId, mapping.fakeWord, mapping);
    },
    [
      mappingMap,
      revealedWords,
      questionedWords,
      questionWord,
      revealWord,
      onInterrogate,
      play,
      disabled,
    ],
  );

  // Render a single narrative segment
  const renderSegment = (seg: NarrativeSegment, idx: number) => {
    const wordId = seg.wordMappingId;

    // ── Plain text segment ──
    if (!wordId) {
      return (
        <span key={idx} className="text-text-primary leading-relaxed">
          {seg.text}
        </span>
      );
    }

    // ── Fake word segment ──
    const mapping = mappingMap.get(wordId);
    if (!mapping) {
      // Fallback: render as plain text if mapping not found
      return (
        <span key={idx} className="text-text-primary">
          {seg.text}
        </span>
      );
    }

    const isQuestioned = questionedWords[wordId];
    const isRevealed = revealedWords[wordId];
    const isRevealing = revealingId === wordId;

    // ── REVEALED: show struck-through fake + revealed real ──
    if (isRevealed) {
      return (
        <span key={idx} className="inline">
          <span className="word-struck">{mapping.fakeWord}</span>
          <span className="word-revealed ml-1">{mapping.realWord}</span>
        </span>
      );
    }

    // ── REVEALING (glitch animation) ──
    if (isRevealing) {
      return (
        <motion.span
          key={idx}
          className="inline"
          initial={false}
          animate={glitchKeyframes}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          <span className="word-struck inline-block">{mapping.fakeWord}</span>
        </motion.span>
      );
    }

    // ── DEFAULT or QUESTIONED ──
    const markerClass = isQuestioned
      ? 'fake-word-marker questioned'
      : 'fake-word-marker';

    const title = isQuestioned
      ? '再次点击以执行剔除（揭示真相）'
      : mapping.revealHint;

    return (
      <motion.button
        key={idx}
        type="button"
        className={`${markerClass} bg-transparent border-none font-mono text-inherit text-[16px] leading-relaxed px-0 py-0 outline-none focus-visible:ring-1 focus-visible:ring-cyber-cyan/50 rounded-sm`}
        title={title}
        onClick={() => handleWordClick(wordId)}
        whileHover={isQuestioned || disabled ? {} : { scale: 1.05, textShadow: '0 0 8px rgba(255,184,0,0.4)' }}
        whileTap={{ scale: 0.97 }}
        disabled={isRevealed || disabled}
      >
        {mapping.fakeWord}
      </motion.button>
    );
  };

  return (
    <div className="relative h-full overflow-y-auto px-8 py-6 font-mono text-[16px] leading-[1.9] selection:bg-cyber-cyan/20">
      {/* ── Preamble ── */}
      <div className="mb-8 text-text-dim text-sm leading-relaxed whitespace-pre-line border-l-2 border-cyber-cyan/20 pl-4">
        {stage.preamble}
      </div>

      {/* ── Narrative body ── */}
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          <div className="text-text-primary">
            {stage.narrative.map((seg, i) => renderSegment(seg, i))}
          </div>
        </AnimatePresence>

        {/* ── Emotion Anchor (appears when all words revealed) ── */}
        <StageCompleteBanner stage={stage} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Stage Complete Banner
// ══════════════════════════════════════════════════════════════

function StageCompleteBanner({ stage }: { stage: ReturnType<typeof getCurrentStageData> }) {
  if (!stage) return null;
  const revealedWords = useGameStore((s) => s.revealedWords);
  const allRevealed = stage.wordMappings.every((m) => revealedWords[m.id]);

  if (!allRevealed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="mt-10 pt-6 border-t border-cyber-cyan/15"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-px bg-cyber-cyan/30" />
        <span className="text-cyber-cyan text-xs tracking-[0.3em] uppercase">
          记忆锚点已恢复
        </span>
      </div>
      <p className="mt-3 text-text-secondary text-sm leading-relaxed">
        <span className="text-cyber-amber">提取物：</span>
        {stage.emotionAnchor}
      </p>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════
// Glitch Animation Keyframes
// ══════════════════════════════════════════════════════════════

const glitchKeyframes = [
  // Phase 1: Initial shake
  { x: 0, y: 0, opacity: 1, filter: 'none' },
  { x: -4, y: 2, opacity: 0.8, filter: 'hue-rotate(0deg)' },
  { x: 4, y: -1, opacity: 0.5, filter: 'hue-rotate(90deg)' },
  { x: -3, y: -3, opacity: 0.7, filter: 'hue-rotate(180deg)' },
  { x: 5, y: 1, opacity: 0.3, filter: 'hue-rotate(270deg)' },
  // Phase 2: RGB split
  { x: -2, y: 2, opacity: 0.4,
    textShadow: '2px 0 0 rgba(255,0,0,0.6), -2px 0 0 rgba(0,0,255,0.6)' },
  { x: 3, y: -1, opacity: 0.2,
    textShadow: '4px 0 0 rgba(255,0,0,0.8), -4px 0 0 rgba(0,0,255,0.8)' },
  // Phase 3: Fade out
  { x: 0, y: 0, opacity: 0, filter: 'blur(2px)', scale: 1.1 },
];
