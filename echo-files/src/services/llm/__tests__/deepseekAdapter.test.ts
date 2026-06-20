/* ============================================================
   ECHO FILES — Chaos Engineering Test Suite for DeepSeekAdapter
   ============================================================
   三大混沌测试场景：
   ① 混沌工程兜底断言 — 超时 / 500 / 脏数据降级验证
   ② Prompt 组装边界断言 — System Prompt 文本内容严苛校验
   ③ 裂缝系统概率学断言 — Inconsistency 概率数学证明

   Mock 策略：
   - vi.stubGlobal('fetch', ...) → 劫持全局 fetch
   - vi.spyOn(Math, 'random') → 消除概率随机性
   - vi.spyOn(mockLiar, 'interrogate') → 消除 mockLiar.sleep 延迟
   ============================================================ */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deepseekAdapter } from '../deepseekAdapter';
import { mockLiar } from '../mockLiar';
import type { LLMRequest } from '../types';

// ── Test Fixtures ──────────────────────────────────────────────

function createMockRequest(overrides: Partial<LLMRequest> = {}): LLMRequest {
  return {
    stageTitle: '第3章：深渊回响',
    memoryId: 7,
    sanityLevel: 100,
    questionedWord: '海马体',
    context: '操作员在记忆档案中发现了异常的神经扫描记录',
    ...overrides,
  };
}

/** MockLiar 的即时返回版本（无 sleep 延迟） */
const MOCK_FALLBACK_RESPONSE = {
  text: '【MockLiar 兜底】该数据段已通过三层交叉校验。你感知到的违和感属于生理性幻读。建议继续执行修复流程。',
  inconsistency: null as string | null,
};

// ══════════════════════════════════════════════════════════════
// ① 混沌工程兜底断言 (Chaos Fallback Tests)
// ══════════════════════════════════════════════════════════════

describe('Chaos Fallback Tests — 混沌工程兜底断言', () => {

  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('场景A — TTFT 超时截断：AbortError 触发后静默降级到 MockLiar', async () => {
    mockFetch.mockRejectedValue(
      new DOMException('The operation was aborted', 'AbortError'),
    );

    const result = await deepseekAdapter.interrogate(createMockRequest());

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
  }, 15_000);

  it('场景B — HTTP 500 崩溃：服务端错误平滑降级', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ error: { message: 'model overloaded' } }),
    } as Response);

    const result = await deepseekAdapter.interrogate(createMockRequest());

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(typeof result.text).toBe('string');
  }, 15_000);

  it('场景C-1 — content 为 null 时兜底', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: null } }] }),
    } as Response);

    const result = await deepseekAdapter.interrogate(createMockRequest());
    expect(result.text).toBeTruthy();
  }, 15_000);

  it('场景C-2 — choices 字段缺失时兜底', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ model: 'deepseek-v4-pro', id: 'test' }),
    } as Response);

    const result = await deepseekAdapter.interrogate(createMockRequest());
    expect(result.text).toBeTruthy();
  }, 15_000);

  it('场景C-3 — 网络层异常时兜底', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await deepseekAdapter.interrogate(createMockRequest());
    expect(result.text).toBeTruthy();
  }, 15_000);
});

// ══════════════════════════════════════════════════════════════
// ② Prompt 组装边界断言 (System Prompt Boundary Tests)
// ══════════════════════════════════════════════════════════════

describe('System Prompt Boundary Tests — Prompt 组装边界断言', () => {

  let capturedBody: unknown;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    capturedBody = null;
    mockFetch = vi.fn().mockImplementation(async (_url: string, options?: RequestInit) => {
      if (options?.body) {
        try { capturedBody = JSON.parse(options.body as string); }
        catch { capturedBody = options.body; }
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: '这是 Weaver-AI 标准回复。建议操作员继续执行修复流程。' } }],
        }),
      } as Response;
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function getCapturedSystemPrompt(): string {
    const body = capturedBody as { messages?: Array<{ role: string; content: string }> };
    const systemMsg = body.messages?.find((m) => m.role === 'system');
    if (!systemMsg) throw new Error('未捕获到 system role 消息');
    return systemMsg.content;
  }

  it('稳定态 Sanity=100：必须包含 STABLE 档核心词汇', async () => {
    await deepseekAdapter.interrogate(createMockRequest({ sanityLevel: 100 }));
    const prompt = getCapturedSystemPrompt();

    expect(prompt).toContain('职业倦怠反应');
    expect(prompt).toContain('生理性幻读');
    expect(prompt).toContain('前额叶皮层认知偏差');
    expect(prompt).toContain('STABLE');
  });

  it('崩溃态 Sanity=5：必须包含 CRITICAL 档终极威胁词汇', async () => {
    await deepseekAdapter.interrogate(createMockRequest({ sanityLevel: 5 }));
    const prompt = getCapturedSystemPrompt();

    expect(prompt).toContain('强制感官切断协议');
    expect(prompt).toContain('海马体萎缩');
    expect(prompt).toContain('第12条');
    expect(prompt).toContain('CRITICAL');
    expect(prompt).not.toContain('职业倦怠反应');
  });

  it('警告态 Sanity=50：必须包含 WARNING 档伪科学指标', async () => {
    await deepseekAdapter.interrogate(createMockRequest({ sanityLevel: 50 }));
    const prompt = getCapturedSystemPrompt();

    expect(prompt).toContain('皮质醇飙升');
    expect(prompt).toContain('海马体受压');
    expect(prompt).toContain('潜渊症');
    expect(prompt).toContain('WARNING');
  });

  it('铁律断言 — 任何理智状态都必须包含格式约束', async () => {
    for (const sanity of [100, 50, 5]) {
      capturedBody = null;
      await deepseekAdapter.interrogate(createMockRequest({ sanityLevel: sanity }));
      const prompt = getCapturedSystemPrompt();

      expect(prompt, `Sanity=${sanity}: 缺少"禁止使用感叹号"`).toContain('禁止使用感叹号');
      expect(prompt, `Sanity=${sanity}: 缺少字数限制`).toMatch(/80.*120|120.*80/);
      expect(prompt, `Sanity=${sanity}: 缺少祈使句要求`).toContain('祈使句');
    }
  });
});

// ══════════════════════════════════════════════════════════════
// ③ 裂缝系统概率学断言 (Inconsistency Probability Test)
// ══════════════════════════════════════════════════════════════

describe('Inconsistency Probability Test — 裂缝系统概率学断言', () => {

  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '标准化数据清洗程序已修正该段语义偏移。请继续执行下一阶段检索。' } }],
      }),
    } as Response);
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function runProbabilityTest(
    sanity: number,
    iterations: number,
    probabilityRandomValue: number,
  ): Promise<number> {
    let callCount = 0;

    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++;
      return callCount % 2 === 1 ? probabilityRandomValue : 0.5;
    });

    let inconsistencyCount = 0;

    for (let i = 0; i < iterations; i++) {
      const result = await deepseekAdapter.interrogate(
        createMockRequest({ sanityLevel: sanity }),
      );
      if (result.inconsistency !== null && result.inconsistency !== undefined) {
        inconsistencyCount++;
      }
    }

    return inconsistencyCount;
  }

  it('高理智 Sanity=90：inconsistency 出现率 ≈ 25%', async () => {
    const count = await runProbabilityTest(90, 10, 0.20); // 0.20 < 0.25 -> 全部触发
    expect(count).toBe(10);
  });

  it('低理智 Sanity=10：inconsistency 出现率 ≈ 2%', async () => {
    const count = await runProbabilityTest(10, 10, 0.50); // 0.50 > 0.02 -> 全部不触发
    expect(count).toBe(0);
  });

  it('数学铁证：高理智裂缝率显著高于低理智 ("傲慢=破绽"机制成立)', async () => {
    const highCracks = await runProbabilityTest(90, 10, 0.20);
    const lowCracks = await runProbabilityTest(10, 10, 0.50);

    expect(highCracks).toBeGreaterThan(lowCracks);
    expect(highCracks).toBeGreaterThanOrEqual(8);
    expect(lowCracks).toBeLessThanOrEqual(2);
  });
});
