'use client';

import React from 'react';
import { GENRES, STYLES } from '@/lib/constants';
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

/** Quick-select word count options displayed as toggle buttons */
const QUICK_WORD_OPTIONS = [30000, 50000, 100000, 200000] as const;

export interface NovelFormState {
  _novelId?: string;
  title: string;
  genre: string;
  style: string;
  targetWords: string;
  description: string;
}

export type NovelFormMode = 'create' | 'edit';

interface NovelFormFieldsProps {
  form: NovelFormState;
  setForm: React.Dispatch<React.SetStateAction<NovelFormState>>;
  errors: Partial<Record<string, string>>;
  mode: NovelFormMode;
  /** Optional callback to clear a form-level error string */
  onFieldChange?: () => void;
}

/** Shared form fields used by both CreateNovelDialog and EditNovelDialog */
export function NovelFormFields({
  form,
  setForm,
  errors,
  mode,
  onFieldChange,
}: NovelFormFieldsProps) {
  const idPrefix = mode === 'create' ? 'novel' : 'edit-novel';
  const placeholder = mode === 'create'
    ? '简单描述您的故事构思（选填，创建后可在工作台中通过AI辅助完善）'
    : '简单描述您的故事构思';

  const handleGenreChange = (value: string) => {
    setForm((f) => ({ ...f, genre: value }));
    onFieldChange?.();
  };

  const handleStyleChange = (value: string) => {
    setForm((f) => ({ ...f, style: value }));
    onFieldChange?.();
  };

  const handleTargetWordsChange = (value: string) => {
    setForm((f) => ({ ...f, targetWords: value }));
    onFieldChange?.();
  };

  const handleDescriptionChange = (value: string) => {
    setForm((f) => ({ ...f, description: value }));
    onFieldChange?.();
  };

  return (
    <>
      {/* Genre and Style row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-genre`} className="text-sm font-medium">
            题材类型
          </Label>
          <Select
            value={form.genre}
            onValueChange={handleGenreChange}
          >
            <SelectTrigger id={`${idPrefix}-genre`} className="h-10 w-full">
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
          <Label htmlFor={`${idPrefix}-style`} className="text-sm font-medium">
            写作风格
          </Label>
          <Select
            value={form.style}
            onValueChange={handleStyleChange}
          >
            <SelectTrigger id={`${idPrefix}-style`} className="h-10 w-full">
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
        <Label htmlFor={`${idPrefix}-words`} className="text-sm font-medium">
          目标字数
        </Label>
        <div className="relative">
          <Input
            id={`${idPrefix}-words`}
            type="number"
            placeholder="50000"
            value={form.targetWords}
            onChange={(e) => handleTargetWordsChange(e.target.value)}
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
          {QUICK_WORD_OPTIONS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => handleTargetWordsChange(String(w))}
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
        <Label htmlFor={`${idPrefix}-desc`} className="text-sm font-medium">
          简介描述
        </Label>
        <Textarea
          id={`${idPrefix}-desc`}
          placeholder={placeholder}
          value={form.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          className="min-h-[100px] resize-none"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground text-right">
          {form.description.length}/500
        </p>
      </div>
    </>
  );
}
