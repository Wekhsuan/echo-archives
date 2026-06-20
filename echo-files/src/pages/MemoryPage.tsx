/* ============================================================
   ECHO FILES — MemoryPage: Main Game Orchestrator
   ============================================================ */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, getCurrentStageData } from '../store/gameStore';
import { MEMORY_STAGES } from '../data/memories';
import { BACKLASH } from '../data/constants';
import { interrogateAI } from '../services/llm/adapter';
import type { LLMRequest } from '../services/llm/types';
import type { WordMapping } from '../types/game';
import { useAudio } from '../hooks/useAudio';

import GameLayout from '../components/layout/GameLayout';
import HUD from '../components/layout/HUD';
import MemoryViewer from '../components/game/MemoryViewer';
import InterrogationPanel from '../components/game/InterrogationPanel';
import TerminalPanel from '../components/game/TerminalPanel';
import type { TerminalMessage } from '../components/game/TerminalPanel';
import BacklashOverlay from '../components/game/BacklashOverlay';
import SanityOverlay from '../components/game/SanityOverlay';
import ParticleBg from '../components/ui/ParticleBg';

export default function MemoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { play, startAmbient, stopAmbient, stopSFX, duckBGM, restoreBGM, resumeAudio } = useAudio();

  // ── Store ──
  const currentStage = useGameStore((s) => s.currentStage);
  const revealedWords = useGameStore((s) => s.revealedWords);
  const questionedWords = useGameStore((s) => s.questionedWords);
  const stageCompleted = useGameStore((s) => s.stageCompleted);
  const unlockedStages = useGameStore((s) => s.unlockedStages);
  const sanity = useGameStore((s) => s.sanity);
  const gameStarted = useGameStore((s) => s.gameStarted);
  const startRestoringWord = useGameStore((s) => s.startRestoringWord);
  const addInterrogation = useGameStore((s) => s.addInterrogation);
  const goToStage = useGameStore((s) => s.goToStage);
  const completeStage = useGameStore((s) => s.completeStage);
  const goToEnding = useGameStore((s) => s.goToEnding);
  const backlashRestoring = useGameStore((s) => s.backlashRestoring);

  // ── Local state ──
  const [terminalMessages, setTerminalMessages] = useState<TerminalMessage[]>([]);
  const [pendingWordId, setPendingWordId] = useState<string | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [showStageComplete, setShowStageComplete] = useState(false);
  const [stageTransition, setStageTransition] = useState(false);

  /** 状态锁：反噬动画/通关过渡期间禁止词汇二次点击 */
  const [isTransitioning, setIsTransitioning] = useState(false);

  // ── Refs ──
  const revealedIdsRef = useRef<Set<string>>(new Set());
  const backlashTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const stageDoneRef = useRef(false);
  /** Task 22: Track whether unmount is a real route change vs React StrictMode double-mount */
  const isRealUnmountRef = useRef(false);

  // ── Guard: redirect to start if not started ──
  useEffect(() => {
    if (!gameStarted) navigate('/', { replace: true });
  }, [gameStarted, navigate]);

  // ── Audio lifecycle: mount bgm_game, cleanup on unmount ──
  //    Task 22: Hardened lifecycle — async ctx resume + route-aware cleanup
  useEffect(() => {
    if (!gameStarted) return;

    // Track current location path — used to detect real navigation vs StrictMode remount
    let active = true;

    // Fire-and-forget async: resume ctx first, then play BGM
    // Detached domain prevents any blocking on navigation
    (async () => {
      // Task 23: Kill residual reboot SFX FIRST (before any await) — synchronous, immediate
      stopSFX('reboot');
      await resumeAudio();           // Task 21: safe, never throws
      if (!active) return;            // Component already unmounted during await
      startAmbient('game');           // Fade-in bgm_game (also calls stopSFX('reboot') inside playBGM)
    })();

    // Cleanup: only stop BGM on REAL route change (not StrictMode double-mount)
    // Task 26-B: Physical isolation — only stop bgm_game (this page's scope).
    //   Do NOT call stopAllSFX() or any broad cleanup that could kill SFX
    //   already launched by the next route (e.g. /intermission's typing clicks,
    //   or /ending's reboot chime). The backlash useEffect has its own scoped
    //   cleanup for backlash SFX.
    return () => {
      active = false;
      if (isRealUnmountRef.current) {
        // Only fade out the game BGM — leave all SFX untouched
        stopAmbient();
      }
    };
  }, [gameStarted, startAmbient, stopSFX, stopAmbient, resumeAudio]);

  // ── Detect real route navigation (set flag before unmount) ──
  // When location.pathname changes away from /memory, mark as real unmount
  useEffect(() => {
    return () => {
      // Only fires when pathname actually changes (real navigation)
      isRealUnmountRef.current = true;
    };
  }, [location.pathname]);

  // ── Clear backlash timers on stage change ──
  useEffect(() => {
    backlashTimersRef.current.forEach((t) => clearTimeout(t));
    backlashTimersRef.current.clear();
    revealedIdsRef.current = new Set();
    setShowStageComplete(false);
    stageDoneRef.current = false;
    setTerminalMessages([]);
    setPendingWordId(null);
    setIsAIThinking(false);
    setIsTransitioning(false);
  }, [currentStage]);

  // ── Task 25/27-A: Cross-stage BGM reactivation with transition mutex ──
  // When currentStage changes (player advances to next stage), the previous
  // stage's completion called stopBGM() for dead silence. We reactivate
  // bgm_game here, BUT only if we're NOT in the sacred transition corridor
  // (settlement → dead silence → next stage). Task 27-A: absolute mutex lock
  // prevents timeline collision where reactivation races ahead of the
  // lingering 1.5s dead-silence timer and gets killed by it.
  useEffect(() => {
    if (!gameStarted) return;
    // Task 27-A: Transition mutex — if settlement/transition is in progress,
    // the dead-silence corridor owns the audio timeline. Do NOT reactivate BGM.
    if (isTransitioning || stageDoneRef.current) return;

    let active = true;
    (async () => {
      await resumeAudio();
      if (!active) return;
      // Double-check mutex after async await — transition may have started during await
      if (isTransitioning || stageDoneRef.current) return;
      startAmbient('game');
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStage]);

  // ── Backlash alarm + BGM ducking ──
  // Task 25: Continuous backlash SFX while backlashRestoring is active,
  //          hard stop when cleared. BGM ducked during combat, restored after.
  useEffect(() => {
    const hasActiveBacklash = backlashRestoring.length > 0;

    if (hasActiveBacklash) {
      // Initial burst
      play('backlash');
      duckBGM(0.08); // Duck to near-silence during combat

      // Task 25: Continuous alarm — re-trigger every 600ms while backlash active.
      // playSFX creates a new Howl per call (loop:false), so this simulates
      // a sustained alarm without relying on loop behavior.
      const alarmInterval = setInterval(() => {
        play('backlash');
      }, 600);

      return () => {
        clearInterval(alarmInterval);
        // Hard stop all backlash SFX the moment combat resolves
        stopSFX('backlash');
        restoreBGM(); // Restore full game BGM after combat resolves
      };
    }

    // No active backlash — ensure BGM is at full volume
    restoreBGM();
  }, [backlashRestoring.length, play, duckBGM, restoreBGM, stopSFX]);
  useEffect(() => {
    const stage = getCurrentStageData();
    if (!stage) return;

    for (const mapping of stage.wordMappings) {
      if (revealedWords[mapping.id] && !revealedIdsRef.current.has(mapping.id)) {
        revealedIdsRef.current.add(mapping.id);

        // Schedule backlash for stages 4-5
        if (stage.requiresBacklash) {
          const delay =
            BACKLASH.RESTORE_DELAY_MIN +
            Math.random() * (BACKLASH.RESTORE_DELAY_MAX - BACKLASH.RESTORE_DELAY_MIN);

          const timer = setTimeout(() => {
            startRestoringWord(mapping.id);
            play('backlash'); // ⚡ Backlash SFX burst on restore trigger
            backlashTimersRef.current.delete(mapping.id);
          }, delay);
          backlashTimersRef.current.set(mapping.id, timer);
        }
      }
    }
  }, [revealedWords, startRestoringWord]);

  // ── Detect stage completion ──
  // ⚠️ 任务17修复: 反噬关卡必须先等反噬动画完成，再触发通关结算
  //    时序: 反噬高潮(等待backlashRestoring清空) → 情感留白(1500ms) → 胜利结算
  useEffect(() => {
    const stage = getCurrentStageData();
    if (!stage || stageDoneRef.current) return;

    const allRevealed = stage.wordMappings.every((m) => revealedWords[m.id]);
    if (!allRevealed || stageCompleted[currentStage - 1]) return;

    // Lock: prevent further word clicks during transition
    stageDoneRef.current = true;
    setIsTransitioning(true);

    if (stage.requiresBacklash) {
      // ════════════════════════════════════════
      // Phase ①: 反噬高潮 — 等待所有反噬动画完成
      // ════════════════════════════════════════
      // backlogRestoring 非空说明 BacklashOverlay 正在处理中
      // 需要等待它清空（win/loss 都会调用 endRestoringWord 移除）
      const waitForBacklash = (): Promise<void> => {
        return new Promise((resolve) => {
          if (backlashRestoring.length === 0) {
            // 当前没有正在进行的反噬，但可能还有已调度但未触发的 timer
            // 等待最大反噬延迟 + 对抗窗口 = 4000 + 4500 = 8500ms 超时保护
            const timeout = setTimeout(resolve, 1000);
            return () => clearTimeout(timeout);
          }
          // 轮询等待 backlashRestoring 清空
          const pollInterval = setInterval(() => {
            const current = useGameStore.getState().backlashRestoring;
            if (current.length === 0) {
              clearInterval(pollInterval);
              // 额外缓冲：让 BacklashOverlay 的 exit 动画播完
              // handleWin=1200ms, handleLoss=1500ms
              setTimeout(resolve, 500);
            }
          }, 200);
          // 超时保护: 最长等待 10s（防止死锁）
          const safetyTimeout = setTimeout(() => {
            clearInterval(pollInterval);
            resolve();
          }, 10000);
          return () => { clearInterval(pollInterval); clearTimeout(safetyTimeout); };
        });
      };

      // Execute the async timeline
      (async () => {
        try {
          await waitForBacklash();
        } catch {
          // Safety: never block stage completion
        }

        // ════════════════════════════════════════
        // Phase ②: 情感留白 — 让反噬警告在视觉上完全呈现并开始淡出
        // ════════════════════════════════════════
        await new Promise((r) => setTimeout(r, 1500));

        // ════════════════════════════════════════
        // Phase ③: 死寂 → 胜利结算
        // Task 19: Stop BGM immediately for absolute dead silence,
        //   then hold 1.5s before triggering completion logic
        // Task 26-A: Only stop BGM here — do NOT call stopSFX('backlash')
        //   to avoid killing transition/fault SFX. The backlash useEffect
        //   cleanup handles its own SFX lifecycle independently.
        // ════════════════════════════════════════
        stopAmbient(); // Immediate fade-out for dead silence (BGM only)

        await new Promise((r) => setTimeout(r, 1500)); // 1.5s absolute silence

        completeStage();
        setShowStageComplete(true);
        setIsTransitioning(false);
        play('click'); // Task 26-A: Tactile impact when settlement panel appears
      })();
    } else {
      // Non-backlash stage: dead silence → completion
      stopAmbient();
      setTimeout(() => {
        completeStage();
        setShowStageComplete(true);
        setIsTransitioning(false);
        play('click'); // Task 26-A: Tactile impact when settlement panel appears
      }, 1500); // Same 1.5s dead silence for consistency
    }
  }, [revealedWords, currentStage, stageCompleted, completeStage, backlashRestoring, play]);

  // ── Interrogation handler ──
  const handleInterrogate = useCallback(
    async (wordId: string, fakeWord: string, mapping: WordMapping) => {
      const stage = getCurrentStageData();
      if (!stage) return;

      const msgId = `msg_${Date.now()}`;
      const now = Date.now();

      // Add query to terminal
      setTerminalMessages((prev) => [
        ...prev,
        {
          id: `${msgId}_q`,
          type: 'echo-query',
          text: `词汇「${fakeWord}」`,
          timestamp: now,
        },
      ]);

      // Add to interrogation history
      addInterrogation({
        id: `int_${now}`,
        wordId,
        question: fakeWord,
        timestamp: now,
      });

      // Set thinking state
      setIsAIThinking(true);
      setPendingWordId(wordId);

      // Build context from surrounding segments
      let context = '';
      const segIdx = stage.narrative.findIndex((s) => s.wordMappingId === wordId);
      if (segIdx !== -1) {
        const before = stage.narrative[segIdx - 1]?.text?.slice(-100) ?? '';
        const current = stage.narrative[segIdx]?.text ?? '';
        const after = stage.narrative[segIdx + 1]?.text?.slice(0, 100) ?? '';
        context = before + current + after;
      }

      // Call LLM
      const request: LLMRequest = {
        memoryId: stage.id,
        questionedWord: fakeWord,
        context,
        sanityLevel: sanity,
        stageTitle: stage.title,
      };

      try {
        const response = await interrogateAI(request);
        setIsAIThinking(false);

        // Add AI response with typing
        setTerminalMessages((prev) => [
          ...prev,
          {
            id: `${msgId}_a`,
            type: 'ai-response',
            text: response.text,
            timestamp: Date.now(),
            isTyping: true,
          },
        ]);

        // After typing completes, mark as done
        const typingDuration = response.text.length * 38; // ~38ms per char (HCI-tuned)
        setTimeout(() => {
          setTerminalMessages((prev) =>
            prev.map((m) =>
              m.id === `${msgId}_a` ? { ...m, isTyping: false } : m,
            ),
          );
        }, typingDuration);

        // Show inconsistency if present
        if (response.inconsistency) {
          setTimeout(() => {
            setTerminalMessages((prev) => [
              ...prev,
              {
                id: `${msgId}_w`,
                type: 'warning',
                text: response.inconsistency!,
                timestamp: Date.now(),
              },
            ]);
          }, typingDuration + 300);
        }
      } catch {
        // MockLiar fallback: won't reach here since mockLiar never throws
        setIsAIThinking(false);
      }

      setPendingWordId(null);
    },
    [sanity, addInterrogation],
  );

  // ── Proceed to intermission after stage completion ──
  // Task 26-A: Fire click SFX first for tactile impact on "继续" button
  const handleNextStage = useCallback(() => {
    play('click');             // Task 26-A: Tactile click on proceed
    setStageTransition(true);
    play('stage_transition');
    setTimeout(() => {
      // Always route through intermission diary page
      navigate('/intermission', { state: { fromStage: currentStage } });
    }, 800);
  }, [currentStage, navigate, play]);

  const stage = getCurrentStageData();

  return (
    <motion.div
      className="relative h-screen overflow-hidden bg-cyber-bg"
      animate={
        stageTransition
          ? { filter: 'brightness(2) blur(2px)', opacity: 0 }
          : {}
      }
      transition={{ duration: 0.5 }}
    >
      {/* ── Atmosphere layers ── */}
      <div className="crt-scanlines" />
      <ParticleBg />
      <SanityOverlay />
      <BacklashOverlay />

      {/* ── HUD ── */}
      <HUD />

      {/* ── Main layout ── */}
      <div className="pt-11 h-full">
        <GameLayout
          leftPanel={
            <InterrogationPanel
              pendingWordId={pendingWordId}
              isAIThinking={isAIThinking}
            />
          }
          centerContent={
            <div className="relative h-full overflow-hidden">
              <MemoryViewer onInterrogate={handleInterrogate} disabled={isTransitioning} />

              {/* Stage Complete Overlay */}
              <AnimatePresence>
                {showStageComplete && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center bg-black/70 z-20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="text-center space-y-6"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                    >
                      <p className="text-cyber-cyan text-sm tracking-[0.3em] font-mono uppercase">
                        记忆片段 #{stage?.id ?? '?'} 修复完成
                      </p>
                      <p className="text-text-dim text-xs font-mono">
                        情绪锚点已提取
                      </p>
                      <p className="text-cyber-amber text-sm font-mono max-w-md mx-auto leading-relaxed">
                        「{stage?.emotionAnchor ?? ''}」
                      </p>
                      <button
                        type="button"
                        className="mt-6 px-8 py-2.5 border border-cyber-cyan/30 text-cyber-cyan text-xs font-mono tracking-wider hover:bg-cyber-cyan/10 hover:border-cyber-cyan/60 transition-all cursor-pointer rounded-sm"
                        onClick={handleNextStage}
                      >
                        继续
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          }
          rightPanel={<TerminalPanel messages={terminalMessages} />}
        />
      </div>

      {/* ── Stage transition hint ── */}
      <div className="fixed bottom-0 left-0 right-0 h-7 border-t border-white/5 flex items-center px-5 text-[9px] text-text-dim/40 font-mono z-30 bg-cyber-bg/80 backdrop-blur-sm">
        <span>
          PCA://深海/修复终端 · Echo-7 · 档案#404 · 片段{currentStage}/{MEMORY_STAGES.length}
        </span>
        <span className="ml-auto">
          {MEMORY_STAGES[currentStage - 1]?.title ?? '未知'} ·{' '}
          {MEMORY_STAGES[currentStage - 1]?.setting ?? ''}
        </span>
      </div>
    </motion.div>
  );
}
