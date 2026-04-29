'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  BookOpen,
  Loader2,
  Hash,
  Settings,
  Type,
  AlignJustify,
  CaseSensitive,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Reader Preferences ───
interface ReaderPrefs {
  fontSize: 'small' | 'medium' | 'large';
  lineHeight: 'compact' | 'normal' | 'relaxed';
  fontFamily: 'sans' | 'serif';
}

const READER_PREFS_KEY = 'reader-prefs';
const DEFAULT_PREFS: ReaderPrefs = {
  fontSize: 'medium',
  lineHeight: 'normal',
  fontFamily: 'serif',
};

function loadReaderPrefs(): ReaderPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const stored = localStorage.getItem(READER_PREFS_KEY);
    if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch {
    // ignore
  }
  return DEFAULT_PREFS;
}

function saveReaderPrefs(prefs: ReaderPrefs) {
  try {
    localStorage.setItem(READER_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

const fontSizeMap: Record<string, string> = {
  small: 'text-[15px]',
  medium: 'text-[17px]',
  large: 'text-[20px]',
};

const lineHeightMap: Record<string, string> = {
  compact: 'leading-[1.7]',
  normal: 'leading-[2]',
  relaxed: 'leading-[2.4]',
};

const fontFamilyMap: Record<string, string> = {
  sans: 'font-sans',
  serif: 'font-serif',
};

export function ReaderView() {
  const currentNovel = useAppStore((s) => s.currentNovel);
  const setCurrentNovel = useAppStore((s) => s.setCurrentNovel);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const isChapterGenerating = useAppStore((s) => s.isChapterGenerating);
  const setIsChapterGenerating = useAppStore((s) => s.setIsChapterGenerating);
  const generateChapterNumber = useAppStore((s) => s.generateChapterNumber);
  const setGenerateChapterNumber = useAppStore((s) => s.setGenerateChapterNumber);
  const selectedModel = useAppStore((s) => s.selectedModel);

  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [localChapterNum, setLocalChapterNum] = useState(1);
  const [contentKey, setContentKey] = useState(0);
  const [readerPrefs, setReaderPrefs] = useState<ReaderPrefs>(() => loadReaderPrefs());
  const updatePref = useCallback(<K extends keyof ReaderPrefs>(key: K, value: ReaderPrefs[K]) => {
    setReaderPrefs((prev) => {
      const next = { ...prev, [key]: value };
      saveReaderPrefs(next);
      return next;
    });
  }, []);

  const chapters = currentNovel?.chapters || [];
  const currentChapter = chapters[currentChapterIndex] || null;
  const hasChapters = chapters.length > 0;
  const isFirstChapter = currentChapterIndex === 0;
  const isLastChapter = currentChapterIndex === chapters.length - 1;

  // Reset chapter index when novel changes
  useEffect(() => {
    setCurrentChapterIndex(0);
    setContentKey((k) => k + 1);
  }, [currentNovel?.id]);

  // Calculate next chapter number
  const nextChapterNumber = useMemo(() => {
    if (chapters.length === 0) return 1;
    return Math.max(...chapters.map((c) => c.number)) + 1;
  }, [chapters]);

  // Open generate dialog
  const openGenerateDialog = useCallback(() => {
    setLocalChapterNum(nextChapterNumber);
    setGenerateChapterNumber(nextChapterNumber);
    setGenerateDialogOpen(true);
  }, [nextChapterNumber, setGenerateChapterNumber]);

  // Generate chapter
  const handleGenerate = useCallback(async () => {
    if (!currentNovel || isChapterGenerating) return;
    setIsChapterGenerating(true);
    try {
      const res = await fetch(`/api/novels/${currentNovel.id}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterNumber: localChapterNum, model: selectedModel }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '生成失败');
      }
      toast.success(`第${localChapterNum}章 生成成功！`);

      // Refresh novel data
      const novelRes = await fetch(`/api/novels/${currentNovel.id}`);
      if (novelRes.ok) {
        const updatedNovel = await novelRes.json();
        setCurrentNovel(updatedNovel);
        // Navigate to the new chapter
        const newIdx = (updatedNovel.chapters || []).findIndex(
          (c: { number: number }) => c.number === localChapterNum
        );
        if (newIdx >= 0) {
          setCurrentChapterIndex(newIdx);
          setContentKey((k) => k + 1);
        }
      }
      setGenerateDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '章节生成失败');
    } finally {
      setIsChapterGenerating(false);
    }
  }, [currentNovel, localChapterNum, isChapterGenerating, selectedModel, setIsChapterGenerating, setCurrentNovel]);

  // Navigation
  const goToPrevChapter = useCallback(() => {
    if (!isFirstChapter) {
      setCurrentChapterIndex((i) => i - 1);
      setContentKey((k) => k + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isFirstChapter]);

  const goToNextChapter = useCallback(() => {
    if (!isLastChapter) {
      setCurrentChapterIndex((i) => i + 1);
      setContentKey((k) => k + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isLastChapter]);

  const handleChapterSelect = useCallback(
    (value: string) => {
      const idx = chapters.findIndex((c) => c.number === parseInt(value));
      if (idx >= 0) {
        setCurrentChapterIndex(idx);
        setContentKey((k) => k + 1);
      }
    },
    [chapters]
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only handle when not typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        goToPrevChapter();
      } else if (e.key === 'ArrowRight') {
        goToNextChapter();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goToPrevChapter, goToNextChapter]);

  // Format word count
  const formatWordCount = (count: number) => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万字`;
    }
    return `${count.toLocaleString()}字`;
  };

  // Split content into paragraphs
  const renderContent = (content: string) => {
    return content.split('\n').map((paragraph, idx) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return <div key={idx} className="h-4" />;
      return (
        <p
          key={idx}
          className={`${fontSizeMap[readerPrefs.fontSize]} ${lineHeightMap[readerPrefs.lineHeight]} tracking-wide text-foreground/90 indent-[2em] mb-0`}
        >
          {trimmed}
        </p>
      );
    });
  };

  // ─── Empty State ───
  if (!currentNovel) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 mx-auto">
            <BookOpen className="size-10 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold">未选择小说</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            请先从仪表盘选择一个小说项目
          </p>
          <Button
            variant="outline"
            onClick={() => setViewMode('dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="size-4" />
            返回仪表盘
          </Button>
        </div>
      </div>
    );
  }

  // ─── No Chapters Empty State ───
  if (!hasChapters && !isChapterGenerating) {
    return (
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="sticky top-14 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('workspace')}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">回到工作台</span>
            </Button>
            <h1 className="text-sm font-medium text-foreground/80 truncate max-w-[200px] sm:max-w-none">
              {currentNovel.title}
            </h1>
            <Button
              size="sm"
              onClick={openGenerateDialog}
              className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm hover:from-amber-600 hover:to-orange-700 hover:shadow-md transition-all"
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">生成新章节</span>
            </Button>
          </div>
        </div>

        {/* Empty content */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-5">
            <div className="relative mx-auto w-32 h-32">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-100 via-orange-50 to-orange-100 dark:from-amber-900/20 dark:via-orange-900/10 dark:to-orange-900/20 rotate-6" />
              <div className="relative flex h-full w-full items-center justify-center rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200/50 dark:border-amber-700/30">
                <BookOpen className="size-14 text-amber-500/70 dark:text-amber-400/70" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">尚无章节内容</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                这本书还没有任何章节，点击下方按钮开始AI创作之旅
              </p>
            </div>
            <Button
              onClick={openGenerateDialog}
              size="lg"
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md hover:from-amber-600 hover:to-orange-700 hover:shadow-lg transition-all h-11 px-6"
            >
              <Sparkles className="size-4" />
              去工作台生成第一章
            </Button>
          </div>
        </div>

        {/* Generate Dialog */}
        <GenerateChapterDialog
          open={generateDialogOpen}
          onOpenChange={setGenerateDialogOpen}
          chapterNumber={localChapterNum}
          onChapterNumberChange={setLocalChapterNum}
          onGenerate={handleGenerate}
          isGenerating={isChapterGenerating}
        />
      </div>
    );
  }

  // ─── Main Reading View ───
  return (
    <div className="flex flex-1 flex-col">
      {/* Top Bar */}
      <div className="sticky top-14 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          {/* Left: Back */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('workspace')}
            className="gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">回到工作台</span>
          </Button>

          {/* Center: Chapter Selector */}
          {chapters.length > 1 && (
            <div className="absolute left-1/2 -translate-x-1/2">
              <Select
                value={String(currentChapter?.number ?? '')}
                onValueChange={handleChapterSelect}
              >
                <SelectTrigger className="w-auto min-w-[140px] h-8 text-sm font-medium bg-muted/50 border-0 shadow-none">
                  <SelectValue placeholder="选择章节" />
                </SelectTrigger>
                <SelectContent className="max-h-[240px]">
                  {chapters.map((ch) => (
                    <SelectItem key={ch.number} value={String(ch.number)}>
                      第{ch.number}章 {ch.title.replace(`第${ch.number}章`, '').trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Right: Generate */}
          <Button
            size="sm"
            onClick={openGenerateDialog}
            className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm hover:from-amber-600 hover:to-orange-700 hover:shadow-md transition-all shrink-0"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">生成新章节</span>
          </Button>
        </div>
      </div>

      {/* Reading Preferences Bar */}
      <div className="border-b border-border/40 bg-background/60 backdrop-blur-sm">
        <div className="mx-auto flex h-10 max-w-4xl items-center justify-center px-4 sm:px-6">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8"
              >
                <Settings className="size-3.5" />
                阅读设置
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="center">
              <div className="space-y-4">
                {/* Font Size */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Type className="size-3.5 text-muted-foreground" />
                    字号
                  </div>
                  <div className="flex gap-1.5">
                    {(['small', 'medium', 'large'] as const).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => updatePref('fontSize', sz)}
                        className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                          readerPrefs.fontSize === sz
                            ? 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'border-border text-muted-foreground hover:border-amber-300 hover:text-amber-600'
                        }`}
                      >
                        {sz === 'small' ? '小' : sz === 'medium' ? '中' : '大'}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Line Height */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <AlignJustify className="size-3.5 text-muted-foreground" />
                    行距
                  </div>
                  <div className="flex gap-1.5">
                    {(['compact', 'normal', 'relaxed'] as const).map((lh) => (
                      <button
                        key={lh}
                        onClick={() => updatePref('lineHeight', lh)}
                        className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                          readerPrefs.lineHeight === lh
                            ? 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'border-border text-muted-foreground hover:border-amber-300 hover:text-amber-600'
                        }`}
                      >
                        {lh === 'compact' ? '紧凑' : lh === 'normal' ? '适中' : '宽松'}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Font Family */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <CaseSensitive className="size-3.5 text-muted-foreground" />
                    字体
                  </div>
                  <div className="flex gap-1.5">
                    {(['sans', 'serif'] as const).map((ff) => (
                      <button
                        key={ff}
                        onClick={() => updatePref('fontFamily', ff)}
                        className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                          readerPrefs.fontFamily === ff
                            ? 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'border-border text-muted-foreground hover:border-amber-300 hover:text-amber-600'
                        }`}
                        style={{ fontFamily: ff === 'serif' ? 'serif' : 'sans-serif' }}
                      >
                        {ff === 'sans' ? '黑体' : '宋体'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Reading Area */}
      <div className="flex-1 bg-stone-50/50 dark:bg-stone-950/50">
        <div className="mx-auto max-w-[720px] px-5 sm:px-8 py-10 sm:py-16">
          {currentChapter ? (
            <article key={contentKey} className="animate-in fade-in duration-300">
              {/* Chapter Header */}
              <header className="mb-10 text-center">
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 mb-3 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/30">
                  <Hash className="size-3" />
                  第 {currentChapter.number} 章
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-snug tracking-tight">
                  {currentChapter.title}
                </h1>
                {currentChapter.wordCount > 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    共 {formatWordCount(currentChapter.wordCount)}
                  </p>
                )}
              </header>

              {/* Chapter Content */}
              <div className={`space-y-1 ${fontFamilyMap[readerPrefs.fontFamily]} text-foreground/90`}>
                {renderContent(currentChapter.content)}
              </div>

              {/* Chapter Footer */}
              <footer className="mt-16 pt-8 border-t border-border/40">
                <div className="text-center text-sm text-muted-foreground mb-6">
                  {formatWordCount(currentChapter.wordCount)} · 第{currentChapter.number}章 完
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between gap-4">
                  <Button
                    variant="outline"
                    onClick={goToPrevChapter}
                    disabled={isFirstChapter}
                    className="gap-2 flex-1 h-10 max-w-[180px] mx-auto sm:mx-0 border-border/60 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-30"
                  >
                    <ChevronLeft className="size-4" />
                    上一章
                  </Button>
                  <span className="text-sm text-muted-foreground font-medium shrink-0">
                    {currentChapter.number} / {chapters.length}
                  </span>
                  <Button
                    variant="outline"
                    onClick={goToNextChapter}
                    disabled={isLastChapter}
                    className="gap-2 flex-1 h-10 max-w-[180px] mx-auto sm:mx-0 border-border/60 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-30"
                  >
                    下一章
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </footer>
            </article>
          ) : (
            /* Chapter loading skeleton */
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="text-center space-y-3 mb-10">
                <Skeleton className="h-6 w-20 mx-auto rounded-full" />
                <Skeleton className="h-9 w-64 mx-auto" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
              <div className="space-y-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-5 w-full"
                    style={{ opacity: 1 - i * 0.05 }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Keyboard hint */}
          {!isFirstChapter && !isLastChapter && (
            <p className="text-center text-xs text-muted-foreground/50 mt-12">
              使用键盘 ← → 切换章节
            </p>
          )}
        </div>
      </div>

      {/* Generate Dialog */}
      <GenerateChapterDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        chapterNumber={localChapterNum}
        onChapterNumberChange={setLocalChapterNum}
        onGenerate={handleGenerate}
        isGenerating={isChapterGenerating}
      />
    </div>
  );
}

// ─── Generate Chapter Dialog ───
interface GenerateChapterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterNumber: number;
  onChapterNumberChange: (num: number) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

function GenerateChapterDialog({
  open,
  onOpenChange,
  chapterNumber,
  onChapterNumberChange,
  onGenerate,
  isGenerating,
}: GenerateChapterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Sparkles className="size-3.5 text-white" />
            </div>
            生成新章节
          </DialogTitle>
          <DialogDescription>
            AI 将根据小说大纲和已有内容为您生成新章节。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">章节编号</label>
            <Input
              type="number"
              min={1}
              value={chapterNumber}
              onChange={(e) =>
                onChapterNumberChange(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              输入要生成的章节编号。如该章节已有内容将被覆盖。
            </p>
          </div>

          {isGenerating && (
            <div className="flex items-center justify-center gap-3 py-4 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/20">
              <Loader2 className="size-5 text-amber-500 animate-spin" />
              <div className="text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  AI 正在创作中...
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  预计需要 30-60 秒，请勿关闭页面
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            取消
          </Button>
          <Button
            onClick={onGenerate}
            disabled={isGenerating}
            className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm hover:from-amber-600 hover:to-orange-700 hover:shadow-md transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                开始生成
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
