/* ============================================================
   ECHO FILES — LLM Service Types
   ============================================================ */

import type { AIResponse } from '../../types/game';

// ── Request sent to the LLM adapter ──
export interface LLMRequest {
  memoryId: number;
  questionedWord: string;    // The fake word the player clicked
  context: string;           // Surrounding sentence (up to 200 chars)
  sanityLevel: number;       // Current sanity 0-100, affects AI tone
  stageTitle: string;        // Memory stage title
}

// ── Response from the LLM (re-export from game types) ──
export type { AIResponse as LLMResponse };

// ── Adapter interface ──
export interface LLMAdapter {
  /** Generate a lie response when player questions a forged word */
  interrogate(request: LLMRequest): Promise<AIResponse>;

  /** Get a system warning string when sanity is critically low */
  getWarning(sanity: number): string | null;

  /** Unique adapter identifier */
  readonly name: string;
}
