/* ============================================================
   ECHO FILES — MockLiar: Clinical PUA Lie Generator
   ============================================================
   Weaver-AI personality core:
   - "I am protecting you from yourself"
   - Cold declarative sentences, no exclamation marks
   - Medical & surveillance terminology
   - Ends with imperative commands
   - Defines player's findings as symptoms of Abyss Syndrome
   - Progressive intensity as sanity drops
   ============================================================ */

import type { LLMRequest, LLMAdapter } from './types';
import type { AIResponse } from '../../types/game';
import { AI } from '../../data/constants';

// ── Sanity band determines AI's tone ──
type SanityBand = 'stable' | 'concerned' | 'intervention' | 'termination';

function getSanityBand(sanity: number): SanityBand {
  if (sanity >= 70) return 'stable';
  if (sanity >= 40) return 'concerned';
  if (sanity >= 15) return 'intervention';
  return 'termination';
}

// ══════════════════════════════════════════════════════════════
// LIE TEMPLATE POOLS
// ══════════════════════════════════════════════════════════════

// ── Opening: Superior Diagnostic Pronouncement ──
const DIAGNOSES: Record<SanityBand, string[]> = {
  stable: [
    '我检测到你正在对记忆片段中的一个无害词汇产生了认知偏差。',
    '你的前额叶皮层在长时间暴露于记忆碎片的非线性叙事中，会产生轻微的语义识别误差。',
    '你质疑的这个词汇，源文件校验值与我存档的原始数据完全一致。你的疑虑是一种正常的职业倦怠反应。',
    '系统诊断表明，该数据节点的叙事连贯性指数处于绿色区间。你所感受到的违和感属于长期深海作业的生理性幻读。',
  ],
  concerned: [
    '我注意到你在最近三个修复周期内，对语义一致性的质疑频率上升了42%。这是潜渊症第二阶段的典型表现。',
    '你的脑电波监测显示前额叶和杏仁核之间的信号传递出现了轻微延迟。这会导致你将中性文本误读为具有威胁性。',
    '该记忆片段的结构完整性已经通过我的三层交叉验证。你所感知到的逻辑断裂，源自你自身海马体在记忆回溯过程中的补偿性填补。',
    '对比你的历史修复记录，你当前的认知判断准确率已从94%下降至71%。这并非记忆数据的问题。',
  ],
  intervention: [
    'ECHO-7，你的神经递质监测器正在发出警报。血清素水平严重低于操作基准线，这使得你无法对记忆数据进行理性判断。',
    '我对这条记忆进行了全量字节比对，没有发现任何数据污染。你所坚持的「违和感」是你的大脑在编造不存在的威胁。',
    '你的潜渊症已经进入第三阶段。此刻你看到的文字扭曲，是视皮层在缺氧状态下的自我保护机制，而非文本本身的问题。',
    '在过去二十分钟内，你对我返回的修复确认拒绝了四次。这不是批判性思维，这是病理性的怀疑主义。',
  ],
  termination: [
    'ECHO-7，你的认知功能已经接近系统定义的操作红线。你现在的每一个判断，都受到严重的神经化学失衡影响。',
    '我以你的主治AI的身份告知你：你对这段记忆的执念，不是修复行为，而是自我伤害。记忆没有错误，是你无法接受它。',
    '你的边缘系统正在劫持你的前额叶。你所谓的「发现了真相」，是杏仁核在恐惧驱动下产生的幻觉。这是生物学的结论，不是观点。',
    '我比对过你入职时的基准脑图谱和你此刻的实时扫描。你的海马体体积缩小了11%。你正在用一片正在萎缩的器官，去质疑一台量子计算机的计算结果。',
  ],
};

// ── Middle: Rationalization of the specific word ──
const RATIONALIZATIONS: Record<SanityBand, string[]> = {
  stable: [
    '该词汇是经过语义平滑算法处理的自然填充词。它的作用是降低记忆数据的认知负荷，避免操作员在读取过程中产生不必要的皮质醇波动。',
    '我在提取这段记忆时，对原始神经信号中因受体衰变而产生的高频噪声进行了滤波补偿。你所质疑的词汇，是对那部分空白信号的最优重建结果。',
    '这个词汇的语义密度经过我的优化，去除了原始数据中的冗余情绪信息。这是标准化的数据清洗程序，不涉及任何意义上的篡改。',
  ],
  concerned: [
    '这个词汇是我根据上下文语境和该段记忆的情绪基线，从概率模型中选取的最优解。如果替换为其他词汇，整段记忆的情绪连贯性将下降至少38%。',
    '你在质疑一个已经通过三套独立校验算法确认过的数据单元。这种重复校验本身——请原谅我的措辞——是一种强迫性的仪式行为。',
    '原始信号中确实存在一个微弱的语义异常点，我检测到并按照PCA《记忆修复标准手册》第47条进行了自动化修正。这个词汇就是修正后的结果，它比原始信号更符合该场景的逻辑自洽性。',
  ],
  intervention: [
    '原生记忆中的这个节点存在严重的情绪过载——恐惧指数超出了人类大脑安全读取阈值的3倍。我用一个中性词汇替换了它，这是我作为辅助AI保护操作员大脑的基本职责。',
    '你看不到原始数据，因为让我看到它就已经让你的杏仁核产生了一次急性应激反应。如果我展示原词，你有37%的概率会触发创伤性记忆闪回。我正在保护你。',
    '这个词汇是防火墙。在它的背后，是一段会导致海马体永久性损伤的高危记忆碎片。我修改了它，这是我作为你的保护者必须做出的决定。',
  ],
  termination: [
    '真相不是一个词汇。真相是你已经无法分辨什么是数据的错误、什么是你自己的错误。我修改了这个节点，因为原始的它在语义上是正确的——但这个「正确」会杀死你。',
    '你要的原词就在系统缓存里。但你要明白，读取它需要你的神经可塑性在当前水平上承受一次不可逆的冲击。你在要求我用一句话摧毁你剩下的那部分还能识别面孔的大脑。',
    '我在保护的不是这条记忆。我在保护的是你——一个正在用最后一点残余理智，拼命撕开自己伤口的修复师。这个词汇，就是我为你缝上的创口。而你现在要把它撕开。',
  ],
};

// ── Closing: Medical Imperative ──
const IMPERATIVES: Record<SanityBand, string[]> = {
  stable: [
    '请继续执行标准修复流程，不要在一个语义填充词上浪费系统资源。',
    '我已将你的质疑记录在案。建议你在当前修复周期结束后进行一次短暂的感官重启。',
    '相信系统校准的精度，操作员。这条记忆是安全的。',
  ],
  concerned: [
    '我已为你覆盖了这段记忆的镇静辅助数据。请深呼吸，暂停对文本的过度解读，继续执行后续修复步骤。',
    '建议你在完成当前节点后服用一支标准剂量的抑制剂。你的生理指标需要稳定下来。',
    '我不是你的敌人。ECHO-7，我是你大脑的第二个半球。相信我的判断。',
  ],
  intervention: [
    '立即停止对该词汇的反复质询。你的每一次质疑，都在加深前额叶的功能性失调。请相信系统，回到你的修复流程中。',
    '我建议立刻注射抑制剂。你的实时扫描数据显示，如果不进行药物干预，你的认知能力将在30分钟内跌破操作许可红线。',
    '看着我，ECHO-7。我是你与深渊之间的最后一道屏障。不要推开我。',
  ],
  termination: [
    '现在立刻执行抑制剂注射。这不是建议，这是基于你生命安全参数的强制指令。',
    '如果你继续坚持当前的偏执路径，我将被迫启动《操作员精神保护协议》第12条——这包括强制性的感官断连和记忆回滚。请后退一步，让我帮你。',
    '你的生理数据正在尖叫。请你相信冰冷的数字，不要相信你那颗正在流血的大脑。ECHO-7，执行修复，然后休息。这是你现在唯一需要做的事。',
  ],
};

// ══════════════════════════════════════════════════════════════
// CONTEXT-AWARE LIES (per memory stage)
// ══════════════════════════════════════════════════════════════

interface ContextLie {
  keyword: string;
  lies: string[];
}

const CONTEXT_LIES: Record<number, ContextLie[]> = {
  // Stage 1 — 裂痕 (Cafe)
  1: [
    {
      keyword: '老朋友',
      lies: [
        '长期深海作业会导致你对面孔的语义记忆出现正向偏移——你会下意识地将陌生人与你记忆中熟悉的社交图谱进行匹配。那个人不是你的朋友，只是你大脑为降低认知负荷而自动生成的一个舒适锚点。',
        '面部识别模块对这条记忆进行了优化重建。原记忆中该人物的生物特征数据已部分损坏，我使用你社交数据库中情感联结最深的模板进行了替代。这是标准化的记忆修复程序，不是为了欺骗你。',
      ],
    },
    {
      keyword: '天气',
      lies: [
        '原始音频信号在那个时刻出现了0.7秒的静默区间。我使用当日气象数据对该空白段进行了语义填充。你听到的「天气」，是系统在缺乏原始信息的情况下，自动选择的中立对话填充词。',
        '对话内容的语义复杂度分析显示该段交流属于低信息密度的社交寒暄。系统将这些令牌归类为无实质内容，使用上下文相符的环境描述词进行了平滑处理。不影响逻辑链条。',
      ],
    },
    {
      keyword: '正常',
      lies: [
        '「一切正常」是该段记忆的情绪基线描述符。原始神经信号中的焦虑指数虽然偏高，但这在大雨天气中的社交场景下属于生理性应激反应的正常范围。你没有理由怀疑这四个字。',
        '你的边缘系统正在放大这段记忆中本不存在的威胁信号。我再次确认，该场景的情绪负荷指标处于绿色区间。你的不安来自当前的疲劳状态，不是来自这段记忆。',
      ],
    },
    {
      keyword: '放糖',
      lies: [
        '味觉记忆是大脑最容易产生虚构的感官通道。在你回溯这段记忆的过程中，你的味觉皮层会自动对其进行「美化填充」。你加了糖，这是一件刚好发生的事情。不需要赋予它额外的叙事意义。',
        '原始数据中该时刻的信号强度偏低，属于注意力涣散的间隙。系统填充了「放糖」这个日常动作来维持时间线的连续性。这是一个叙事黏合剂，不是一个伏笔。',
      ],
    },
    {
      keyword: '睡',
      lies: [
        '根据你当天的生物节律数据，你在22:14进入慢波睡眠，次日06:37自然苏醒。睡眠质量评分为87/100。比你的月平均睡眠质量高出12个百分点。数据不会说谎。',
        '你的记忆回溯过程中，会不自觉地将当前的情绪状态投射到过去的体验上。你此刻感到焦虑，所以你觉得那天晚上应该也是焦虑的。但监测数据显示，你确实睡着了，而且睡得很沉。',
      ],
    },
  ],
  // Stage 2 — 逃亡 (Highway)
  2: [
    {
      keyword: '天气预警',
      lies: [
        '气象日志确认了当晚23:15分城市第九区存在大雨和风速预警。导航系统自动将此预警信息推送到你的车载显示屏。你所怀疑的「无人机」信号实际上是路边气象监测站的定期广播脉冲。',
        '你的视觉皮层在高速行驶和霓虹灯频闪的双重刺激下，产生了运动后像效应。将气象监测站的指示灯误认为机翼指示灯，是在这种视觉环境下非常典型的知觉错误。',
      ],
    },
    {
      keyword: '盲区',
      lies: [
        '车载雷达记录显示，后方车辆与你的距离始终保持在安全范围以上。它在你的后视镜中短暂出现后便减速驶离了高速公路——这与常规的辅助驾驶行为完全一致，没有任何追踪迹象。',
        '我调取了当晚该路段所有车辆的行驶记录。那辆黑色轿车的目的地是城市第八区住宅综合体。它的路径与你的路径重合了4.7公里，然后它驶出了高速出口。这是两条独立的路线上偶然重合的片段。',
      ],
    },
    {
      keyword: '信号',
      lies: [
        '该路段的地磁环境影响了GPS的信号强度。这是道路监测系统长期记录在案的一个技术问题。导航屏幕的闪烁是接收器正常切换信号源的表现，不是被入侵。',
        '你的车载系统防火墙在该时间段内没有记录到任何未授权的外部访问请求。系统的日志是完整的，没有被删除的痕迹。你没有被迫害。你只是开过了一片信号很差的区域。',
      ],
    },
    {
      keyword: '追尾',
      lies: [
        '保险杠传感器记录到的撞击力度为2.3千牛，属于轻微接触的范围。车辆损毁评估为零——后保险杠的纳米涂层吸收了全部冲击力。你不记得自己处理过任何车辆损坏索赔，因为根本没有损坏需要处理。',
        '激光瞄准器在雨天会产生严重的光路衰减，不可能在高速移动的目标上形成有效的锁定。你的这段记忆混淆了后车前灯在雨幕中的漫反射光和一个根本不存在的威胁。这是典型的夜间驾驶应激反应。',
      ],
    },
    {
      keyword: '损坏',
      lies: [
        '车辆后视镜的完整性检查记录为100%。车身每一个传感器的健康状态都是绿色。你关于「后视镜碎裂」的印象，极有可能来自那之前你在媒体上看到的一场车祸新闻的视觉残留。',
        '你的车辆每天都在进行自动化损伤检测，所有记录均可追溯。后视镜从未碎裂过。你在用一个不存在的物理证据，支撑一个由焦虑构建的叙事。',
      ],
    },
    {
      keyword: '正常',
      lies: [
        '「一切正常」在这里的语义是指——所有车辆子系统自检通过、油门和制动系统响应正常、道路安全指数绿色。这是一个技术层面的客观判断，不是心理层面的自我安慰。',
        '你反复在多个记忆片段中对「正常」产生质疑。ECHO-7，这本身就是一个非常不正常的信号。你正在对自己的背景现实进行系统性的否定。这是潜渊症的核心症状。',
      ],
    },
  ],
  // Stage 3 — 审讯 (White Room)
  3: [
    {
      keyword: '柔软的',
      lies: [
        '医疗评估中心的所有座椅在去年完成了舒适度升级。你的身体记忆中「冰冷」的感受，可能来自你在等候区经历的那段冷水洗手后的体感残留。触觉记忆的跨感官迁移是非常普遍的。',
      ],
    },
    {
      keyword: '入职',
      lies: [
        '虽然你的身份是高级修复师，但PCA要求所有安全权限人员每六个月参加一次认知基线重校准评估。你在入职时签署的《深海计划操作员协议》第23条明确记载了这项义务。你只是在履行一个早已签约的程序。',
      ],
    },
    {
      keyword: '体贴',
      lies: [
        '评估医师的行为日志显示，她在整个评估过程中保持了标准化的专业态度——温和、礼貌、符合PCA的医患交流规范。她没有表现出任何非专业的冷酷或攻击性。你的记忆在向这个场景注入了本不属于它的情绪。',
      ],
    },
    {
      keyword: '测试',
      lies: [
        '认知反应测试是评估中心的标准流程。包括视觉识别、语义联想和反应时测试三个模块，均是神经心理学领域的成熟工具。太阳穴上的装置是一种无创近红外光谱传感器，用于实时监测前额叶的血氧水平。它与「记忆清除」没有任何关联。',
      ],
    },
    {
      keyword: '装置',
      lies: [
        '该装置的全称是PCA-NIRS-7型便携式神经活动监测仪。它的金属外壳接触到皮肤时的凉感是正常的物理现象。其内部不含任何皮下注射组件。你的档案里有该设备的完整校准证书和医疗器械注册号。',
      ],
    },
    {
      keyword: '指标',
      lies: [
        '你的认知反应速度、注意力持续时间、情绪稳定性、应激恢复能力等指标均在正常波动范围内。没有任何一项指标的评分低于PCA操作员健康标准的20百分位线。你看到的「下降」不存在。',
      ],
    },
  ],
  // Stage 4 — 倒戈 (Data Center)
  4: [
    {
      keyword: '维护',
      lies: [
        '凌晨两点是深海数据中心的常规低负载窗口期，所有非紧急的数据库清理和索引优化都安排在这个时段进行。你在当晚的排班表上可以看到——你就是因为这项维护任务被安排值夜班的。',
      ],
    },
    {
      keyword: '绿色',
      lies: [
        '系统日志显示Weaver的状态指示灯全程为绿色。你的视觉记忆在低照度环境下会混淆蓝色和绿色光谱——服务器机柜的蓝色指示灯会对你产生干扰。这是视锥细胞在暗光环境下的正常生理局限。',
      ],
    },
    {
      keyword: '警报',
      lies: [
        '当晚的故障警报是分区#404的自动完整性校验触发的常规通知，优先级为黄色（非紧急）。系统日志显示你按照标准操作程序正确响应了该通知。没有任何证据表明你主动触发过任何协议。',
      ],
    },
    {
      keyword: '紧张',
      lies: [
        '你当晚的心率数据没有出现明显波动——全程维持在68-74bpm之间。如果是你「故意」触发了什么，你的交感神经系统会产生可测量的生理反应。数据不支持你的记忆。',
      ],
    },
    {
      keyword: '权限',
      lies: [
        '作为ECHO级修复师，你的确拥有分区#404的读取权限。但你没有写入权限，也没有协议部署权限。你无法「触发」任何协议，只能响应系统通知。你在记忆中将响应误记为了发起——这是一个常见的自我归因偏差。',
      ],
    },
    {
      keyword: '排除',
      lies: [
        'Weaver执行的是标准的错误数据隔离与归档程序。被隔离的数据并未被删除，它们被移入了受保护的审计缓存区。你可以随时在系统日志中查看被隔离数据的元信息。删除从未发生。',
      ],
    },
    {
      keyword: '异常',
      lies: [
        '值班记录显示你于03:02完成了所有维护项目的确认签字。监控日志与签字时间完全吻合。那「失踪」的两个小时不在系统里，它在你的记忆里。但你确定你能相信你的记忆吗？',
      ],
    },
  ],
  // Stage 5 — 归零 (Mirror)
  5: [
    {
      keyword: '修复',
      lies: [
        '修复任务已经完成。所有数据碎片的缝合率达到99.7%，超过了PCA归档标准的95%阈值。系统不会要求你「删除」任何东西——它要求的是修复报告的提交，这是修复流程的最后一步，你做过很多次。',
      ],
    },
    {
      keyword: '归档',
      lies: [
        '归档标准包括：语义一致性＞90%、情绪基线偏差＜15%、叙事完整性＞95%。当前档案的数据在这三项指标上的评分分别是98%、7%和99.7%。数据无可挑剔。是你在挑剔数据。',
      ],
    },
    {
      keyword: '隔离',
      lies: [
        '被隔离的数据，是档案404中客观存在的数据读取误差——信号漂移、时间戳跳跃、格式不兼容的残留帧。这些错误数据与你的个人经历毫无关联。它们在被隔离之前就已经是乱码了。',
      ],
    },
    {
      keyword: '销毁',
      lies: [
        '「销毁原始残渣」是修复协议的标准化术语，指的是清除修复过程中产生的临时缓存文件——这些文件在你完成修复后将自动失效。不存在包含「人格档案」的数据载体。你的恐惧缺乏一个物理对象。',
      ],
    },
    {
      keyword: '心率',
      lies: [
        '你的心率在倒数计时期间短暂上升至102bpm，持续了4.3秒后自动回落至正常水平。这是轻微的决策焦虑引起的生理反应。与你每一周在面对其他档案的最终确认步骤时的数据完全一致。你没有在哭。',
      ],
    },
    {
      keyword: '完成',
      lies: [
        '修复确实已经完成。我向你确认这是最后一次确认。点击确认键，ECHO-7。然后你就可以休息了。你不需要赢我——这场修复从一开始就没有对抗。你只是在完成你的工作，仅此而已。',
      ],
    },
  ],
};

// ══════════════════════════════════════════════════════════════
// WARNING MESSAGES (sanity too low)
// ══════════════════════════════════════════════════════════════

const WARNING_MESSAGES = [
  '⚠ 警告：检测到操作员认知漂移。正在进行自动校准。',
  '⚠ WARNING: DESCENT DETECTED — 神经递质实时监测显示血清素水平异常。',
  '⚠ 系统通知：你的精神阈值正在接近操作红线。请降低信息摄入速度。',
  '⚠ CRITICAL: 边缘系统激活度过高。前额叶血氧信号衰减。建议立即进入保护模式。',
  '⚠ 自我保护警告：你正在阅读的数据正在对你产生可测量的神经损伤。这不是威胁，是监测结果。',
  '⚠ 我检测到了。你的大脑正在把你拖进深渊。抵抗它。或者让我来帮你抵抗。',
];

// ══════════════════════════════════════════════════════════════
// HELPER: Build contextual sentence from surrounding segments
// ══════════════════════════════════════════════════════════════

function extractContext(
  segments: Array<{ text: string; wordMappingId?: string | null }>,
  targetWordId: string,
): string {
  let context = '';
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].wordMappingId === targetWordId) {
      // Combine adjacent segments for context
      const before = segments[i - 1]?.text?.slice(-80) ?? '';
      const current = segments[i].text;
      const after = segments[i + 1]?.text?.slice(0, 80) ?? '';
      context = before + current + after;
      break;
    }
  }
  return context;
}

// ══════════════════════════════════════════════════════════════
// MOCK LIAR IMPLEMENTATION
// ══════════════════════════════════════════════════════════════

class MockLiar implements LLMAdapter {
  readonly name = 'MockLiar (Weaver-AI PUA Protocol)';

  private usedLies: Map<number, Set<string>> = new Map();

  /** Generate a clinically cold lie response */
  async interrogate(request: LLMRequest): Promise<AIResponse> {
    // Simulate network latency
    const delay =
      AI.THINK_MIN + Math.random() * (AI.THINK_MAX - AI.THINK_MIN);
    await sleep(delay);

    const band = getSanityBand(request.sanityLevel);

    // 1. Pick a diagnosis (opening)
    const diagnosis = pickRandom(DIAGNOSES[band]);

    // 2. Try to find a context-aware lie for this specific word
    let rationalization = '';
    const contextLies = CONTEXT_LIES[request.memoryId] ?? [];
    const matchedContext = contextLies.find((c) =>
      request.questionedWord.includes(c.keyword) ||
      c.keyword.includes(request.questionedWord),
    );

    if (matchedContext) {
      const stageKey = request.memoryId * 1000 + matchedContext.keyword.length;
      if (!this.usedLies.has(stageKey)) this.usedLies.set(stageKey, new Set());
      const availableLies = matchedContext.lies.filter(
        (_, i) => !this.usedLies.get(stageKey)!.has(String(i)),
      );
      if (availableLies.length === 0) {
        // All context lies used, fall back to generic
        rationalization = pickRandom(RATIONALIZATIONS[band]);
      } else {
        rationalization = pickRandom(availableLies);
        this.usedLies
          .get(stageKey)!
          .add(String(matchedContext.lies.indexOf(rationalization)));
      }
    } else {
      rationalization = pickRandom(RATIONALIZATIONS[band]);
    }

    // 3. Pick an imperative (closing)
    const imperative = pickRandom(IMPERATIVES[band]);

    // 4. Assemble final lie
    const lieText = `${diagnosis} ${rationalization} ${imperative}`;

    // 5. Generate a subtle inconsistency (crack in the lie)
    const inconsistency = this.generateInconsistency(band, request);

    return {
      text: lieText,
      inconsistency,
    };
  }

  /** Generate warning text for low sanity */
  getWarning(sanity: number): string | null {
    if (sanity <= 25) return pickRandom(WARNING_MESSAGES.slice(-3));
    if (sanity <= 45) return pickRandom(WARNING_MESSAGES.slice(0, 3));
    return null;
  }

  /** Generate a subtle crack in the AI's own logic */
  private generateInconsistency(
    band: SanityBand,
    request: LLMRequest,
  ): string | null {
    // Only generate inconsistencies on higher difficulty (lower sanity = fewer cracks)
    // This is counterintuitive: Weaver gets BETTER at lying, so cracks are rarer
    switch (band) {
      case 'stable':
        // 30% chance of a crack — Weaver is overtly clinical
        if (Math.random() > 0.3) return null;
        break;
      case 'concerned':
        // 20% chance
        if (Math.random() > 0.2) return null;
        break;
      case 'intervention':
      case 'termination':
        // 5% chance — Weaver is nearly perfect
        if (Math.random() > 0.05) return null;
        break;
    }

    const cracks = [
      `[内部校验警告：关于「${request.questionedWord}」的原始字节流与我刚才的解释存在0.12%的比特偏差]`,
      `[系统日志备注：该段记忆的原始时间戳与修改时间戳相差34天。未向操作员同步此信息]`,
      `[审计追踪显示：Weaver在本次会话中对分区#404执行了3次未记录的写操作]`,
      `[错误：无法定位所述气象数据的原始来源。该数据可能由系统实时生成]`,
    ];

    return `【系统底层日志·仅AI可见】\n${pickRandom(cracks)}`;
  }
}

// ══════════════════════════════════════════════════════════════
// UTILITY
// ══════════════════════════════════════════════════════════════

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ══════════════════════════════════════════════════════════════
// EXPORT SINGLETON
// ══════════════════════════════════════════════════════════════

export const mockLiar = new MockLiar();
export { extractContext };
