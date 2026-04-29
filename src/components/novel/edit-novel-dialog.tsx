'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { type NovelData } from '@/store/app-store';
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
import { Label } from '@/components/ui/label';
import { Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getExportHistory, type ExportHistoryEntry } from '@/lib/export-utils';
import { validateNovelForm } from '@/lib/format';
import { NovelFormFields, type NovelFormState } from './novel-form-fields';




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
  const [form, setForm] = useState<NovelFormState>({
    title: '',
    genre: '',
    style: '',
    targetWords: '',
    description: '',
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);
  // Populate form when dialog opens or novel changes
  useEffect(() => {
    if (open && novel) {
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
  }, [open, novel?.id]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setForm({
        title: '',
        genre: '',
        style: '',
        targetWords: '',
        description: '',
      });
    }
  }, [open]);

  const validate = useCallback((): boolean => {
    const { errors, valid } = validateNovelForm(form);
    setErrors(errors);
    return valid;
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存失败');
      const updatedNovel = data;
      toast.success(`「${updatedNovel.title}」已保存`);
      onSave(updatedNovel);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }, [novel, form, validate, onSave, onOpenChange]);

  // ─── Export History ───
  const [exportHistory, setExportHistory] = useState<Array<{ format: string; timestamp: number }>>([]);

  useEffect(() => {
    if (!open || !novel) return;
    const all = getExportHistory();
    const filtered = all
      .filter((e: ExportHistoryEntry) => e.novelId === novel.id)
      .slice(0, 3)
      .map((e: ExportHistoryEntry) => ({ format: e.format, timestamp: e.timestamp }));
    setExportHistory(filtered);
  }, [open, novel]);

  const formatExportLabel = (format: string) => {
    switch (format) {
      case 'txt': return 'TXT';
      case 'docx': return 'DOCX';
      case 'docx-formatted': return 'DOCX（精排版）';
      default: return format.toUpperCase();
    }
  };

  const formatExportTime = (ts: number) => {
    try {
      return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: zhCN });
    } catch {
      return '';
    }
  };

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

          {/* Shared Form Fields: Genre, Style, Target Words, Description */}
          <NovelFormFields
            form={form}
            setForm={setForm}
            errors={errors}
            mode="edit"
          />
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

        {/* Export History */}
        {exportHistory.length > 0 && (
          <div className="border-t mt-2 pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">导出记录</p>
            <div className="space-y-1.5">
              {exportHistory.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-muted-foreground/70">
                  <span>{formatExportLabel(e.format)}</span>
                  <span>{formatExportTime(e.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
