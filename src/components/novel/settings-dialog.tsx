'use client';

import React from 'react';
import { useAppStore } from '@/store/app-store';
import { ALL_MODELS } from '@/lib/ai/models';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  PenLine,
  Cpu,
  Download,
  Info,
  Sparkles,
  ExternalLink,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';

export function SettingsDialog() {
  const settingsOpen = useAppStore((s) => s.settingsOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const dailyGoal = useAppStore((s) => s.dailyGoal);
  const setDailyGoal = useAppStore((s) => s.setDailyGoal);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);

  // Local state for non-persisted settings (export format)
  const [exportFormat, setExportFormat] = React.useState<'txt' | 'docx' | 'docx-formatted'>(() => {
    if (typeof window === 'undefined') return 'docx';
    try {
      return (localStorage.getItem('bijing-default-export-format') as 'txt' | 'docx' | 'docx-formatted') || 'docx';
    } catch {
      return 'docx';
    }
  });

  // Default genre/style (not persisted, just convenience)
  const [defaultGenre, setDefaultGenre] = React.useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem('bijing-default-genre') || '';
    } catch {
      return '';
    }
  });
  const [defaultStyle, setDefaultStyle] = React.useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem('bijing-default-style') || '';
    } catch {
      return '';
    }
  });

  const handleExportFormatChange = (value: string) => {
    const fmt = value as 'txt' | 'docx' | 'docx-formatted';
    setExportFormat(fmt);
    try {
      localStorage.setItem('bijing-default-export-format', fmt);
    } catch { /* ignore */ }
    const labels: Record<string, string> = { txt: 'TXT', docx: 'DOCX', 'docx-formatted': 'DOCX精排版' };
    toast.success(`默认导出格式已设为 ${labels[fmt]}`);
  };

  const handleDefaultGenreChange = (value: string) => {
    setDefaultGenre(value);
    try {
      localStorage.setItem('bijing-default-genre', value);
    } catch { /* ignore */ }
  };

  const handleDefaultStyleChange = (value: string) => {
    setDefaultStyle(value);
    try {
      localStorage.setItem('bijing-default-style', value);
    } catch { /* ignore */ }
  };

  const handleDailyGoalChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 100 && num <= 100000) {
      setDailyGoal(num);
    }
  };

  // Group models by provider for cleaner UI
  const modelsByProvider = React.useMemo(() => {
    const map = new Map<string, typeof ALL_MODELS>();
    for (const model of ALL_MODELS) {
      const arr = map.get(model.provider) || [];
      arr.push(model);
      map.set(model.provider, arr);
    }
    return map;
  }, []);

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Sparkles className="size-4 text-white" />
            </div>
            设置
          </DialogTitle>
          <DialogDescription>
            自定义笔境 AI 的偏好设置
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="writing" className="mt-2">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="writing" className="gap-1.5 text-xs">
              <PenLine className="size-3.5" />
              <span className="hidden sm:inline">创作设置</span>
              <span className="sm:hidden">创作</span>
            </TabsTrigger>
            <TabsTrigger value="model" className="gap-1.5 text-xs">
              <Cpu className="size-3.5" />
              <span className="hidden sm:inline">模型设置</span>
              <span className="sm:hidden">模型</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-1.5 text-xs">
              <Download className="size-3.5" />
              <span className="hidden sm:inline">导出设置</span>
              <span className="sm:hidden">导出</span>
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-1.5 text-xs">
              <Info className="size-3.5" />
              <span className="hidden sm:inline">关于</span>
              <span className="sm:hidden">关于</span>
            </TabsTrigger>
          </TabsList>

          {/* ─── 创作设置 ─── */}
          <TabsContent value="writing" className="space-y-5 pt-4">
            {/* 每日目标字数 */}
            <div className="space-y-2">
              <Label htmlFor="daily-goal" className="flex items-center gap-1.5 text-sm font-medium">
                <Target className="size-3.5 text-amber-500" />
                每日写作目标
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="daily-goal"
                  type="number"
                  min={100}
                  max={100000}
                  step={500}
                  value={dailyGoal}
                  onChange={(e) => handleDailyGoalChange(e.target.value)}
                  onBlur={(e) => {
                    const num = parseInt(e.target.value, 10);
                    if (isNaN(num) || num < 100) {
                      setDailyGoal(100);
                      toast.info('每日目标最低 100 字');
                    } else if (num > 100000) {
                      setDailyGoal(100000);
                      toast.info('每日目标最高 100,000 字');
                    }
                  }}
                  className="h-9 w-32"
                />
                <span className="text-sm text-muted-foreground">字 / 天</span>
              </div>
              <p className="text-xs text-muted-foreground">
                设置每日写作目标后，写作面板会显示进度提醒
              </p>
            </div>

            <Separator />

            {/* 默认题材 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">默认题材</Label>
              <Select value={defaultGenre} onValueChange={handleDefaultGenreChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="选择默认题材" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不设置</SelectItem>
                  {['都市脑洞', '玄幻奇幻', '玄幻脑洞', '仙侠武侠', '科幻末世', '科幻', '末世', '古代言情', '现代言情', '言情', '悬疑推理', '悬疑脑洞', '历史军事', '游戏竞技', '灵异恐怖', '校园青春', '年代重生', '其他'].map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                新建小说时自动填入题材
              </p>
            </div>

            {/* 默认风格 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">默认风格</Label>
              <Select value={defaultStyle} onValueChange={handleDefaultStyleChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="选择默认风格" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不设置</SelectItem>
                  {['爽文', '虐文', '甜宠', '搞笑', '正剧', '严肃', '文艺', '温馨', '黑暗', '其他'].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                新建小说时自动填入风格
              </p>
            </div>
          </TabsContent>

          {/* ─── 模型设置 ─── */}
          <TabsContent value="model" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">默认 AI 模型</Label>
              <Select value={selectedModel || ''} onValueChange={(v) => {
                setSelectedModel(v);
                const model = ALL_MODELS.find((m) => m.id === v);
                toast.success(`默认模型已切换为 ${model?.name || v}`);
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="选择默认模型" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Array.from(modelsByProvider.entries()).map(([provider, models]) => (
                    <React.Fragment key={provider}>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 sticky top-0">
                        {provider}
                      </div>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id} className="py-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium">{model.name}</span>
                            <span className="text-[10px] text-muted-foreground line-clamp-1">
                              {model.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                在工作台和阅读器中生成内容时使用的默认模型，可在页面顶部随时切换
              </p>
            </div>

            {/* Current model info card */}
            {selectedModel && (() => {
              const model = ALL_MODELS.find((m) => m.id === selectedModel);
              if (!model) return null;
              return (
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{model.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-0">
                      {model.category === 'flagship' ? '旗舰' : model.category === 'balanced' ? '均衡' : model.category === 'fast' ? '快速' : '专业'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{model.description}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>提供商：{model.provider}</span>
                    <span>·</span>
                    <span>上下文：{(model.maxTokens / 1000).toFixed(0)}K tokens</span>
                    {model.supportsVision && <span className="text-violet-500">· 支持视觉</span>}
                    {model.supportsFunctionCall && <span className="text-emerald-500">· 支持函数调用</span>}
                  </div>
                </div>
              );
            })()}
          </TabsContent>

          {/* ─── 导出设置 ─── */}
          <TabsContent value="export" className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">默认导出格式</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'txt', label: 'TXT 纯文本', desc: '轻量纯文本' },
                  { value: 'docx', label: 'DOCX', desc: 'Word 文档' },
                  { value: 'docx-formatted', label: 'DOCX 精排版', desc: '精美排版样式' },
                ].map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={() => handleExportFormatChange(fmt.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all ${
                      exportFormat === fmt.value
                        ? 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-400 shadow-sm'
                        : 'border-border hover:border-amber-300 dark:hover:border-amber-700 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Download className="size-4" />
                    <span className="text-xs font-medium">{fmt.label}</span>
                    <span className="text-[10px] opacity-70">{fmt.desc}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                在仪表盘右键导出时将默认使用此格式
              </p>
            </div>
          </TabsContent>

          {/* ─── 关于 ─── */}
          <TabsContent value="about" className="space-y-4 pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-md">
                <Sparkles className="size-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base">笔境 AI</h3>
                <p className="text-xs text-muted-foreground">智能网文创作平台</p>
              </div>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-0 font-medium">
                v1.0
              </span>
            </div>

            <Separator />

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">技术栈</span>
                <span className="text-xs">Next.js · React · Tailwind CSS · Zustand</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">AI 引擎</span>
                <span className="text-xs">GLM · NVIDIA NIM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">模型数量</span>
                <span className="text-xs">{ALL_MODELS.length} 款可用</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                笔境 AI 是一款 AI 驱动的智能网文创作平台，提供 12 步引导式创作流程、
                多 Agent 协作、章节自动生成等功能，帮助作者从灵感到完稿。
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                asChild
              >
                <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3" />
                  GitHub
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={() => {
                  setSettingsOpen(false);
                }}
              >
                关闭
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
