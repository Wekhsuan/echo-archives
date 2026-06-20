/* ============================================================
   ECHO FILES — Core Type Definitions (Segment-Based)
   ============================================================ */

// ── Narrative Segment ──
// Each segment is either plain text or a fake-word anchor
export interface NarrativeSegment {
  text: string;
  wordMappingId?: string | null; // Links to WordMapping when this is a fake word
}

// ── Word Mapping: one fake→real pair ──
export interface WordMapping {
  id: string;
  fakeWord: string;
  realWord: string;
  revealHint: string;   // Subtle inconsistency hint shown on hover
}

// ── Interrogation Entry ──
export interface InterrogationEntry {
  id: string;
  wordId: string;
  question: string;
  timestamp: number;
}

// ── AI Response ──
export interface AIResponse {
  text: string;
  inconsistency: string | null;
}

// ── One Memory Stage ──
export interface MemoryStage {
  id: number;
  title: string;
  setting: string;
  narrative: NarrativeSegment[];
  wordMappings: WordMapping[];
  emotionAnchor: string;       // Physical object extracted
  requiresBacklash: boolean;
  preamble: string;
  // Computed at load time
  wordCount: number;           // Total fake words in this stage
}

// ── Game Progress ──
export interface GameState {
  currentStage: number;             // 0 = not started, 1-N = memory stage, N+1 = ending
  currentArchive: '404' | '102' | null;  // 当前选中的档案，null = 未选择
  revealedWords: Record<string, boolean>;   // wordMappingId → revealed
  questionedWords: Record<string, boolean>; // wordMappingId → questioned
  sanity: number;                   // 0-100, starts at 100
  stageCompleted: boolean[];        // index 0 = stage 1
  backlashActive: boolean;
  backlashRestoring: string[];      // wordIds currently being restored
  overrideAttempts: number;
  gameStarted: boolean;
  gameEnded: boolean;
  unlockedStages: number;           // 1-N (max = total stages)
  interrogationHistory: InterrogationEntry[];
}

// ── Store Actions ──
export interface GameActions {
  startGame: () => void;
  resetGame: () => void;
  selectArchive: (archive: '404' | '102') => void;
  goToStage: (stage: number) => void;
  questionWord: (wordId: string) => void;
  revealWord: (wordId: string) => void;
  unrevealWord: (wordId: string) => void;
  completeStage: () => void;
  triggerBacklash: () => void;
  startRestoringWord: (wordId: string) => void;
  endRestoringWord: (wordId: string) => void;
  overrideBacklash: () => void;
  addInterrogation: (entry: InterrogationEntry) => void;
  goToEnding: () => void;
}
