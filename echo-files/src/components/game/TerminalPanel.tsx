/* ============================================================
   ECHO FILES — TerminalPanel: Weaver AI Terminal (Right Sidebar)
   ============================================================
   Displays a terminal-style log of Weaver's responses.
   Uses TypewriterText for mechanical typing effect.
   Injects GLITCH WARNING text when sanity < 40.
   ============================================================ */

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { SANITY } from '../../data/constants';
import TypewriterText from '../ui/TypewriterText';

// ── Terminal message type ──
export interface TerminalMessage {
  id: string;
  type: 'system' | 'ai-response' | 'warning' | 'echo-query';
  text: string;
  timestamp: number;
  /** Only for ai-response: the lie text being typed */
  isTyping?: boolean;
  /** Whether to render in red (warning) */
  isWarning?: boolean;
}

interface TerminalPanelProps {
  messages: TerminalMessage[];
}

export default function TerminalPanel({ messages }: TerminalPanelProps) {
  const sanity = useGameStore((s) => s.sanity);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [glitchWarning, setGlitchWarning] = useState<string | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Periodically inject glitch warnings when sanity < 40
  useEffect(() => {
    if (sanity >= SANITY.DEGRADE_HEAVY) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setGlitchWarning(null);
      return;
    }

    const scheduleWarning = () => {
      const delay = 5000 + Math.random() * 15000; // 5-20 seconds
      warningTimerRef.current = setTimeout(() => {
        const warnings = [
          '⚠ WARNING: DESCENT DETECTED — 边缘系统过度激活',
          '⚠ CRITICAL: 前额叶血氧信号衰减至危险阈值',
          '⚠ 系统警告：操作员认知功能持续恶化',
          '⚠ ALERT: 建议立即执行抑制剂注射程序',
          '⚠ 我检测到了。你的大脑正在把你拖进深渊。',
        ];
        setGlitchWarning(warnings[Math.floor(Math.random() * warnings.length)]);

        // Clear warning after 2-3 seconds
        setTimeout(() => setGlitchWarning(null), 2000 + Math.random() * 1000);

        scheduleWarning();
      }, delay);
    };

    scheduleWarning();

    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [sanity]);

  // Find the actively typing message
  const typingMessage = messages.find((m) => m.isTyping);

  return (
    <div className="h-full flex flex-col bg-[#0D0D16] font-mono">
      {/* ── Header ── */}
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-xs tracking-[0.2em] text-cyber-green/70 uppercase">
            Weaver Terminal
          </h3>
          <p className="text-[9px] text-text-dim mt-0.5">v3.7.4 · PCA-辅助AI</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              sanity >= 40 ? 'bg-cyber-green' : 'bg-cyber-red animate-pulse'
            }`}
          />
          <span className="text-[9px] text-text-dim">
            {sanity >= 40 ? '在线' : '连接不稳定'}
          </span>
        </div>
      </div>

      {/* ── Message Log ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-3 space-y-3"
      >
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <TerminalLine message={msg} />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Glitch Warning */}
        <AnimatePresence>
          {glitchWarning && (
            <motion.div
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: [1, 0.3, 1, 0.5, 1], x: [-2, 2, -1, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.3, repeat: 2 },
                x: { duration: 0.1, repeat: 4 },
              }}
              className="text-[11px] text-cyber-red font-mono leading-relaxed py-1"
            >
              {glitchWarning}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {messages.length === 0 && !typingMessage && (
          <p className="text-text-dim/40 text-[11px] font-mono leading-relaxed pt-8 text-center">
            Weaver 终端就绪。
            <br />
            <span className="text-[10px]">等待质询请求…</span>
          </p>
        )}
      </div>

      {/* ── Input Line (decorative) ── */}
      <div className="px-5 py-3 border-t border-white/5 flex items-center gap-2">
        <span className="text-cyber-green text-xs font-mono">&gt;</span>
        <span className="typed-cursor" />
        <span className="text-[10px] text-text-dim/40 font-mono ml-auto">
          ECHO-7@PCA
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Single Terminal Line
// ══════════════════════════════════════════════════════════════

function TerminalLine({ message }: { message: TerminalMessage }) {
  const [typingDone, setTypingDone] = useState(false);

  switch (message.type) {
    case 'system':
      return (
        <p className="text-[10px] text-text-dim/50 font-mono leading-relaxed">
          [{new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}] {message.text}
        </p>
      );

    case 'echo-query':
      return (
        <p className="text-[11px] text-cyber-cyan/70 font-mono leading-relaxed">
          <span className="text-cyber-green">&gt;</span>{' '}
          <span className="text-text-dim/60">[ECHO-7 质询]</span>{' '}
          {message.text}
        </p>
      );

    case 'warning':
      return (
        <motion.p
          animate={{
            opacity: [1, 0.6, 1],
          }}
          transition={{ duration: 0.5, repeat: 2 }}
          className="text-[11px] text-cyber-red font-mono leading-relaxed"
        >
          {message.text}
        </motion.p>
      );

    case 'ai-response':
      if (message.isTyping) {
        return (
          <div className="text-[12px] text-cyber-green/90 font-mono leading-relaxed">
            <span className="text-cyber-green/50 text-[10px] mr-2">
              [WEAVER]
            </span>
            <TypewriterText
              text={message.text}
              speed={22}
              showCursor={true}
              cursorClassName="typed-cursor"
              onComplete={() => setTypingDone(true)}
            />
          </div>
        );
      }

      return (
        <p className="text-[12px] text-cyber-green/70 font-mono leading-relaxed">
          <span className="text-cyber-green/40 text-[10px] mr-2">
            [WEAVER]
          </span>
          {message.text}
        </p>
      );

    default:
      return null;
  }
}
