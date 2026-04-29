'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const GENRES = ['都市脑洞', '玄幻脑洞', '悬疑脑洞', '科幻', '末世', '年代重生', '言情', '其他'];
const STYLES = ['爽文', '严肃', '幽默', '黑暗', '温馨'];

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

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setForm({
        title: '',
        genre: '都市脑洞',
        style: '爽文',
        targetWords: '50000',
        description: '',
      });
      setErrors({});
    }
  }, [open]);

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
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
