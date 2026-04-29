'use client';

import React, { useState, useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const GENRES = ['都市脑洞', '玄幻脑洞', '悬疑脑洞', '科幻', '末世', '年代重生', '言情', '其他'];
const STYLES = ['爽文', '严肃', '幽默', '黑暗', '温馨'];

interface NovelTemplate {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  genre: string;
  style: string;
  targetWords: string;
  bgColor: string;
  iconBg: string;
}

const TEMPLATES: NovelTemplate[] = [
  {
    id: 'time-travel',
    name: '穿越重生',
    emoji: '🔄',
    tagline: '现代人穿越到异世界，利用前世知识改变命运',
    description: '现代人穿越到异世界，利用前世知识改变命运',
    genre: '都市脑洞',
    style: '爽文',
    targetWords: '200000',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
  },
  {
    id: 'cultivation',
    name: '修仙玄幻',
    emoji: '⚔️',
    tagline: '废材少年意外获得上古传承，踏上逆天修仙之路',
    description: '废材少年意外获得上古传承，踏上逆天修仙之路',
    genre: '玄幻脑洞',
    style: '爽文',
    targetWords: '300000',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    iconBg: 'bg-purple-100 dark:bg-purple-900/40',
  },
  {
    id: 'mystery',
    name: '悬疑推理',
    emoji: '🔍',
    tagline: '连环谜案背后隐藏惊天阴谋，真相远比想象更黑暗',
    description: '连环谜案背后隐藏惊天阴谋，真相远比想象更黑暗',
    genre: '悬疑脑洞',
    style: '严肃',
    targetWords: '150000',
    bgColor: 'bg-rose-50 dark:bg-rose-950/30',
    iconBg: 'bg-rose-100 dark:bg-rose-900/40',
  },
  {
    id: 'apocalypse',
    name: '末日生存',
    emoji: '🧟',
    tagline: '文明崩塌后，主角带领幸存者重建人类最后的希望',
    description: '文明崩塌后，主角带领幸存者重建人类最后的希望',
    genre: '末世',
    style: '黑暗',
    targetWords: '250000',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    iconBg: 'bg-red-100 dark:bg-red-900/40',
  },
  {
    id: 'era',
    name: '年代文',
    emoji: '📖',
    tagline: '重生回到八九十年代，抓住时代机遇白手起家',
    description: '重生回到八九十年代，抓住时代机遇白手起家',
    genre: '年代重生',
    style: '温馨',
    targetWords: '200000',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
  },
  {
    id: 'romance',
    name: '甜宠言情',
    emoji: '💕',
    tagline: '高冷霸总遇见元气少女，一场甜蜜的都市恋曲',
    description: '高冷霸总遇见元气少女，一场甜蜜的都市恋曲',
    genre: '言情',
    style: '温馨',
    targetWords: '150000',
    bgColor: 'bg-pink-50 dark:bg-pink-950/30',
    iconBg: 'bg-pink-100 dark:bg-pink-900/40',
  },
];

interface FormState {
  title: string;
  genre: string;
  style: string;
  targetWords: string;
  description: string;
}

export function CreateNovelDialog() {
  const open = useAppStore((s) => s.createDialogOpen);
  const setOpen = useAppStore((s) => s.setCreateDialogOpen);
  const setNovels = useAppStore((s) => s.setNovels);
  const setCurrentNovel = useAppStore((s) => s.setCurrentNovel);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const setCurrentStep = useAppStore((s) => s.setCurrentStep);

  const [form, setForm] = useState<FormState>({
    title: '',
    genre: '都市脑洞',
    style: '爽文',
    targetWords: '50000',
    description: '',
  });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templatesExpanded, setTemplatesExpanded] = useState(true);

  // Handle dialog open change — reset form when opening
  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setForm({
        title: '',
        genre: '都市脑洞',
        style: '爽文',
        targetWords: '50000',
        description: '',
      });
      setErrors({});
      setSelectedTemplate(null);
      setTemplatesExpanded(true);
    }
  }, [setOpen]);

  const handleSelectTemplate = useCallback((template: NovelTemplate) => {
    setSelectedTemplate(template.id);
    setForm((prev) => ({
      ...prev,
      genre: template.genre,
      style: template.style,
      targetWords: template.targetWords,
      description: template.description,
    }));
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Partial<FormState> = {};

    if (!form.title.trim()) {
      newErrors.title = '请输入小说标题';
    } else if (form.title.trim().length > 50) {
      newErrors.title = '标题不能超过50个字符';
    }

    const words = parseInt(form.targetWords);
    if (isNaN(words) || words < 1000) {
      newErrors.targetWords = '目标字数至少1000';
    } else if (words > 5000000) {
      newErrors.targetWords = '目标字数不能超过500万';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/novels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          genre: form.genre,
          style: form.style,
          targetWords: parseInt(form.targetWords) || 50000,
          description: form.description.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '创建失败');
      }

      const newNovel = await res.json();
      toast.success(`「${newNovel.title}」创建成功！`);

      // Refresh novels list
      const novelsRes = await fetch('/api/novels');
      if (novelsRes.ok) {
        const novels = await novelsRes.json();
        setNovels(novels);
      }

      // Navigate to workspace
      setCurrentNovel(newNovel);
      setViewMode('workspace');
      setCurrentStep(1);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Sparkles className="size-4 text-white" />
            </div>
            新建小说项目
          </DialogTitle>
          <DialogDescription>
            填写基本信息，开始您的网文创作之旅。创建后可随时修改。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* Popular Templates Section */}
          <div className="space-y-2.5">
            <button
              type="button"
              className="flex items-center justify-between w-full text-left"
              onClick={() => setTemplatesExpanded(!templatesExpanded)}
            >
              <Label className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                <Sparkles className="size-3.5 text-amber-500" />
                热门模板
                <span className="text-xs font-normal text-muted-foreground">快速选择模板开始创作</span>
              </Label>
              {templatesExpanded ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </button>

            {templatesExpanded && (
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((template) => {
                  const isSelected = selectedTemplate === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleSelectTemplate(template)}
                      className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all ${
                        isSelected
                          ? 'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20 shadow-sm shadow-amber-500/10'
                          : 'border-border hover:border-amber-300 dark:hover:border-amber-700 hover:bg-muted/30'
                      }`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${template.iconBg}`}>
                        {template.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold leading-tight truncate ${isSelected ? 'text-amber-700 dark:text-amber-400' : ''}`}>
                          {template.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 leading-relaxed">
                          {template.tagline}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedTemplate && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                已选择「{TEMPLATES.find((t) => t.id === selectedTemplate)?.name}」模板，题材/风格/描述已自动填充，请输入标题后创建
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border/60" />

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="novel-title" className="text-sm font-medium">
              小说标题 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="novel-title"
              placeholder="例如：重生之都市传说"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              onBlur={() => validate()}
              className="h-10"
              maxLength={50}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Genre and Style row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="novel-genre" className="text-sm font-medium">
                题材类型
              </Label>
              <Select
                value={form.genre}
                onValueChange={(value) => setForm((f) => ({ ...f, genre: value }))}
              >
                <SelectTrigger id="novel-genre" className="h-10 w-full">
                  <SelectValue placeholder="选择题材" />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="novel-style" className="text-sm font-medium">
                写作风格
              </Label>
              <Select
                value={form.style}
                onValueChange={(value) => setForm((f) => ({ ...f, style: value }))}
              >
                <SelectTrigger id="novel-style" className="h-10 w-full">
                  <SelectValue placeholder="选择风格" />
                </SelectTrigger>
                <SelectContent>
                  {STYLES.map((style) => (
                    <SelectItem key={style} value={style}>
                      {style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target Words */}
          <div className="space-y-2">
            <Label htmlFor="novel-words" className="text-sm font-medium">
              目标字数
            </Label>
            <div className="relative">
              <Input
                id="novel-words"
                type="number"
                placeholder="50000"
                value={form.targetWords}
                onChange={(e) => setForm((f) => ({ ...f, targetWords: e.target.value }))}
                onBlur={() => validate()}
                className="h-10 pr-10"
                min={1000}
                max={5000000}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                字
              </span>
            </div>
            {errors.targetWords && (
              <p className="text-xs text-destructive">{errors.targetWords}</p>
            )}
            <div className="flex gap-2">
              {[30000, 50000, 100000, 200000].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, targetWords: String(w) }))}
                  className={`rounded-md border px-2 py-0.5 text-[11px] transition-colors ${
                    form.targetWords === String(w)
                      ? 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'border-border text-muted-foreground hover:border-amber-300 hover:text-amber-600 dark:hover:border-amber-700 dark:hover:text-amber-400'
                  }`}
                >
                  {(w / 10000)}万
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="novel-desc" className="text-sm font-medium">
              简介描述
            </Label>
            <Textarea
              id="novel-desc"
              placeholder="简单描述您的故事构思（选填，创建后可在工作台中通过AI辅助完善）"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {form.description.length}/500
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !form.title.trim()}
            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm hover:from-amber-600 hover:to-orange-700 hover:shadow-md transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                创建项目
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
