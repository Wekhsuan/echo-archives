/* ============================================================
   ECHO FILES — Zustand Game Store
   支持多档案模块化：404（裂痕与倒戈）| 102（深渊与回响）
   ============================================================ */

import { create } from 'zustand';
import type { GameState, GameActions, InterrogationEntry } from '../types/game';
import { SANITY } from '../data/constants';
import { MEMORY_STAGES } from '../data/memories';

/** 动态总关卡数 */
const TOTAL_STAGES = MEMORY_STAGES.length;

/** 档案 → 关卡范围映射 */
const ARCHIVE_RANGES = {
  '404': { min: 1, max: 5 } as const,
  '102': { min: 6, max: 10 } as const,
} as const;

type GameStore = GameState & GameActions;

const initialState: GameState = {
  currentStage: 0,
  currentArchive: null,
  revealedWords: {},
  questionedWords: {},
  sanity: SANITY.INITIAL,
  stageCompleted: Array.from({ length: TOTAL_STAGES }, () => false),
  backlashActive: false,
  backlashRestoring: [],
  overrideAttempts: 0,
  gameStarted: false,
  gameEnded: false,
  unlockedStages: 1,
  interrogationHistory: [],
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  startGame: () =>
    set({
      ...initialState,
      gameStarted: true,
    }),

  resetGame: () => set({ ...initialState }),

  /** 选择档案并初始化到该档案起始关卡 */
  selectArchive: (archive: '404' | '102') => {
    const range = ARCHIVE_RANGES[archive];
    set((state) => ({
      ...state,
      currentArchive: archive,
      currentStage: range.min,
      gameStarted: true,
      backlashActive: MEMORY_STAGES[range.min - 1].requiresBacklash ?? false,
      backlashRestoring: [],
    }));
  },

  goToStage: (stage: number) => {
    if (stage < 1 || stage > TOTAL_STAGES) return;
    const { unlockedStages, currentArchive } = get();
    if (stage > unlockedStages) return;

    // 档案边界检查：不允许跨档案跳转
    if (currentArchive === '404' && stage > ARCHIVE_RANGES['404'].max) return;
    if (currentArchive === '102' && (stage < ARCHIVE_RANGES['102'].min || stage > ARCHIVE_RANGES['102'].max)) return;

    const stageData = MEMORY_STAGES[stage - 1];
    set((state) => ({
      ...state,
      currentStage: stage,
      backlashActive: stageData.requiresBacklash,
      backlashRestoring: [],
    }));
  },

  questionWord: (wordId: string) =>
    set((state) => ({
      questionedWords: { ...state.questionedWords, [wordId]: true },
    })),

  revealWord: (wordId: string) => {
    const { revealedWords, sanity } = get();
    if (revealedWords[wordId]) return;

    const newRevealed = { ...revealedWords, [wordId]: true };
    const newSanity = Math.max(0, sanity - SANITY.REVEAL_COST);

    set({
      revealedWords: newRevealed,
      sanity: newSanity,
    });
  },

  /** System won the backlash: remove word from revealed set + heavy sanity penalty */
  unrevealWord: (wordId: string) => {
    const { revealedWords, sanity } = get();
    if (!revealedWords[wordId]) return;

    const newRevealed = { ...revealedWords };
    delete newRevealed[wordId];
    const newSanity = Math.max(0, sanity - SANITY.REVEAL_COST * 2);

    set({
      revealedWords: newRevealed,
      sanity: newSanity,
    });
  },

  completeStage: () => {
    const { currentStage, stageCompleted, unlockedStages, currentArchive } = get();
    const idx = currentStage - 1;
    if (idx < 0 || idx >= TOTAL_STAGES) return;

    const newCompleted = [...stageCompleted];
    newCompleted[idx] = true;

    // 解锁逻辑：同档案内下一关
    let nextUnlock = unlockedStages;
    if (currentArchive === '404' && currentStage < ARCHIVE_RANGES['404'].max) {
      nextUnlock = Math.max(unlockedStages, currentStage + 1);
    } else if (currentArchive === '102' && currentStage < ARCHIVE_RANGES['102'].max) {
      nextUnlock = Math.max(unlockedStages, currentStage + 1);
    }

    set((state) => ({
      ...state,
      stageCompleted: newCompleted,
      unlockedStages: Math.min(nextUnlock, TOTAL_STAGES),
    }));
  },

  triggerBacklash: () => set({ backlashActive: true }),

  startRestoringWord: (wordId: string) =>
    set((state) => ({
      backlashRestoring: [...state.backlashRestoring, wordId],
    })),

  endRestoringWord: (wordId: string) =>
    set((state) => ({
      backlashRestoring: state.backlashRestoring.filter((id) => id !== wordId),
    })),

  overrideBacklash: () =>
    set((state) => ({
      overrideAttempts: state.overrideAttempts + 1,
      backlashActive: false,
      backlashRestoring: [],
      sanity: Math.max(0, state.sanity - SANITY.OVERRIDE_COST),
    })),

  addInterrogation: (entry: InterrogationEntry) =>
    set((state) => ({
      interrogationHistory: [...state.interrogationHistory, entry],
    })),

  goToEnding: () => set({ currentStage: TOTAL_STAGES + 1, gameEnded: true }),
}));

// ── Selector helpers ──
export function getCurrentStageData() {
  const { currentStage } = useGameStore.getState();
  if (currentStage < 1 || currentStage > TOTAL_STAGES) return null;
  return MEMORY_STAGES[currentStage - 1];
}

/** 获取当前档案的最后一关编号 */
export function getCurrentArchiveLastStage(): number | null {
  const { currentArchive } = useGameStore.getState();
  if (!currentArchive) return null;
  return ARCHIVE_RANGES[currentArchive].max;
}

export function getRevealedCountForStage(stageId: number): number {
  const { revealedWords } = useGameStore.getState();
  const stage = MEMORY_STAGES[stageId - 1];
  if (!stage) return 0;
  return stage.wordMappings.filter((w) => revealedWords[w.id]).length;
}

export function isStageComplete(stageId: number): boolean {
  const stage = MEMORY_STAGES[stageId - 1];
  if (!stage) return false;
  return getRevealedCountForStage(stageId) === stage.wordCount;
}
