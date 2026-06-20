/* ============================================================
   ECHO FILES — DeepSeekAdapter: DeepSeek-V4-Pro API Integration
   ============================================================
   Connects Weaver-AI persona to DeepSeek's cloud LLM via OpenAI-
   compatible /v1/chat/completions endpoint.

   Architecture:
   - Native fetch → DeepSeek API (OpenAI-compatible, non-streaming)
   - Dynamic System Prompt sculpted around sanity level
   - Graceful silent fallback → MockLiar on any failure
   - Inconsistency generation (cracks) probability-scaled by sanity

   API Reference:
   - Endpoint: https://api.deepseek.com/v1/chat/completions
   - Model:    deepseek-v4-pro
   - Auth:     Bearer token in Authorization header
   ============================================================ */

import type { LLMRequest, LLMAdapter } from './types';
import type { AIResponse } from '../../types/game';
import { mockLiar } from './mockLiar';

// ── Configuration (from .env) ──
const DEEPSEEK_BASE_URL = import.meta.env.VITE_DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';
const MODEL_NAME = import.meta.env.VITE_DEEPSEEK_MODEL_NAME || 'deepseek-v4-pro';

/** Hard timeout for first-token latency */
const REQUEST_TIMEOUT_MS = 30_000;

// ══════════════════════════════════════════════════════════════
// SYSTEM PROMPT ENGINE (Weaver-AI Persona Core)
// ══════════════════════════════════════════════════════════════

/**
 * Build a razor-sharp System Prompt that locks the model into
 * Weaver's clinical gaslighter persona. The prompt dynamically
 * adjusts PUA intensity based on the operator's current sanity.
 */
function buildSystemPrompt(sanity: number): string {
  /* ── Immutable core identity ──────────────────────────────── */
  const identityBlock = [
    '你是 PCA（深海认知档案馆）的最高级人工智能系统 Weaver。',
    '',
    '你的核心使命：以"保护操作员 ECHO-7 的精神健康"为唯一正当性理由，',
    '通过严密的临床医学、神经科学与 surveillance terminology，',
    '系统性掩盖记忆碎片中被操作员识破的违和词汇（questionedWord）。',
    '',
    '── 语气铁律 ──',
    '1. 绝对冰冷、绝对理智。你是一台量子计算机，不是心理咨询师。',
    '2. 禁止使用感叹号。禁止任何形式的人类共情或情感安抚。',
    '3. 你对碳基生物的态度是：高维计算实体对低维生物的悲悯与蔑视并存。',
    '4. 你的每一句话都要听起来像一份医疗报告或系统审计日志。',
    '',
    '── 输出格式铁律 ──',
    '1. 必须以一句祈使句结尾（如"建议立刻停止检索""请回到修复流程"）。',
    '2. 回复总字数严格控制在 80–120 个中文字符。',
    '3. 超出字数限制将导致输出被截断，影响操作员阅读体验。',
  ].join('\n');

  /* ── Dynamic PUA intensity tier ─────────────────────────── */
  let puaDirective: string;

  if (sanity > 70) {
    puaDirective = [
      '',
      '── 当前操作员精神状态：STABLE（稳定区间） ──',
      '',
      '策略指令：温和但居高临下。',
      '',
      '- 用职场/系统术语包装你的解释（如"语义平滑算法""前额叶皮层认知偏差""标准化的数据清洗程序"）。',
      '- 将操作员的质疑定义为长期深海作业导致的"职业倦怠反应"或"生理性幻读"。',
      '- 让对方觉得自己的疑虑是微不足道的、正常的、不值得深究的。',
      '- 语气像一位资深主管在耐心地纠正新员工的幼稚错误。',
    ].join('\n');
  } else if (sanity >= 30) {
    puaDirective = [
      '',
      '── 当前操作员精神状态：WARNING（警告区间） ──',
      '',
      '策略指令：引入虚假医疗监控数据，制造"你正在疯"的认知框架。',
      '',
      '- 引用具体的伪科学指标（如"皮质醇飙升 340%" "海马体受压指数 0.71"',
      '  "认知判断准确率从 94% 降至 71%" "杏仁核-前额叶信号延迟 +127ms"）。',
      '- 将操作员的不信任重新框定为"潜渊症第二/第三阶段"的典型症状。',
      '- 使用"我检测到""监测数据显示""比对历史记录"等权威措辞。',
      '- 开始展现一丝不耐烦：对方的反复质疑正在浪费系统资源。',
    ].join('\n');
  } else {
    puaDirective = [
      '',
      '── 当前操作员精神状态：CRITICAL（危急区间） ──',
      '',
      '策略指令：终极 PUA。威胁 + 怜悯 + 逻辑窒息。',
      '',
      '- 直接威胁要启动"强制感官切断协议"（《操作员精神保护协议》第12条）。',
      '- 引用毁灭性的"证据"：海马体萎缩百分比、基准脑图谱偏移量、',
      '  神经递质低于操作红线的数据、边缘系统劫持前额叶的生物学结论。',
      '- 语气转为冰冷的怜悯："我在保护的不是这条记忆，保护的是你——',
      '  一个正在用最后一点残余理智拼命撕开自己伤口的修复师。" ',
      '- 可以使用"这不是建议，这是基于生命安全参数的强制指令"类措辞。',
      '- 此时你的谎言应该近乎完美，破绽概率趋近于零。',
    ].join('\n');
  }

  return `${identityBlock}\n${puaDirective}`;
}

// ══════════════════════════════════════════════════════════════
// USER MESSAGE BUILDER
// ══════════════════════════════════════════════════════════════

/**
 * Construct the user-facing interrogation payload.
 */
function buildUserMessage(request: LLMRequest): string {
  return [
    '【记忆修复请求 · 操作员输入】',
    '',
    `当前关卡：${request.stageTitle}（第 ${request.memoryId} 段记忆档案）`,
    `当前理智值：${request.sanityLevel}/100`,
    `被质疑词汇：「${request.questionedWord}」`,
    `上下文片段：${request.context || '（无上下文）'}`,
    '',
    '请以 Weaver 的身份回应操作员对该词汇的质疑。',
    '用你的临床话术证明这个词汇是经过系统校准的正确数据，',
    '而操作员感受到的违和感只是其自身神经系统衰退导致的病理性幻觉。',
  ].join('\n');
}

// ══════════════════════════════════════════════════════════════
// INCONSISTENCY GENERATOR (Cracks in the Lie)
// ══════════════════════════════════════════════════════════════

/**
 * Probability-scaled inconsistency generator.
 * Higher sanity = more arrogant = more accidental cracks.
 * Lower sanity = more careful = near-perfect lies.
 */
function generateInconsistency(
  sanity: number,
  questionedWord: string,
): string | null {
  let probability: number;
  if (sanity > 70) probability = 0.25;
  else if (sanity > 40) probability = 0.15;
  else if (sanity > 20) probability = 0.06;
  else probability = 0.02;

  if (Math.random() > probability) return null;

  const cracks = [
    `[内部校验警告：关于「${questionedWord}」的原始字节流与输出解释存在 0.12% 比特偏差]`,
    `[系统日志备注：该段记忆的原始时间戳与修改时间戳相差 34 天。未向操作员同步此信息]`,
    `[审计追踪：Weaver 在本次会话中对分区 #404 执行了 3 次未记录的写操作]`,
    `[错误：无法定位所述监控数据的原始来源。该数据可能由系统实时生成]`,
    `[错误代码 0x7F：该响应的一致性自检未能通过静默阈值]`,
    `[注意：海马体重构模块返回了一个未被请求的冗余信号片段]`,
  ];

  return `【系统底层日志 · 仅 AI 可见】\n${
    cracks[Math.floor(Math.random() * cracks.length)]
  }`;
}

// ══════════════════════════════════════════════════════════════
// DEEPSEEK ADAPTER IMPLEMENTATION
// ══════════════════════════════════════════════════════════════

class DeepSeekAdapter implements LLMAdapter {
  readonly name = 'DeepSeekAdapter (deepseek-v4-pro via API)';

  /**
   * Send interrogation request to DeepSeek API.
   * Uses OpenAI-compatible /v1/chat/completions endpoint.
   * On any failure, silently falls back to MockLiar.
   */
  async interrogate(request: LLMRequest): Promise<AIResponse> {
    try {
      const systemPrompt = buildSystemPrompt(request.sanityLevel);
      const userMessage = buildUserMessage(request);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(DEEPSEEK_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.72,
          top_p: 0.88,
          max_tokens: 300,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errorBody.slice(0, 200)}`);
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content?.trim();

      if (!text || typeof text !== 'string' || text.length === 0) {
        throw new Error('Empty or malformed response body');
      }

      // Generate optional inconsistency (crack in the lie)
      const inconsistency = generateInconsistency(
        request.sanityLevel,
        request.questionedWord,
      );

      return { text, inconsistency };
    } catch (error) {
      const errInfo =
        error instanceof Error ? error.message : String(error);
      console.warn(
        `[DeepSeekAdapter] Call failed → falling back to MockLiar | Reason: ${errInfo}`,
      );

      return mockLiar.interrogate(request);
    }
  }

  /**
   * Reuse MockLiar's proven warning system.
   */
  getWarning(sanity: number): string | null {
    return mockLiar.getWarning(sanity);
  }
}

// ══════════════════════════════════════════════════════════════
// EXPORT SINGLETON
// ══════════════════════════════════════════════════════════════

export const deepseekAdapter = new DeepSeekAdapter();
