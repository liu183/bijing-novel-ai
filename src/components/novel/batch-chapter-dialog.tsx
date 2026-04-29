'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { fireConfetti } from '@/lib/confetti';
import { formatWordCount, formatTime } from '@/lib/format';

// ─── Types ───
interface BatchChapterResult {
  chapterNumber: number;
  title: string;
  wordCount: number;
  status: 'completed' | 'failed';
  error?: string;
}

interface BatchResponse {
  success: boolean;
  total: number;
  completed: number;
  failed: number;
  chapters: BatchChapterResult[];
}

interface BatchChapterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WORDS_PER_CHAPTER_MIN = 3000;
const WORDS_PER_CHAPTER_MAX = 5000;

export function BatchChapterDialog({ open, onOpenChange }: BatchChapterDialogProps) {
  const currentNovel = useAppStore((s) => s.currentNovel);
  const setCurrentNovel = useAppStore((s) => s.setCurrentNovel);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setIsChapterGenerating = useAppStore((s) => s.setIsChapterGenerating);

  const [startChapter, setStartChapter] = useState(1);
  const [endChapter, setEndChapter] = useState(3);
  const [loading, setLoading] = useState(false);
  const [currentProgress, setCurrentProgress] = useState('');
  const [results, setResults] = useState<BatchResponse | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalChapters = Math.max(0, endChapter - startChapter + 1);
  const estimatedMinWords = totalChapters * WORDS_PER_CHAPTER_MIN;
  const estimatedMaxWords = totalChapters * WORDS_PER_CHAPTER_MAX;

  // Validation
  const validationError = (() => {
    if (startChapter < 1) return '起始章节不能小于 1';
    if (endChapter < startChapter) return '结束章节不能小于起始章节';
    if (totalChapters > 20) return '单次最多生成 20 章';
    if (totalChapters <= 0) return '请设置有效的章节范围';
    return null;
  })();

  // Reset on dialog open
  useEffect(() => {
    if (open) {
      // Set defaults based on existing chapters
      const existingCount = currentNovel?.chapters?.length || 0;
      const defaultStart = existingCount + 1;
      const defaultEnd = Math.min(defaultStart + 2, defaultStart + 19);
      setStartChapter(defaultStart);
      setEndChapter(defaultEnd);
      setLoading(false);
      setCurrentProgress('');
      setResults(null);
      setElapsedTime(0);
    }
  }, [open, currentNovel?.chapters?.length]);

  // Timer during loading
  useEffect(() => {
    if (loading) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading]);

  const handleStartBatch = useCallback(async () => {
    if (!currentNovel || validationError) return;

    setLoading(true);
    setResults(null);
    setElapsedTime(0);
    setIsChapterGenerating(true);

    const total = endChapter - startChapter + 1;

    try {
      // Call the batch API
      const res = await fetch(`/api/novels/${currentNovel.id}/chapters-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startChapter,
          endChapter,
          model: selectedModel,
        }),
      });

      const data: BatchResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.success === false && data.chapters
          ? '部分章节生成失败'
          : '批量生成失败');
      }

      setResults(data);

      // Show summary toast
      if (data.failed === 0) {
        toast.success(`批量生成完成！共 ${data.completed} 章全部成功`);
        // Celebrate with confetti when all chapters succeed
        setTimeout(fireConfetti, 300);
      } else {
        toast.warning(`批量生成完成：${data.completed} 章成功，${data.failed} 章失败`);
      }

      // Refresh novel data
      const novelRes = await fetch(`/api/novels/${currentNovel.id}`);
      if (novelRes.ok) {
        const updatedNovel = await novelRes.json();
        setCurrentNovel(updatedNovel);
      }
    } catch (error) {
      console.error('Batch chapter generation failed:', error);
      toast.error(error instanceof Error ? error.message : '批量生成失败，请重试');
    } finally {
      setLoading(false);
      setCurrentProgress('');
      setIsChapterGenerating(false);
    }
  }, [currentNovel, startChapter, endChapter, selectedModel, validationError, setCurrentNovel, setIsChapterGenerating]);

  const handleClose = useCallback(() => {
    if (loading) return; // prevent closing during generation
    onOpenChange(false);
  }, [loading, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shrink-0">
              <BookOpen className="size-4 text-white" />
            </div>
            <div>
              <span>批量生成章节</span>
              <p className="text-sm font-normal text-muted-foreground mt-0.5">
                AI 自动连续生成多个章节
              </p>
            </div>
          </DialogTitle>
          <DialogDescription className="text-xs">
            设置章节范围后，AI 将按顺序依次生成每一章。每章约 3000-5000 字。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Configuration Section */}
          {!results && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">
                    起始章节
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={startChapter}
                    onChange={(e) =>
                      setStartChapter(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    disabled={loading}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">
                    结束章节
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={endChapter}
                    onChange={(e) =>
                      setEndChapter(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    disabled={loading}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Validation Error */}
              <AnimatePresence>
                {validationError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-3 py-2.5"
                  >
                    <AlertCircle className="size-4 text-red-500 shrink-0" />
                    <p className="text-xs text-red-600 dark:text-red-400">{validationError}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Estimated Info */}
              {!validationError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg bg-muted/50 border border-border/50 px-3 py-3 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">章节数量</span>
                    <span className="font-medium text-foreground">
                      共 {totalChapters} 章
                      {totalChapters > 5 && (
                        <span className="text-amber-600 dark:text-amber-400 ml-1">
                          (预计需要较长时间)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">预计总字数</span>
                    <span className="font-medium text-foreground">
                      {formatWordCount(estimatedMinWords)} ~ {formatWordCount(estimatedMaxWords)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">预计耗时</span>
                    <span className="font-medium text-foreground">
                      约 {totalChapters * 0.5} ~ {totalChapters * 1.5} 分钟
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Current AI Model */}
              {selectedModel && (
                <p className="text-xs text-muted-foreground">
                  使用模型：<span className="font-medium text-foreground">{selectedModel}</span>
                </p>
              )}
            </div>
          )}

          {/* Loading Progress Section */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 py-2"
            >
              <div className="rounded-lg bg-amber-50/80 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="size-4 text-amber-500 animate-spin" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      正在批量生成中...
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatTime(elapsedTime)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 rounded-full bg-amber-100 dark:bg-amber-900/30 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500"
                    animate={{
                      width: `${Math.min(95, (elapsedTime / (totalChapters * 60)) * 100)}%`,
                    }}
                    transition={{ duration: 1, ease: 'linear' }}
                    style={{
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s infinite linear',
                    }}
                  />
                </div>

                {/* Chapter Progress Indicators */}
                <div className="space-y-1.5">
                  {Array.from({ length: totalChapters }).map((_, i) => {
                    const chapterNum = startChapter + i;
                    // Simulate which chapters might be done based on time
                    const avgTimePerChapter = 45; // seconds
                    const chaptersDone = Math.min(
                      Math.floor(elapsedTime / avgTimePerChapter),
                      totalChapters
                    );
                    const isCurrent = i === chaptersDone && chaptersDone < totalChapters;
                    const isDone = i < chaptersDone;

                    return (
                      <motion.div
                        key={chapterNum}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-2 text-xs"
                      >
                        {isDone ? (
                          <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                        ) : isCurrent ? (
                          <Loader2 className="size-3.5 text-amber-500 animate-spin shrink-0" />
                        ) : (
                          <div className="size-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                        )}
                        <span className={isDone ? 'text-muted-foreground line-through' : isCurrent ? 'text-amber-700 dark:text-amber-400 font-medium' : 'text-muted-foreground/60'}>
                          {isDone ? `第${chapterNum}章 已完成` : isCurrent ? `正在生成第 ${chapterNum}/${totalChapters} 章...` : `第${chapterNum}章 等待中`}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  请勿关闭页面，批量生成可能需要较长时间
                </p>
                <p className="text-[10px] text-muted-foreground/40 text-center mt-1">
                  进度为估算值，实际可能有所差异
                </p>
              </div>
            </motion.div>
          )}

          {/* Results Section */}
          {results && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 py-2"
            >
              {/* Summary */}
              <div className={`rounded-lg border p-4 ${
                results.failed === 0
                  ? 'bg-emerald-50/80 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-700/20'
                  : 'bg-amber-50/80 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-700/20'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  {results.failed === 0 ? (
                    <CheckCircle2 className="size-5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="size-5 text-amber-500" />
                  )}
                  <span className="text-sm font-semibold">
                    {results.failed === 0 ? '全部生成完成' : '部分章节生成失败'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    成功 <span className="font-medium text-emerald-600 dark:text-emerald-400">{results.completed}</span> 章
                  </span>
                  <span>
                    失败 <span className="font-medium text-red-600 dark:text-red-400">{results.failed}</span> 章
                  </span>
                  <span>
                    耗时 <span className="font-medium text-foreground">{formatTime(elapsedTime)}</span>
                  </span>
                </div>
              </div>

              <Separator />

              {/* Chapter Details */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">章节详情</h4>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-1.5">
                    {results.chapters.map((chapter, idx) => (
                      <motion.div
                        key={chapter.chapterNumber}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                          chapter.status === 'completed'
                            ? 'bg-background border-border/50'
                            : 'bg-red-50/50 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {chapter.status === 'completed' ? (
                            <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="size-3.5 text-red-500 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">
                              第{chapter.chapterNumber}章 {chapter.title.replace(`第${chapter.chapterNumber}章`, '').trim()}
                            </p>
                            {chapter.status === 'failed' && chapter.error && (
                              <p className="text-[10px] text-red-500/80 truncate max-w-[300px]" title={chapter.error}>
                                {chapter.error}
                              </p>
                            )}
                          </div>
                        </div>
                        {chapter.status === 'completed' && (
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">
                            {formatWordCount(chapter.wordCount)}
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Total word count */}
              <div className="text-center text-xs text-muted-foreground">
                总计 {formatWordCount(
                  results.chapters.reduce((sum, ch) => sum + ch.wordCount, 0)
                )}
              </div>
            </motion.div>
          )}
        </div>

        <DialogFooter className="gap-2 shrink-0 pt-2 border-t">
          {!loading && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {results ? '关闭' : '取消'}
            </Button>
          )}
          {!results && (
            <Button
              onClick={handleStartBatch}
              disabled={loading || !!validationError}
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  生成中... {formatTime(elapsedTime)}
                </>
              ) : (
                <>
                  <BookOpen className="size-4" />
                  开始批量生成
                </>
              )}
            </Button>
          )}
          {results && !loading && (
            <Button
              onClick={() => {
                setResults(null);
                setStartChapter(endChapter + 1);
                setEndChapter(endChapter + 3);
              }}
              variant="outline"
              className="gap-2 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30"
            >
              继续生成
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
