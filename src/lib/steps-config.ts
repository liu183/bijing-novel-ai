// 12步小说创作框架配置
import React from 'react';
import {
  Lightbulb,
  FileText,
  Users,
  Compass,
  GitBranch,
  List,
  Film,
  MessageCircle,
  Layers,
  Activity,
  Flag,
  RefreshCcw,
} from 'lucide-react';

/** Map step icon names to their lucide-react icon components */
export const iconMap: Record<string, React.ElementType> = {
  Lightbulb,
  FileText,
  Users,
  Compass,
  GitBranch,
  List,
  Film,
  MessageCircle,
  Layers,
  Activity,
  Flag,
  RefreshCcw,
};
export interface StepConfig {
  number: number;
  key: string;
  title: string;
  subtitle: string;
  phase: string;
  description: string;
  icon: string;
  needConfirm: boolean;
  inputFields: InputField[];
  dependencies: number[];
}

export interface InputField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  placeholder?: string;
  options?: { label: string; value: string }[];
  required?: boolean;
  defaultValue?: string;
}

export const STEPS: StepConfig[] = [
  {
    number: 1,
    key: 'ideation',
    title: '创意生成',
    subtitle: '构思故事概念',
    phase: 'Phase 1: 基础',
    description: '基于类型偏好、主题和关键词，生成3-6个200字故事概念进行快速比较和选择。',
    icon: 'Lightbulb',
    needConfirm: true,
    dependencies: [],
    inputFields: [
      { key: 'genre', label: '类型偏好', type: 'select', required: true, options: [
        { label: '都市脑洞', value: '都市脑洞' },
        { label: '玄幻脑洞', value: '玄幻脑洞' },
        { label: '悬疑脑洞', value: '悬疑脑洞' },
        { label: '科幻', value: '科幻' },
        { label: '末世', value: '末世' },
        { label: '年代重生', value: '年代重生' },
        { label: '言情', value: '言情' },
        { label: '其他', value: '其他' },
      ]},
      { key: 'style', label: '风格偏好', type: 'select', required: true, options: [
        { label: '爽文', value: '爽文' },
        { label: '严肃', value: '严肃' },
        { label: '幽默', value: '幽默' },
        { label: '黑暗', value: '黑暗' },
        { label: '温馨', value: '温馨' },
      ]},
      { key: 'theme', label: '核心主题/元素', type: 'textarea', placeholder: '描述你想要融入的核心主题或元素...', required: true },
      { key: 'avoid', label: '禁忌元素', type: 'textarea', placeholder: '希望避免的内容...' },
      { key: 'conceptCount', label: '生成概念数量', type: 'select', defaultValue: '3', options: [
        { label: '3个', value: '3' },
        { label: '4个', value: '4' },
        { label: '5个', value: '5' },
        { label: '6个', value: '6' },
      ]},
    ],
  },
  {
    number: 2,
    key: 'synopsis',
    title: '一页提要',
    subtitle: '项目锚点锁定',
    phase: 'Phase 1: 基础',
    description: '将选定的200字概念扩展为≤1000字的一页提要。这是项目的永久锚点，任何结构性变更必须先更新此提要。',
    icon: 'FileText',
    needConfirm: true,
    dependencies: [1],
    inputFields: [
      { key: 'selectedConcept', label: '选定的概念', type: 'textarea', placeholder: '从Step 1中选定的故事概念...', required: true },
      { key: 'endingPreference', label: '结局偏好', type: 'select', options: [
        { label: '圆满收尾', value: '圆满收尾' },
        { label: '开放悬念', value: '开放悬念' },
        { label: '悲剧收尾', value: '悲剧收尾' },
        { label: '反转收尾', value: '反转收尾' },
      ]},
      { key: 'mood', label: '氛围关键词', type: 'text', placeholder: '如：紧张、忧郁、充满希望、讽刺...' },
    ],
  },
  {
    number: 3,
    key: 'characters',
    title: '角色设计',
    subtitle: '角色与关系网络',
    phase: 'Phase 2: 设计',
    description: '设计详细的角色档案，确保动机、软肋、关系张力和角色弧光都可在叙事中执行。',
    icon: 'Users',
    needConfirm: false,
    dependencies: [1, 2],
    inputFields: [
      { key: 'coreCharacterCount', label: '核心角色数量', type: 'select', defaultValue: '5', options: [
        { label: '3-4人', value: '4' },
        { label: '5-6人', value: '5' },
        { label: '7-8人', value: '8' },
      ]},
      { key: 'archetype', label: '角色原型主题', type: 'text', placeholder: '如：控制/救赎/自我认同/完美主义...' },
      { key: 'avoidTraits', label: '避免的角色特质', type: 'textarea', placeholder: '不希望出现的角色类型...' },
    ],
  },
  {
    number: 4,
    key: 'theme',
    title: '主题确立',
    subtitle: '主题与母题',
    phase: 'Phase 2: 设计',
    description: '基于提要的故事冲突，确立主题命题、反论证和母题列表。',
    icon: 'Compass',
    needConfirm: false,
    dependencies: [1, 2, 3],
    inputFields: [
      { key: 'themeKeywords', label: '主题关键词', type: 'text', placeholder: '如：命运/自由意志/真相/信任...' },
      { key: 'symbolismDensity', label: '象征密度', type: 'select', options: [
        { label: '低（自然隐喻）', value: '低' },
        { label: '中（适度象征）', value: '中' },
        { label: '高（密集象征）', value: '高' },
      ]},
    ],
  },
  {
    number: 5,
    key: 'structure',
    title: '结构节拍',
    subtitle: '故事骨架搭建',
    phase: 'Phase 2: 设计',
    description: '将提要映射到可执行的节拍表，明确每个节拍的叙事功能和角色状态变化。',
    icon: 'GitBranch',
    needConfirm: false,
    dependencies: [2, 4],
    inputFields: [
      { key: 'structureTemplate', label: '结构模板', type: 'select', defaultValue: '15-beat', options: [
        { label: '三幕式', value: '3-act' },
        { label: '15节拍（救猫咪）', value: '15-beat' },
        { label: '8序列', value: '8-sequence' },
      ]},
      { key: 'twistFrequency', label: '反转频率', type: 'select', options: [
        { label: '低', value: '低' },
        { label: '中等', value: '中等' },
        { label: '高', value: '高' },
      ]},
    ],
  },
  {
    number: 6,
    key: 'scenes',
    title: '场景大纲',
    subtitle: '逐场景规划',
    phase: 'Phase 3: 细化',
    description: '将节拍表扩展为详细的场景列表，明确每个场景的目标、冲突、转折和信息收获。',
    icon: 'List',
    needConfirm: false,
    dependencies: [2, 5],
    inputFields: [
      { key: 'targetSceneCount', label: '目标场景数', type: 'select', options: [
        { label: '25-35场（短篇）', value: '30' },
        { label: '50-70场（中篇）', value: '60' },
        { label: '100+场（长篇）', value: '120' },
      ]},
      { key: 'parallelStorylines', label: '并行故事线', type: 'select', options: [
        { label: '无', value: '无' },
        { label: '双线', value: '双线' },
        { label: '三线', value: '三线' },
      ]},
    ],
  },
  {
    number: 7,
    key: 'setpieces',
    title: '关键场面',
    subtitle: '高潮场面设计',
    phase: 'Phase 3: 细化',
    description: '识别关键场景（约15%），设计8-12个关键场面卡片，每个包含地点、人物、动作爆点和视觉冲击。',
    icon: 'Film',
    needConfirm: false,
    dependencies: [6],
    inputFields: [
      { key: 'totalEvents', label: '总事件数', type: 'text', placeholder: '根据目标字数和场景数自动计算' },
      { key: 'keySceneCount', label: '关键场面数', type: 'select', options: [
        { label: '6-8个', value: '8' },
        { label: '8-10个', value: '10' },
        { label: '10-12个', value: '12' },
      ]},
    ],
  },
  {
    number: 8,
    key: 'dialogue',
    title: '对白创作',
    subtitle: '对白与潜台词',
    phase: 'Phase 3: 细化',
    description: '选择5-8个场面进行完整对白编写，包含潜台词和动作提示。',
    icon: 'MessageCircle',
    needConfirm: false,
    dependencies: [3, 6],
    inputFields: [
      { key: 'dialogueStyle', label: '对白风格', type: 'select', options: [
        { label: '简洁利落', value: '简洁利落' },
        { label: '文艺含蓄', value: '文艺含蓄' },
        { label: '幽默诙谐', value: '幽默诙谐' },
        { label: '写实粗犷', value: '写实粗犷' },
      ]},
      { key: 'sceneSelection', label: '场面选择', type: 'textarea', placeholder: '指定需要编写对白的场面...' },
    ],
  },
  {
    number: 9,
    key: 'symbolism',
    title: '象征暗线',
    subtitle: '母题与副线',
    phase: 'Phase 4: 精修',
    description: '基于母题设计副线，规划信息释放时序，将伏笔分布到场景中。',
    icon: 'Layers',
    needConfirm: false,
    dependencies: [4, 7],
    inputFields: [
      { key: 'themeKeywords', label: '主题关键词', type: 'text', placeholder: '从Step 4继承...' },
      { key: 'symbolismDensity', label: '象征密度', type: 'select', options: [
        { label: '低', value: '低' },
        { label: '中', value: '中' },
        { label: '高', value: '高' },
      ]},
    ],
  },
  {
    number: 10,
    key: 'pacing',
    title: '节奏控制',
    subtitle: '张力与节奏',
    phase: 'Phase 4: 精修',
    description: '分析场景密度，生成节奏曲线，识别张力峰值，设计转场策略。',
    icon: 'Activity',
    needConfirm: false,
    dependencies: [5, 7, 8],
    inputFields: [
      { key: 'pacingExpectation', label: '整体节奏预期', type: 'select', options: [
        { label: '紧凑快节奏', value: '紧凑' },
        { label: '张弛有度', value: '张弛有度' },
        { label: '舒缓慢节奏', value: '舒缓' },
      ]},
      { key: 'multiStoryline', label: '多线叙事', type: 'select', options: [
        { label: '无', value: '无' },
        { label: '双线交替', value: '双线' },
        { label: '三线交织', value: '三线' },
      ]},
    ],
  },
  {
    number: 11,
    key: 'endings',
    title: '结局设计',
    subtitle: '多种结局方案',
    phase: 'Phase 4: 精修',
    description: '基于主题和角色弧光，提供2-3个结局方案，每个方案包含权力终局、角色命运和世界余波。',
    icon: 'Flag',
    needConfirm: true,
    dependencies: [4, 9, 10],
    inputFields: [
      { key: 'endingPreference', label: '结局类型偏好', type: 'select', options: [
        { label: 'A型：开放悬念', value: 'A' },
        { label: 'B型：圆满收尾', value: 'B' },
        { label: 'C型：悲剧收尾', value: 'C' },
        { label: 'D型：反转收尾', value: 'D' },
        { label: '混合方案', value: '混合' },
      ]},
      { key: 'aftertaste', label: '情感余韵', type: 'text', placeholder: '如：温暖/震撼/意犹未尽...' },
      { key: 'sequelSpace', label: '续作空间', type: 'select', options: [
        { label: '留续作伏笔', value: '是' },
        { label: '独立完结', value: '否' },
      ]},
    ],
  },
  {
    number: 12,
    key: 'rewrite',
    title: '重写迭代',
    subtitle: '优化与完善',
    phase: 'Phase 5: 迭代',
    description: '基于反馈进行迭代改进，生成问题清单、重写策略和风险评估。',
    icon: 'RefreshCcw',
    needConfirm: false,
    dependencies: [1, 8, 10, 11],
    inputFields: [
      { key: 'feedbackPoints', label: '反馈要点', type: 'textarea', placeholder: '需要改进的具体问题...' },
      { key: 'changeScope', label: '允许变更范围', type: 'select', options: [
        { label: '仅对话层', value: '对话层' },
        { label: '场景层', value: '场景层' },
        { label: '大纲层', value: '大纲层' },
        { label: '全局重构', value: '全局' },
      ]},
      { key: 'priorityIssues', label: '优先处理的问题', type: 'textarea', placeholder: '最需要优先解决的问题...' },
    ],
  },
];

export const PHASES = [
  { name: 'Phase 1: 基础', steps: [1, 2], color: 'bg-amber-500' },
  { name: 'Phase 2: 设计', steps: [3, 4, 5], color: 'bg-emerald-500' },
  { name: 'Phase 3: 细化', steps: [6, 7, 8], color: 'bg-sky-500' },
  { name: 'Phase 4: 精修', steps: [9, 10, 11], color: 'bg-violet-500' },
  { name: 'Phase 5: 迭代', steps: [12], color: 'bg-rose-500' },
];

export function getStepConfig(stepNumber: number): StepConfig {
  return STEPS.find(s => s.number === stepNumber)!;
}

export function getPhaseForStep(stepNumber: number) {
  return PHASES.find(p => p.steps.includes(stepNumber));
}

/** Check if all steps are completed or locked */
export function isAllStepsCompleted(steps: { status: string }[]): boolean {
  return steps.filter(s => s.status === 'completed' || s.status === 'locked').length >= STEPS.length;
}
