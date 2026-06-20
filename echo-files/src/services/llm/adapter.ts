/* ============================================================
   ECHO FILES — LLM Adapter (Pluggable)
   ============================================================
   Default adapter: DeepSeekAdapter (deepseek-v4-pro via API)
   Fallback: MockLiar (auto-invoked when DeepSeek is unreachable)

   To switch adapters at runtime:
     setAdapter(mockLiar)        → back to local mock
     setAdapter(deepseekAdapter) → back to DeepSeek API
   ============================================================ */

import type { LLMAdapter } from './types';
import { mockLiar } from './mockLiar';
import { deepseekAdapter } from './deepseekAdapter';

// ── Active adapter (can be hot-swapped at runtime) ──
let activeAdapter: LLMAdapter = deepseekAdapter;

/**
 * Get the currently active LLM adapter.
 */
export function getAdapter(): LLMAdapter {
  return activeAdapter;
}

/**
 * Replace the active adapter (e.g. swap MockLiar for OpenAIAdapter).
 */
export function setAdapter(adapter: LLMAdapter): void {
  activeAdapter = adapter;
  console.info(`[LLM] Adapter switched to: ${adapter.name}`);
}

/**
 * Convenience: interrogate through the active adapter.
 */
export async function interrogateAI(
  ...args: Parameters<LLMAdapter['interrogate']>
): ReturnType<LLMAdapter['interrogate']> {
  return activeAdapter.interrogate(...args);
}

/**
 * Convenience: get a system warning through the active adapter.
 */
export function getWarning(
  ...args: Parameters<LLMAdapter['getWarning']>
): ReturnType<LLMAdapter['getWarning']> {
  return activeAdapter.getWarning(...args);
}

// ── Export types for consumers ──
export type { LLMAdapter, LLMRequest } from './types';
