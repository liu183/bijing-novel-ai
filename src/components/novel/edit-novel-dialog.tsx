'use client';

import React, { useState, useCallback } from 'react';
import { type NovelData } from '@/store/app-store';
import { GENRES, STYLES } from '@/lib/constants';
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
import { Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';


interface FormState {
  _novelId?: string;
  title: string;
  genre: string;
  style: string;
  targetWords: string;
  description: string;
}

interface EditNovelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  novel: NovelData | null;
  onSave: (data: Partial<NovelData>) => void;
}

export function EditNovelDialog({
  open,
  onOpenChange,
  novel,
  onSave,
}: EditNovelDialogProps) {
  const [form, setForm] = useState<FormState>({
    title: '',
    genre: '',
    style: '',
    targetWords: '',
    description: '',
  });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [saving, setSaving] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  // Populate form when novel changes or dialog opens
  if (open && novel && (!prevOpen || novel.id !== form._novelId)) {
    setForm({
      _novelId: novel.id,
      title: novel.title || '',
      genre: novel.genre || '',
      style: novel.style || '',
      targetWords: String(novel.targetWords || ''),
      description: novel.description || '',
    });
    setErrors({});
    setSaving(false);
  }
  if (open !== prevOpen) {
    setPrevOpen(open);
  }

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

  const handleSubmit = useCallback(async () => {
    if (!novel || !validate()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/novels/${novel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          genre: form.genre,
          style: form.style,
          targetWords: parseInt(form.targetWords) || novel.targetWords,
          description: form.description.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '保存失败');
      }

      const updatedNovel = await res.json();
      toast.success(`「${updatedNovel.title}」已保存`);
      onSave(updatedNovel);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }, [novel, form, validate, onSave, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Pencil className="size-4 text-white" />
            </div>
            编辑小说项目
          </DialogTitle>
          <DialogDescription>
            修改小说的基本信息，保存后将立即生效。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-novel-title" className="text-sm font-medium">
              小说标题 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-novel-title"
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
              <Label htmlFor="edit-novel-genre" className="text-sm font-medium">
                题材类型
              </Label>
              <Select
                value={form.genre}
                onValueChange={(value) => setForm((f) => ({ ...f, genre: value }))}
              >
                <SelectTrigger id="edit-novel-genre" className="h-10 w-full">
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
              <Label htmlFor="edit-novel-style" className="text-sm font-medium">
                写作风格
              </Label>
              <Select
                value={form.style}
                onValueChange={(value) => setForm((f) => ({ ...f, style: value }))}
              >
                <SelectTrigger id="edit-novel-style" className="h-10 w-full">
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
            <Label htmlFor="edit-novel-words" className="text-sm font-medium">
              目标字数
            </Label>
            <div className="relative">
              <Input
                id="edit-novel-words"
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
            <Label htmlFor="edit-novel-desc" className="text-sm font-medium">
              简介描述
            </Label>
            <Textarea
              id="edit-novel-desc"
              placeholder="简单描述您的故事构思"
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
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !form.title.trim()}
            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm hover:from-amber-600 hover:to-orange-700 hover:shadow-md transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Pencil className="size-4" />
                保存修改
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
