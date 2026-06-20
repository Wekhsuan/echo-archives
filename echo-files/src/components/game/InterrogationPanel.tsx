/* ============================================================
   ECHO FILES — InterrogationPanel: Left Sidebar Medical Log
   ============================================================
   Displays all questioned words as a cold clinical record.
   No drag-and-drop — words appear automatically when clicked
   in the MemoryViewer.
   ============================================================ */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { getCurrentStageData } from '../../store/gameStore';
import type { WordMapping } from '../../types/game';

// ── Props ──
interface InterrogationPanelProps {
  /** Currently interrogating word ID (AI thinking) */
  pendingWordId?: string | null;
  /** Whether AI is currently generating a response */
  isAIThinking?: boolean;
}

export default function InterrogationPanel({
  pendingWordId,
  isAIThinking,
}: InterrogationPanelProps) {
  const stage = getCurrentStageData();
  const interrogationHistory = useGameStore((s) => s.interrogationHistory);
  const questionedWords = useGameStore((s) => s.questionedWords);
  const revealedWords = useGameStore((s) => s.revealedWords);
  const sanity = useGameStore((s) => s.sanity);

  // Build word state list from questioned words + stage mappings
  const wordEntries = useMemo(() => {
    if (!stage) return [];

    const entries: WordEntry[] = [];
    const mappingMap = new Map(stage.wordMappings.map((m) => [m.id, m]));

    for (const mapping of stage.wordMappings) {
      if (!questionedWords[mapping.id]) continue;

      const matchingHistory = interrogationHistory.filter(
        (h) => h.wordId === mapping.id,
      );

      entries.push({
        mapping,
        questioned: true,
        revealed: !!revealedWords[mapping.id],
        historyCount: matchingHistory.length,
        lastQuestioned: matchingHistory.length > 0
          ? matchingHistory[matchingHistory.length - 1].timestamp
          : Date.now(),
        isPending: pendingWordId === mapping.id && isAIThinking,
      });
    }

    return entries.sort((a, b) => b.lastQuestioned - a.lastQuestioned);
  }, [stage, questionedWords, revealedWords, interrogationHistory, pendingWordId, isAIThinking]);

  return (
    <div className="h-full flex flex-col glass-panel">
      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-white/5">
        <h3 className="text-xs tracking-[0.25em] text-cyber-cyan/70 uppercase font-mono">
          Interrogation Log
        </h3>
        <p className="text-[10px] text-text-dim mt-1 font-mono">
          ECHO-7 · 记忆修复师 · 档案#404
        </p>
        {/* Sanity mini-indicator */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-text-dim font-mono">SANITY</span>
          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              animate={{
                width: `${sanity}%`,
                backgroundColor:
                  sanity > 50
                    ? '#00FF41'
                    : sanity > 25
                      ? '#FFB800'
                      : '#FF2D55',
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span
            className={`text-[10px] font-mono tabular-nums ${
              sanity > 50
                ? 'text-cyber-green'
                : sanity > 25
                  ? 'text-cyber-amber'
                  : 'text-cyber-red'
            }`}
          >
            {sanity}%
          </span>
        </div>
      </div>

      {/* ── Word List ── */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        {wordEntries.length === 0 && (
          <p className="text-text-dim text-xs font-mono leading-relaxed">
            暂无质询记录。
            <br />
            点击文本中<span className="text-cyber-cyan/50">高亮词汇</span>以发起质询。
          </p>
        )}

        <AnimatePresence>
          {wordEntries.map((entry) => (
            <motion.div
              key={entry.mapping.id}
              initial={{ opacity: 0, x: -10, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: -10, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-3"
            >
              <WordEntryCard entry={entry} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Footer status ── */}
      <div className="px-5 py-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              isAIThinking ? 'bg-cyber-amber animate-pulse' : 'bg-cyber-green'
            }`}
          />
          <span className="text-[10px] text-text-dim font-mono">
            {isAIThinking
              ? 'WEAVER 正在生成回应…'
              : 'WEAVER 在线 · 等待操作员输入'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Word Entry Subcomponent
// ══════════════════════════════════════════════════════════════

interface WordEntry {
  mapping: WordMapping;
  questioned: boolean;
  revealed: boolean;
  historyCount: number;
  lastQuestioned: number;
  isPending: boolean;
}

function WordEntryCard({ entry }: { entry: WordEntry }) {
  const time = new Date(entry.lastQuestioned).toLocaleTimeString('zh-CN', {
    hour12: false,
  });

  let statusLabel: string;
  let statusColor: string;
  let borderColor: string;

  if (entry.revealed) {
    statusLabel = 'TRUTH EXTRACTED';
    statusColor = 'text-cyber-red';
    borderColor = 'border-cyber-red/20';
  } else if (entry.isPending) {
    statusLabel = 'AI ANALYZING…';
    statusColor = 'text-cyber-amber';
    borderColor = 'border-cyber-amber/20';
  } else {
    statusLabel = 'RESPONDED';
    statusColor = 'text-cyber-cyan/60';
    borderColor = 'border-cyber-cyan/10';
  }

  return (
    <div className={`border ${borderColor} rounded-sm px-3 py-2.5 bg-black/20`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-text-dim font-mono tabular-nums">
          #{time}
        </span>
        <span className={`text-[9px] tracking-widest font-mono ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Word row */}
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] text-text-dim font-mono">术语:</span>
        <span
          className={`text-sm font-mono ${
            entry.revealed
              ? 'text-cyber-red line-through'
              : 'text-cyber-amber'
          }`}
        >
          「{entry.mapping.fakeWord}」
        </span>
      </div>

      {/* Hint row (shown when not yet revealed) */}
      {!entry.revealed && (
        <p className="mt-1.5 text-[10px] text-text-dim/60 font-mono leading-relaxed italic">
          {entry.mapping.revealHint}
        </p>
      )}

      {/* Truth row (shown when revealed) */}
      {entry.revealed && (
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-[10px] text-cyber-red/60 font-mono">真实:</span>
          <span className="text-xs text-text-primary font-mono">
            {entry.mapping.realWord}
          </span>
        </div>
      )}
    </div>
  );
}
