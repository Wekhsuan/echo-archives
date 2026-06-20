/* ============================================================
   ECHO FILES — Game Constants
   ============================================================ */

// ── Sanity Thresholds ──
export const SANITY = {
  MAX: 100,
  INITIAL: 100,
  // UI degradation triggers
  DEGRADE_LIGHT: 70,   // Subtle chromatic aberration
  DEGRADE_MEDIUM: 45,  // Text skew + cursor trail
  DEGRADE_HEAVY: 25,   // Glitch flashes + AI warns
  DEGRADE_CRITICAL: 10, // Extreme glitch
  // Per-reveal sanity cost
  REVEAL_COST: 8,
  // Override command cost
  OVERRIDE_COST: 3,
} as const;

// ── Backlash Config ──
export const BACKLASH = {
  ENABLED_STAGES: [4, 5],           // Stages with active backlash
  RESTORE_DELAY_MIN: 2000,          // ms before first restore
  RESTORE_DELAY_MAX: 4000,          // ms
  RESTORE_COUNT_MAX: 3,             // Max restore attempts per word
  OVERRIDE_COMMAND: 'OV',           // Terminal command to suppress (shortened for HCI)
  OVERRIDE_WINDOW: 4500,            // ms window to type command (extended from 3000)
} as const;

// ── Typing Speed ──
export const TYPING = {
  BASE_SPEED: 40,      // ms per char
  FAST_SPEED: 20,
  SLOW_SPEED: 70,
  CURSOR_BLINK: 530,   // ms
} as const;

// ── AI Response Delay Range (ms) ──
export const AI = {
  THINK_MIN: 800,
  THINK_MAX: 2200,
  TYPING_SPEED: 38,    // ms per char for terminal output (slowed from 25 for readability)
} as const;

// ── Memory Stage Config ──
export const STAGES = [
  { id: 1, title: '裂痕', unlocksAt: 0 },
  { id: 2, title: '逃亡', unlocksAt: 1 },
  { id: 3, title: '审讯', unlocksAt: 2 },
  { id: 4, title: '倒戈', unlocksAt: 3 },
  { id: 5, title: '归零', unlocksAt: 4 },
  // ★ 档案 #102：深渊回响（Stage 6-10）★
  { id: 6, title: '阳光温室', unlocksAt: 5 },
  { id: 7, title: '杂音', unlocksAt: 6 },
  { id: 8, title: '失控', unlocksAt: 7 },
  { id: 9, title: '深渊边缘', unlocksAt: 8 },
  { id: 10, title: '深渊回响', unlocksAt: 9 },
] as const;
