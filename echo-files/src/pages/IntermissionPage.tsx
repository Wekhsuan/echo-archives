/* ============================================================
   ECHO FILES — IntermissionPage: 幕间独白过场
   ECHO-7 第一人称私密日记 · 人性化打字引擎 · 极简纯黑视觉
   ============================================================ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { getIntermission } from '../data/intermissions';
import { MEMORY_STAGES } from '../data/memories';
import { getCurrentArchiveLastStage } from '../store/gameStore';
import { useAudio } from '../hooks/useAudio';

// ════════════════════════════════════════════════════════════
// Human-like typewriter delay calculator
// ════════════════════════════════════════════════════════════

/** 计算当前字符的打字延迟（毫秒），模拟人在恐惧中的输入节奏 */
function calcDelay(char: string): number {
  // 基础随机间隔：50~150ms（比 Weaver 的匀速机械节奏慢且不稳定）
  const base = 50 + Math.random() * 100;

  // 中文句末标点：明显停顿（模拟呼吸/犹豫）
  if ('。！？…'.includes(char)) {
    return base + 400 + Math.random() * 500;
  }

  // 省略号特殊处理：超长停顿（模拟情绪崩溃）
  if (char === '…' || char === '……') {
    return base + 900 + Math.random() * 600;
  }

  // 逗号等短停顿
  if ('，、；：'.includes(char)) {
    return base + 200 + Math.random() * 300;
  }

  // 换行：段落间的呼吸停顿
  if (char === '\n') {
    return base + 350 + Math.random() * 250;
  }

  // ≈8% 概率触发「犹豫停顿」（模拟打字时突然停下思考）
  if (Math.random() < 0.08) {
    return base + 350 + Math.random() * 450;
  }

  return base;
}

// ════════════════════════════════════════════════════════════
// Hand-tremor configuration
// ════════════════════════════════════════════════════════════

interface TremorState {
  active: boolean;
  burstChars: string[];     // 快速连打的字符缓存
  deleteCount: number;      // 回删字符数 (1-2)
}

/** 判断是否触发一次"手抖回溯"事件（约 7% 概率） */
function shouldTriggerTremor(charIndex: number): boolean {
  // 前 15 个字符不触发（需要先建立节奏）
  if (charIndex < 15) return false;
  // 每 25+ 字符才有机会再次触发（避免过于频繁）
  return Math.random() < 0.07;
}

export default function IntermissionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { play } = useAudio();

  // ── Store ──
  const storeStage = useGameStore((s) => s.currentStage);
  const goToStage = useGameStore((s) => s.goToStage);
  const goToEnding = useGameStore((s) => s.goToEnding);

  // ── Determine which stage we just completed ──
  // Priority: navigate state > store fallback
  const fromStage = (location.state as { fromStage?: number })?.fromStage ?? storeStage;
  const entry = getIntermission(fromStage);

  // ── Local state ──
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);    // 打字完毕后 2.5s 死寂再显示
  const [isExiting, setIsExiting] = useState(false);

  // ── Refs ──
  const charIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDoneRef = useRef(false);
  const transitioningRef = useRef(false);

  // ── Tremor state ref ──
  const tremorRef = useRef<TremorState>({
    active: false,
    burstChars: [],
    deleteCount: 0,
  });

  // ── Guard: no matching entry → redirect ──
  useEffect(() => {
    if (!entry) {
      console.warn('[Intermission] No entry for stage', fromStage, ', redirecting to /');
      navigate('/', { replace: true });
    }
  }, [entry, fromStage, navigate]);

  // ════════════════════════════════════════════════════════════
  // Core typewriter loop with human-struggle rhythm
  // Task 26-B: Route activation lock — only start typing when truly on /intermission.
  // Task 27-B: Softened to fuzzy path matching — React Router's state machine
  //   has microsecond-level sync delay on initial mount, so strict equality
  //   (`===`) could miss the first render tick and kill all keystroke SFX.
  //   Now uses `includes('intermission')` for graceful, inclusive detection.
  // ════════════════════════════════════════════════════════════
  useEffect(() => {
    // Task 27-B: Soft path matching — include check tolerates Router sync delay
    if (!location.pathname.includes('intermission')) return;
    if (!entry || isDoneRef.current) return;

    const fullText = entry.text;
    const totalLen = fullText.length;

    const typeNext = () => {
      const idx = charIndexRef.current;

      // ── Check for active tremor burst ──
      const tremor = tremorRef.current;
      if (tremor.active && tremor.burstChars.length > 0) {
        // Consume one char from burst (fast typing)
        const burstChar = tremor.burstChars.shift()!;
        setDisplayedText((prev) => prev + burstChar);
        charIndexRef.current += 1;

        // Task 24: Keystroke SFX — skip whitespace, allow overlap (frantic pace)
        if (burstChar.trim() !== '') {
          play('click');
        }

        // Fast burst timer: 15~35ms per char (frantic pace)
        timerRef.current = setTimeout(typeNext, 15 + Math.random() * 20);
        return;
      }

      if (tremor.active && tremor.deleteCount > 0) {
        // Backspace phase: delete 1 char with hesitation
        setDisplayedText((prev) => prev.slice(0, -1));
        tremor.deleteCount -= 1;
        charIndexRef.current -= 1;

        if (tremor.deleteCount > 0) {
          // Slow backspace: 180~300ms (hesitation)
          timerRef.current = setTimeout(typeNext, 180 + Math.random() * 120);
        } else {
          // End of tremor: long pause before resuming (guilt/fear)
          tremor.active = false;
          timerRef.current = setTimeout(typeNext, 600 + Math.random() * 700);
        }
        return;
      }

      // ── Normal typing complete? ──
      if (idx >= totalLen) {
        isDoneRef.current = true;
        setIsTypingDone(true);
        console.debug('[Intermission] Diary text fully typed for stage', fromStage);

        // ★ 核心情绪设计：2.5 秒死寂留白（电影级压抑）
        // 屏幕保持纯黑和静止，不显示任何提示
        timerRef.current = setTimeout(() => {
          setShowPrompt(true);
          console.debug('[Intermission] Prompt fade-in triggered');
        }, 2500);
        return;
      }

      // ── Check for tremor trigger ──
      if (shouldTriggerTremor(idx)) {
        const charsToBurst = 2 + Math.floor(Math.random() * 2); // 2~3 chars fast
        const charsToDelete = 1 + Math.floor(Math.random() * 2); // 1~2 chars back

        tremorRef.current = {
          active: true,
          burstChars: fullText.slice(idx, idx + charsToBurst).split(''),
          deleteCount: charsToDelete,
        };

        // Start burst immediately
        timerRef.current = setTimeout(typeNext, 30);
        return;
      }

      // ── Normal character output ──
      const char = fullText[idx];
      setDisplayedText((prev) => prev + char);
      charIndexRef.current += 1;

      // Task 24: Keystroke SFX — skip spaces/newlines to avoid audio clutter.
      // Howler playSFX creates a new Howl per call → allows overlap, no truncation.
      if (char.trim() !== '') {
        play('click');
      }

      const delay = calcDelay(char);
      timerRef.current = setTimeout(typeNext, delay);
    };

    // Start typing after a short entrance pause (let player settle)
    timerRef.current = setTimeout(typeNext, 800);

    // Task 26-B: Explicit cleanup — clearTimeout to kill any pending typewriter
    //   timer when leaving /intermission, preventing shadow keystroke SFX.
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [entry, fromStage, location.pathname, play]);

  // ════════════════════════════════════════════════════════════
  // Keyboard listener: Space / Enter to proceed
  // ════════════════════════════════════════════════════════════
  const handleProceed = useCallback(() => {
    if (!isDoneRef.current || transitioningRef.current || isExiting) return;
    transitioningRef.current = true;

    console.debug('[Intermission] Proceeding from stage', fromStage);

    // Fade out first
    setIsExiting(true);

    // After fade-out animation, navigate
    setTimeout(() => {
      const archiveLastStage = getCurrentArchiveLastStage();
      const isFinal = archiveLastStage ? fromStage >= archiveLastStage : fromStage >= MEMORY_STAGES.length;

      if (isFinal) {
        // Final intermission of current archive → ending
        goToEnding();
        navigate('/ending', { replace: true });
      } else {
        // Normal intermission → next stage within same archive
        goToStage(fromStage + 1);
        navigate('/memory', { replace: true });
      }
    }, 650);
  }, [fromStage, goToEnding, goToStage, navigate, isExiting]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
        e.preventDefault();
        handleProceed();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleProceed]);

  // ── Loading guard ──
  if (!entry) return null;

  // ════════════════════════════════════════════════════════════
  // Render: Minimalist Dread
  // ════════════════════════════════════════════════════════════
  return (
    <motion.div
      className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={isExiting ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.35, exit: { duration: 0.65 } }}
    >
      {/* ── Centered diary text ── */}
      <div className="relative z-10 max-w-lg w-full px-6 sm:px-10">
        <div className="whitespace-pre-wrap text-base sm:text-lg leading-[2] font-light tracking-wide text-white/85"
          style={{ fontFamily: "'JetBrains Mono', 'Noto Sans SC', monospace" }}
        >
          {/* Render text with subtle flicker on last typed segment */}
          {displayedText}
          {/* Breathing cursor dot (only while typing) */}
          {!isTypingDone && (
            <motion.span
              className="inline-block w-[2px] h-[1.1em] bg-white/40 align-middle ml-0.5"
              animate={{ opacity: [0.4, 0.9, 0.4] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>
      </div>

      {/* ── Bottom prompt: ultra-slow fade-in after dead silence ── */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            className="fixed bottom-8 left-0 right-0 text-center z-10 pointer-events-none"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 2.0,
              ease: 'easeOut',
            }}
          >
            <p className="text-[10px] font-mono tracking-[0.4em] text-white/18 uppercase">
              [ 按 Space 或 Enter 潜入下一段记忆 ]
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stage indicator (subtle, top-right corner) ── */}
      <div className="fixed top-6 right-6 z-10">
        <p className="text-[9px] font-mono text-white/[0.08] tracking-widest">
          INTERMISSION #{String(fromStage).padStart(2, '0')}
        </p>
      </div>
    </motion.div>
  );
}
