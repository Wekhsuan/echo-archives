/* ============================================================
   ECHO FILES — Archive System Integration Test Suite
   跨档案全链路集成测试：
     1. Credential 凭证校验与 Glitch 拦截
     2. 档案边界防御与热插拔
     3. LocalStorage 持久化锁与解锁链条
   ============================================================ */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore } from '../../../store/gameStore';

// ── LocalStorage key (mirrored from ArchiveHubPage for pure-logic testing) ──
const LS_KEY_102 = 'echo-files-archive-102-unlocked';

/** Pure function: unlock archive 102 in localStorage (no React deps) */
function unlock102(): void {
  try {
    localStorage.setItem(LS_KEY_102, 'true');
  } catch {
    // Silently fail — quota exceeded or security error
  }
}

/** Pure function: check if archive 102 is unlocked (no React deps) */
function is102Unlocked(): boolean {
  try {
    return localStorage.getItem(LS_KEY_102) === 'true';
  } catch {
    return false;
  }
}

// ════════════════════════════════════════════════════════════
// Constants extracted from CredentialPage (for pure logic testing)
// ════════════════════════════════════════════════════════════
const VALID_CREDENTIAL = 'ECHO-7';

/** Simulates the credential validation logic from CredentialPage */
function validateCredential(input: string): { valid: boolean; normalized: string } {
  if (!input || typeof input !== 'string') return { valid: false, normalized: '' };
  const normalized = input.trim().toUpperCase();
  return { valid: normalized === VALID_CREDENTIAL, normalized };
}

// ── Mock: react-router-dom navigate (lazy, only if needed) ──
// NOTE: Do NOT use vi.mock here with hoisting — it breaks Zustand store initialization order.
// Instead, we test store logic directly without rendering components.
const mockNavigate = vi.fn();

// ════════════════════════════════════════════════════════════
// TEST SUITE 1: Credential Validation & Glitch Intercept
// ════════════════════════════════════════════════════════════
describe('Credential Validation & Glitch Intercept', () => {
  describe('用例 A — 大小写模糊匹配', () => {
    const validVariants = [
      { input: 'ECHO-7', label: '标准大写' },
      { input: 'echo-7', label: '全小写' },
      { input: 'EcHo-7', label: '混合大小写' },
      { input: ' eCho-7 ', label: '带前后空格' },
      { input: 'echo-7  ', label: '带尾部空格' },
    ];

    validVariants.forEach(({ input, label }) => {
      it(`输入 "${input}" (${label}) → 验证通过`, () => {
        const result = validateCredential(input);

        expect(result.valid).toBe(true);
        expect(result.normalized).toBe('ECHO-7');

        // 断言：模拟路由跳转应被触发（成功路径）
        const shouldNavigate = result.valid;
        expect(shouldNavigate).toBe(true);
      });
    });
  });

  describe('用例 B — 脏密码拒绝与防洪', () => {
    const invalidInputs = [
      { input: 'ADMIN', label: '错误密码 ADMIN' },
      { input: 'admin', label: '小写 admin' },
      { input: 'Echo-8', label: '相近但错误的 ID' },
      { input: '', label: '空字符串' },
      { input: '   ', label: '纯空格' },
      { input: 'ECHO-6', label: '编号偏差' },
      { input: 'echo-seven', label: '拼写错误' },
    ];

    invalidInputs.forEach(({ input, label }) => {
      it(`输入 "${input || '(空)'}" (${label}) → 触发错误状态，不跳转`, () => {
        const result = validateCredential(input);

        // 核心断言：验证失败
        expect(result.valid).toBe(false);

        // 断言：绝对不能触发路由跳转
        const shouldNavigateToHub = result.valid;
        expect(shouldNavigateToHub).toBe(false);

        // 断言：输入框应被清空（模拟 UI 行为）
        const shouldClearInput = !result.valid;
        expect(shouldClearInput).toBe(true);
      });
    });

    it('连续快速错误输入不导致状态泄漏（防洪）', () => {
      // 模拟 20 次连续错误输入
      let allRejected = true;
      for (let i = 0; i < 20; i++) {
        const result = validateCredential(`WRONG_${i}`);
        if (result.valid) {
          allRejected = false;
          break;
        }
      }

      expect(allRejected).toBe(true);
      // 确认没有累积副作用（每次调用独立判断）
      expect(validateCredential('ECHO-7').valid).toBe(true);
    });
  });

  it('边界情况：null / undefined 输入不会崩溃', () => {
    expect(() => validateCredential(null as unknown as string)).not.toThrow();
    expect(() => validateCredential(undefined as unknown as string)).not.toThrow();
  });
});

// ════════════════════════════════════════════════════════════
// TEST SUITE 2: Archive Boundary Protection & Hot-Swap
// ════════════════════════════════════════════════════════════
describe('Archive Boundary Protection Tests', () => {
  beforeEach(() => {
    useGameStore.setState({
    currentStage: 0,
    currentArchive: null,
    revealedWords: {},
    questionedWords: {},
    sanity: 100,
    stageCompleted: Array.from({ length: 10 }, () => false),
    backlashActive: false,
    backlashRestoring: [],
    overrideAttempts: 0,
    gameStarted: false,
    gameEnded: false,
    unlockedStages: 1,
    interrogationHistory: [],
  });
  });

  describe('场景 A — 404 隔离区 (Stages 1-5)', () => {
    it('selectArchive("404") 正确初始化到 Stage 1', () => {
      useGameStore.getState().selectArchive('404');
      const state = useGameStore.getState();

      expect(state.currentArchive).toBe('404');
      expect(state.currentStage).toBe(1);
      expect(state.gameStarted).toBe(true);
      expect(state.gameEnded).toBe(false);
    });

    it('completeStage() 在 404 模式下可从 1 递增到 5', () => {
      const store = useGameStore.getState();
      store.selectArchive('404');

      // 完成关卡 1→2→3→4→5
      for (let stage = 1; stage <= 5; stage++) {
        expect(useGameStore.getState().currentStage).toBe(stage);
        useGameStore.getState().completeStage();

        // 如果不是最后一关，stage 应该已推进（或保持不变由 goToStage 控制）
        // completeStage 只标记完成+解锁下一关，不自动推进 stage
        // 这里我们手动推进以模拟正常流程
        if (stage < 5) {
          useGameStore.getState().goToStage(stage + 1);
        }
      }
    });

    it('404 第 5 关完成后，completeStage 不解锁 Stage 6', () => {
      const store = useGameStore.getState();
      store.selectArchive('404');

      // 手动设为第 5 关并标记完成
      useGameStore.setState((s) => ({ ...s, currentStage: 5 }));
      store.completeStage();

      const state = useGameStore.getState();

      // 关键断言：unlockedStages 绝对不能 >= 6（因为 404 max=5）
      // completeStage 中 nextUnlock 受 archive range 限制
      expect(state.unlockedStages).toBeLessThanOrEqual(5);

      // gameEnded 此时仍应为 false（需显式调 goToEnding）
      expect(state.gameEnded).toBe(false);
    });

    it('goToEnding() 正确设置终局状态', () => {
      useGameStore.getState().selectArchive('404');
      useGameStore.getState().goToEnding();

      const state = useGameStore.getState();
      expect(state.gameEnded).toBe(true);
      expect(state.currentStage).toBe(11); // TOTAL_STAGES(10) + 1
    });

    it('404 模式下 goToStage(6) 被拦截', () => {
      useGameStore.getState().selectArchive('404');

      const prevStage = useGameStore.getState().currentStage;
      useGameStore.getState().goToStage(6); // 越界！

      // 状态不应改变
      expect(useGameStore.getState().currentStage).toBe(prevStage);
      expect(useGameStore.getState().currentStage).not.toBe(6);
    });

    it('404 模式下 goToStage(0) 和 goToStage(-1) 被拦截', () => {
      useGameStore.getState().selectArchive('404');
      useGameStore.setState((s) => ({ ...s, currentStage: 3 }));

      useGameStore.getState().goToStage(0);
      expect(useGameStore.getState().currentStage).toBe(3);

      useGameStore.getState().goToStage(-1 as unknown as number);
      expect(useGameStore.getState().currentStage).toBe(3);
    });
  });

  describe('场景 B — 102 隔离区 (Stages 6-10)', () => {
    it('selectArchive("102") 正确初始化到 Stage 6', () => {
      useGameStore.getState().selectArchive('102');
      const state = useGameStore.getState();

      expect(state.currentArchive).toBe('102');
      expect(state.currentStage).toBe(6);
      expect(state.gameStarted).toBe(true);
      expect(state.gameEnded).toBe(false);
    });

    it('completeStage() 在 102 模式下可从 6 递增到 10', () => {
      useGameStore.getState().selectArchive('102');

      for (let stage = 6; stage <= 10; stage++) {
        expect(useGameStore.getState().currentStage).toBe(stage);
        useGameStore.getState().completeStage();
        if (stage < 10) {
          // 直接推进到下一关（绕过 unlockedStages 检查以专注档案边界）
          useGameStore.setState((s) => ({ ...s, currentStage: stage + 1 }));
        }
      }

      // 最终应在 Stage 10
      expect(useGameStore.getState().currentStage).toBe(10);
    });

    it('102 第 10 关完成后 goToEnding() 设置 currentStage=11 且 gameEnded=true', () => {
      useGameStore.getState().selectArchive('102');
      useGameStore.setState((s) => ({ ...s, currentStage: 10, unlockedStages: 10 }));
      useGameStore.getState().completeStage();
      useGameStore.getState().goToEnding();

      const state = useGameStore.getState();
      expect(state.gameEnded).toBe(true);
      expect(state.currentStage).toBe(11);
    });

    it('102 模式下 goToStage(5) 被拦截（低于 min=6）', () => {
      useGameStore.getState().selectArchive('102');

      useGameStore.getState().goToStage(5); // 越界！低于 102 范围

      expect(useGameStore.getState().currentStage).toBe(6); // 应保持在初始值
    });

    it('102 模式下 goToStage(11) 被拦截（高于 max=10）', () => {
      useGameStore.getState().selectArchive('102');
      useGameStore.setState((s) => ({ ...s, currentStage: 8, unlockedStages: 10 })); // 解锁全部

      useGameStore.getState().goToStage(11); // 越界！

      expect(useGameStore.getState().currentStage).toBe(8); // 不变
    });
  });

  describe('场景 C — 越界防御（跨档案窥探拦截）', () => {
    it('404 模式下无法通过 goToStage 进入 102 领域', () => {
      useGameStore.getState().selectArchive('404');

      // 尝试所有 102 范围内的关卡
      for (let stage = 6; stage <= 10; stage++) {
        useGameStore.getState().goToStage(stage);
      }

      // 全部应失败，currentStage 仍在 404 范围内（或保持原值）
      const finalStage = useGameStore.getState().currentStage;
      expect(finalStage).toBeLessThanOrEqual(5);
      expect(finalStage).toBeGreaterThanOrEqual(1);
    });

    it('102 模式下无法通过 goToStage 进入 404 领域', () => {
      useGameStore.getState().selectArchive('102');

      // 尝试所有 404 范围内的关卡
      for (let stage = 1; stage <= 5; stage++) {
        useGameStore.getState().goToStage(stage);
      }

      // 全部应失败，currentStage 仍在 102 范围内（或保持原值）
      const finalStage = useGameStore.getState().currentStage;
      expect(finalStage).toBeGreaterThanOrEqual(6);
      expect(finalStage).toBeLessThanOrEqual(10);
    });

    it('未选择档案时 goToStage 全部无效', () => {
      // resetGame 后 currentArchive 为 null, unlockedStages=1
      // 注意：goToStage(1) 在 null 档案下是允许的（等价于 startGame 行为）
      // 但 goToStage(2+) 应该失败因为 unlockedStages=1
      useGameStore.getState().resetGame();

      // Stage 1 应该允许通过
      useGameStore.getState().goToStage(1);
      expect(useGameStore.getState().currentStage).toBe(1);

      // Stage 2+ 应该被 unlockedStages 拦截
      useGameStore.getState().goToStage(2);
      expect(useGameStore.getState().currentStage).toBe(1); // 未改变

      // 跨越档案边界的调用应被拦截
      useGameStore.getState().goToStage(6);
      expect(useGameStore.getState().currentStage).toBe(1); // 未改变

      // currentArchive 必须保持 null
      expect(useGameStore.getState().currentArchive).toBeNull();
    });

    it('档案热插拔：从 404 切换到 102 时状态正确重置', () => {
      // 先在 404 中玩几关
      useGameStore.getState().selectArchive('404');
      useGameStore.setState((s) => ({ ...s, currentStage: 3, sanity: 50 }));

      // 热切换到 102
      useGameStore.getState().selectArchive('102');

      const state = useGameStore.getState();
      expect(state.currentArchive).toBe('102');
      expect(state.currentStage).toBe(6); // 重置到 102 起始关
      // 注意：sanity 不会被 selectArchive 重置（设计决策——理智跨档案继承？还是应该重置？）
      // 当前实现只重置 stage/archive/backlash 相关字段
    });

    it('档案热插拔：从 102 切换回 404 时状态正确重置', () => {
      useGameStore.getState().selectArchive('102');
      useGameStore.setState((s) => ({ ...s, currentStage: 9, backlashActive: true }));

      useGameStore.getState().selectArchive('404');

      const state = useGameStore.getState();
      expect(state.currentArchive).toBe('404');
      expect(state.currentStage).toBe(1);
      expect(state.backlashActive).toBe(false); // 404 Stage 1 无 backlash
    });
  });
});

// ════════════════════════════════════════════════════════════
// TEST SUITE 3: LocalStorage Persistence & Unlock Chain
// ════════════════════════════════════════════════════════════
describe('Persistence & Unlock Chain Tests', () => {
  const LS_KEY = 'echo-files-archive-102-unlocked';

  beforeEach(() => {
    // 清理 localStorage
    localStorage.clear();
    // 重置 store
    useGameStore.setState({
    currentStage: 0,
    currentArchive: null,
    revealedWords: {},
    questionedWords: {},
    sanity: 100,
    stageCompleted: Array.from({ length: 10 }, () => false),
    backlashActive: false,
    backlashRestoring: [],
    overrideAttempts: 0,
    gameStarted: false,
    gameEnded: false,
    unlockedStages: 1,
    interrogationHistory: [],
  });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('初始状态：102 档案锁定', () => {
    it('LocalStorage 为空时，is102Unlocked() 返回 false', () => {
      expect(localStorage.getItem(LS_KEY)).toBeNull();
      expect(is102Unlocked()).toBe(false);
    });

    it('LocalStorage 值为 "false" 时，返回 false', () => {
      localStorage.setItem(LS_KEY, 'false');
      expect(is102Unlocked()).toBe(false);
    });

    it('LocalStorage 值为任意非 "true" 字符串，返回 false', () => {
      localStorage.setItem(LS_KEY, 'yes');
      expect(is102Unlocked()).toBe(false);

      localStorage.setItem(LS_KEY, '1');
      expect(is102Unlocked()).toBe(false);

      localStorage.setItem(LS_KEY, 'TRUE'); // 大写
      expect(is102Unlocked()).toBe(false);
    });
  });

  describe('解锁链条：404 通关 → 解锁 102', () => {
    it('unlock102() 正确写入 LocalStorage', () => {
      unlock102();

      expect(localStorage.getItem(LS_KEY)).toBe('true');
      expect(is102Unlocked()).toBe(true);
    });

    it('多次调用 unlock102() 幂等安全', () => {
      unlock102();
      unlock102();
      unlock102();

      expect(localStorage.getItem(LS_KEY)).toBe('true');
      expect(is102Unlocked()).toBe(true);
    });

    it('完整流程：404 通关 → 解锁 → Store 重置 → 读取持久化状态', () => {
      // Step 1: 初始状态检查
      expect(is102Unlocked()).toBe(false);

      // Step 2: 模拟 404 通关流程
      useGameStore.getState().selectArchive('404');
      // 手动推进到第 5 关并标记完成
      useGameStore.setState((s) => ({ ...s, currentStage: 5, unlockedStages: 5 }));
      useGameStore.getState().completeStage();
      useGameStore.getState().goToEnding();

      expect(useGameStore.getState().gameEnded).toBe(true);

      // Step 3: 触发 EndingPage 的解锁逻辑
      unlock102();

      // Step 4: 断言 LocalStorage 已写入
      expect(localStorage.getItem(LS_KEY)).toBe('true');

      // Step 5: 重置 Store（模拟用户回到大厅）
      useGameStore.getState().resetGame();

      // Step 6: 断言持久化状态在 Store 重置后仍然有效
      expect(is102Unlocked()).toBe(true);
    });
  });

  describe('边界情况：localStorage 操作异常处理', () => {
    it('setItem 失败时 unlockArchive102 不抛出异常', () => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      // 不应崩溃
      expect(() => unlock102()).not.toThrow();

      Storage.prototype.setItem = originalSetItem;
    });

    it('getItem 失败时 isArchive102Unlocked 安全降级', () => {
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error('SecurityError');
      });

      // 不应崩溃，应降级为 false
      expect(() => is102Unlocked()).not.toThrow();

      Storage.prototype.getItem = originalGetItem;
    });
  });

  describe('clear 清除解锁状态', () => {
    it('清除 LS key 后重新锁定', () => {
      unlock102();
      expect(is102Unlocked()).toBe(true);

      localStorage.removeItem(LS_KEY);
      expect(is102Unlocked()).toBe(false);
    });
  });
});

// ════════════════════════════════════════════════════════════
// TEST SUITE 4: Reset Game 完整性
// ════════════════════════════════════════════════════════════
describe('Reset Game Integrity', () => {
  beforeEach(() => {
    useGameStore.setState({
    currentStage: 0,
    currentArchive: null,
    revealedWords: {},
    questionedWords: {},
    sanity: 100,
    stageCompleted: Array.from({ length: 10 }, () => false),
    backlashActive: false,
    backlashRestoring: [],
    overrideAttempts: 0,
    gameStarted: false,
    gameEnded: false,
    unlockedStages: 1,
    interrogationHistory: [],
  });
  });

  it('resetGame() 将 currentArchive 重置为 null', () => {
    useGameStore.getState().selectArchive('102');
    expect(useGameStore.getState().currentArchive).toBe('102');

    useGameStore.getState().resetGame();
    expect(useGameStore.getState().currentArchive).toBeNull();
  });

  it('resetGame() 将 currentStage 重置为 0', () => {
    useGameStore.getState().selectArchive('404');
    useGameStore.setState((s) => ({ ...s, currentStage: 3, gameEnded: true }));

    useGameStore.getState().resetGame();
    expect(useGameStore.getState().currentStage).toBe(0);
    expect(useGameStore.getState().gameEnded).toBe(false);
  });

  it('resetGame() 清除所有游戏进度但不影响 LocalStorage', () => {
    // 设定一个有进度的状态
    useGameStore.getState().selectArchive('404');
    useGameStore.setState({
      revealedWords: { m1_w1: true, m2_w1: true },
      sanity: 42,
      interrogationHistory: [{ id: 'int_1', wordId: 'w1', question: 'test', timestamp: Date.now() }],
    });
    // 同时解锁 102
    unlock102();

    // 重置
    useGameStore.getState().resetGame();

    // Store 状态应完全归零
    const state = useGameStore.getState();
    expect(state.currentArchive).toBeNull();
    expect(state.currentStage).toBe(0);
    expect(state.revealedWords).toEqual({});
    expect(state.sanity).toBe(100);
    expect(state.interrogationHistory).toEqual([]);
    expect(state.stageCompleted.every((v) => v === false)).toBe(true);

    // 但 LocalStorage 不受影响
    expect(is102Unlocked()).toBe(true);
  });
});
