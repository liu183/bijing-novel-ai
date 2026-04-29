'use client';

import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
import { useAppStore, type NovelData } from '@/store/app-store';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BookOpen,
  ListChecks,
  FileText,
  Target,
  Plus,
  Sparkles,
  Trash2,
  ArrowRight,
  Calendar,
  Pencil,
  Search,
  Download,
  FileType,
  FileType2,
  Bot,
  Settings2,
  Loader2,
  CheckCircle2,
  Zap,
  Shield,
  Copy,
  BookMarked,
  Wand2,
  Monitor,
  Pin,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { EditNovelDialog } from './edit-novel-dialog';
import { StatsChart } from './stats-chart';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { exportNovelToDocx } from '@/lib/export-docx';
import { exportNovelToDocxFormatted } from '@/lib/export-docx-formatted';
import { addExportHistory } from '@/lib/export-utils';
import { TOTAL_STEPS, genreColors } from '@/lib/constants';

const statusConfig: Record<NovelData['status'], { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  writing: { label: '创作中', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  completed: { label: '已完成', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  archived: { label: '已归档', className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500' },
};

// Extract helper functions outside the component for stability
function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'yyyy-MM-dd', { locale: zhCN });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'yyyy-MM-dd HH:mm', { locale: zhCN });
  } catch {
    return dateStr;
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: zhCN });
  } catch {
    return formatDate(dateStr);
  }
}



// Shared TXT export logic
async function exportNovelToTxt(data: { steps: { stepNumber: number; title: string; content: string }[]; chapters: { number: number; title: string; content: string }[] }, novel: NovelData) {
  const sep = '='.repeat(40);
  const dashSep = '-'.repeat(40);
  let txt = '';
  txt += `${sep}\n`;
  txt += `  ${novel.title}\n`;
  txt += `${sep}\n`;
  txt += `题材: ${novel.genre} · 风格: ${novel.style}\n`;
  txt += `目标字数: ${novel.targetWords}字\n`;
  txt += `创建时间: ${novel.createdAt}\n`;
  txt += `${dashSep}\n\n`;

  // Steps section
  txt += `【创作步骤】\n\n`;
  if (data.steps && data.steps.length > 0) {
    data.steps.forEach((step, idx) => {
      txt += `=== 第${idx + 1}步: ${step.title || `步骤${step.stepNumber || idx + 1}`} ===\n`;
      txt += `${step.content || '(无内容)'}\n\n`;
    });
  } else {
    txt += '(暂无创作步骤)\n\n';
  }

  // Chapters section
  txt += `【章节内容】\n\n`;
  if (data.chapters && data.chapters.length > 0) {
    data.chapters.forEach((ch) => {
      txt += `--- 第${ch.number}章 ${ch.title} ---\n`;
      txt += `${ch.content || '(无内容)'}\n\n`;
    });
  } else {
    txt += '(暂无章节内容)\n\n';
  }

  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${novel.title}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function DashboardView() {
  const novels = useAppStore((s) => s.novels);
  const setNovels = useAppStore((s) => s.setNovels);
  const setCurrentNovel = useAppStore((s) => s.setCurrentNovel);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const setCreateDialogOpen = useAppStore((s) => s.setCreateDialogOpen);
  const setSelectedTemplate = useAppStore((s) => s.setSelectedTemplate);
  const setLastOpenedNovelId = useAppStore((s) => s.setLastOpenedNovelId);
  const lastOpenedNovelId = useAppStore((s) => s.lastOpenedNovelId);
  const [loading, setLoading] = useState(true);
  const [editingNovel, setEditingNovel] = useState<NovelData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGenre, setFilterGenre] = useState<string | null>(null);
  const [pinnedNovelIds, setPinnedNovelIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('bijing-pinned-novels');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [displayCount, setDisplayCount] = useState(6);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 6;

  const togglePinnedNovel = useCallback((id: string) => {
    setPinnedNovelIds((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      localStorage.setItem('bijing-pinned-novels', JSON.stringify(next));
      return next;
    });
  }, []);

  const fetchNovels = useCallback(async () => {
    try {
      const res = await fetch('/api/novels');
      if (res.ok) {
        const data = await res.json();
        setNovels(data);
      }
    } catch (error) {
      console.error('Failed to fetch novels:', error);
      toast.error('获取小说列表失败');
    } finally {
      setLoading(false);
    }
  }, [setNovels]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    await new Promise((r) => setTimeout(r, 400));
    setDisplayCount((prev) => prev + PAGE_SIZE);
    setLoadingMore(false);
  }, [loadingMore]);

  const handleEditNovel = (novel: NovelData) => {
    setEditingNovel(novel);
    setEditDialogOpen(true);
  };

  const handleEditSave = (updatedNovel: Partial<NovelData>) => {
    // Update the novels list with the saved data
    setNovels(
      novels.map((n) => (n.id === updatedNovel.id ? { ...n, ...updatedNovel } : n))
    );
    // Also update currentNovel if it matches
    setCurrentNovel(useAppStore.getState().currentNovel?.id === updatedNovel.id
      ? { ...useAppStore.getState().currentNovel!, ...updatedNovel }
      : useAppStore.getState().currentNovel
    );
  };

  useEffect(() => {
    fetchNovels();
  }, [fetchNovels]);

  const handleNovelClick = useCallback((novel: NovelData) => {
    setCurrentNovel(novel);
    setLastOpenedNovelId(novel.id);
    setViewMode('workspace');
  }, [setCurrentNovel, setLastOpenedNovelId, setViewMode]);

  const handleDeleteNovel = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/novels/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('小说项目已删除');
        fetchNovels();
      } else {
        toast.error('删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  }, [fetchNovels]);

  const handleExportTxt = useCallback(async (novel: NovelData) => {
    try {
      const res = await fetch(`/api/novels/${novel.id}`);
      if (!res.ok) {
        toast.error('导出失败：无法获取小说数据');
        return;
      }
      const data = await res.json();
      await exportNovelToTxt(data, novel);
      toast.success('TXT 导出成功');
      addExportHistory(novel.id, novel.title, 'txt');
    } catch {
      toast.error('导出失败');
    }
  }, []);

  const handleExportDocx = useCallback(async (novel: NovelData) => {
    try {
      const res = await fetch(`/api/novels/${novel.id}`);
      if (!res.ok) {
        toast.error('导出失败：无法获取小说数据');
        return;
      }
      const data = await res.json();
      await exportNovelToDocx(data, novel);
      toast.success('DOCX 导出成功');
      addExportHistory(novel.id, novel.title, 'docx');
    } catch {
      toast.error('导出失败');
    }
  }, []);

  const handleDuplicateNovel = useCallback(async (novel: NovelData) => {
    try {
      const res = await fetch(`/api/novels/${novel.id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        const duplicated = await res.json();
        toast.success(`已复制「${novel.title}」为「${duplicated.title}」`);
        fetchNovels();
      } else {
        toast.error('复制失败');
      }
    } catch {
      toast.error('复制失败');
    }
  }, [fetchNovels]);

  // Compute unique genres
  const allGenres = Array.from(new Set(novels.map((n) => n.genre))).filter(Boolean);

  // Compute filtered novels
  const filteredNovels = novels.filter((n) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query
      || n.title.toLowerCase().includes(query)
      || n.genre.toLowerCase().includes(query)
      || (n.description && n.description.toLowerCase().includes(query));
    const matchesGenre = !filterGenre || n.genre === filterGenre;
    return matchesSearch && matchesGenre;
  });

  // Sort: pinned novels first, then by updatedAt
  const sortedNovels = useMemo(() => {
    return [...filteredNovels].sort((a, b) => {
      const aPinned = pinnedNovelIds.includes(a.id) ? 1 : 0;
      const bPinned = pinnedNovelIds.includes(b.id) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [filteredNovels, pinnedNovelIds]);

  // Paginated display
  const displayedNovels = useMemo(() => {
    return sortedNovels.slice(0, displayCount);
  }, [sortedNovels, displayCount]);
  const hasMore = sortedNovels.length > displayCount;

  // Compute stats
  const totalNovels = novels.length;
  const totalSteps = novels.reduce((sum, n) => sum + (n._count?.steps || 0), 0);
  const totalChapters = novels.reduce((sum, n) => sum + (n._count?.chapters || 0), 0);
  const totalActualWords = novels.reduce((sum, n) => sum + (n.chapters?.reduce((s, c) => s + (c.wordCount || 0), 0) || 0), 0);
  const totalTargetWords = novels.reduce((sum, n) => sum + n.targetWords, 0);

  const stats = [
    {
      label: '小说项目',
      value: totalNovels,
      icon: BookOpen,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: '创作步骤',
      value: totalSteps,
      icon: ListChecks,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: '章节总数',
      value: totalChapters,
      icon: FileText,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      label: '已写字数',
      value: totalActualWords >= 10000 ? `${(totalActualWords / 10000).toFixed(1)}万` : totalActualWords,
      secondary: totalTargetWords >= 10000 ? `目标 ${(totalTargetWords / 10000).toFixed(1)}万` : `目标 ${totalTargetWords}`,
      icon: Target,
      color: 'from-rose-500 to-pink-500',
      bgColor: 'bg-rose-50 dark:bg-rose-950/30',
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
  ];

  return (
    <div className="flex-1">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-warm-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-stone-950/40 hero-gradient-bg floating-particles">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-amber-200/40 dark:bg-amber-800/20 blur-3xl animate-float-1" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-orange-200/40 dark:bg-orange-800/20 blur-3xl animate-float-2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-32 w-32 rounded-full bg-amber-100/30 dark:bg-amber-900/10 blur-2xl animate-float-3" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-100/80 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              <Sparkles className="size-3.5" />
              AI 驱动的智能创作助手
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl animate-gradient bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 bg-clip-text text-transparent bg-[length:200%_auto]">
              笔境 AI — 智能网文创作平台
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600 dark:text-gray-400 sm:text-lg">
              从灵感到完稿，AI 全流程辅助您的网文创作。{TOTAL_STEPS}步智能引导、对话式设定构建、章节自动生成，让写作变得更简单。
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                onClick={() => setCreateDialogOpen(true)}
                size="lg"
                className="relative gap-2 overflow-hidden bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-700 hover:shadow-xl hover:shadow-amber-500/30 transition-all focus-ring-visible"
              >
                <Plus className="size-4 relative z-10" />
                开始创作
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
              </Button>
              <Button variant="outline" size="lg" className="gap-2 focus-ring-visible" onClick={() => {
                const el = document.getElementById('novels-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}>
                了解更多
                <ArrowRight className="size-4" />
              </Button>
            </div>
            {/* Trust indicators */}
            <div className="mt-5 flex items-center justify-center gap-4 text-xs text-muted-foreground/70">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-500" /> {TOTAL_STEPS}步智能引导</span>
              <span className="flex items-center gap-1.5"><Zap className="size-3.5 text-amber-500" /> AI 秒级响应</span>
              <span className="flex items-center gap-1.5"><Shield className="size-3.5 text-blue-500" /> 数据安全</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="mx-auto max-w-7xl px-4 -mt-6 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="group relative" title={stat.secondary || `${stat.label}: ${stat.value}`}>
              <Card
                className="card-glass border-0 shadow-lg shadow-black/5 dark:shadow-black/20 py-4 gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
              >
                <CardContent className="px-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`size-5 ${stat.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  {loading ? (
                    <Skeleton className="h-6 w-12 mt-0.5" />
                  ) : (
                    <div className="animate-count-up">
                      <p className="text-xl font-bold tracking-tight number-glow">{stat.value}</p>
                      {stat.secondary && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{stat.secondary}</p>
                      )}
                    </div>
                  )}
                </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* Writing Statistics Charts */}
      {!loading && novels.length > 0 && (
        <StatsChart novels={novels} />
      )}

      {/* Novel Projects Section */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div id="novels-section" className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">我的小说项目</h2>
            <p className="text-sm text-muted-foreground mt-1">管理和查看您的所有小说创作项目</p>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            variant="outline"
            size="sm"
            className="gap-1.5 hidden sm:flex focus-ring-visible"
          >
            <Plus className="size-4" />
            新建
          </Button>
        </div>

        {/* Continue Editing Card */}
        {!loading && novels.length > 0 && (() => {
          const recentNovel = lastOpenedNovelId
            ? novels.find((n) => n.id === lastOpenedNovelId)
            : [...novels].sort((a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              )[0];
          if (!recentNovel) return null;
          const completedSteps = (recentNovel.steps || []).filter(
            s => s.status === 'completed' || s.status === 'locked'
          ).length;
          return (
            <div onClick={() => { setCurrentNovel(recentNovel); setLastOpenedNovelId(recentNovel.id); setViewMode('workspace'); }}
              className="relative overflow-hidden rounded-xl border border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-5 cursor-pointer hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all group mb-6">
              {/* decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-200/30 to-transparent rounded-bl-full" />
              <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
                    <BookOpen className="size-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-0.5">继续上次创作</p>
                    <h3 className="font-semibold text-base">{recentNovel.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      已完成 {completedSteps}/{TOTAL_STEPS} 步 · {recentNovel.genre} · {recentNovel.style}
                    </p>
                  </div>
                </div>
                <Button className="relative gap-2 overflow-hidden bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm hover:from-amber-600 hover:to-orange-700">
                  <ArrowRight className="size-4 relative z-10 group-hover:translate-x-0.5 transition-transform" />
                  <span className="relative z-10">继续创作</span>
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0" style={{ animation: 'shimmer-slide 3s infinite' }} />
                </Button>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1 rounded-full bg-amber-100 dark:bg-amber-900/30 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all" style={{ width: `${Math.round((completedSteps / TOTAL_STEPS) * 100)}%` }} />
              </div>
            </div>
          );
        })()}

        {/* Search & Filter Bar */}
        {!loading && novels.length > 0 && (
          <div className="space-y-3 mb-6">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索小说标题、题材或描述..."
                className="h-10 pl-10 pr-4 rounded-xl border-border bg-background text-sm placeholder:text-muted-foreground/50 focus-visible:ring-amber-500/30 focus-visible:border-amber-500/50"
              />
            </div>

            {/* Genre Filter Chips */}
            {allGenres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Badge
                  asChild
                  variant={!filterGenre ? undefined : "outline"}
                  className={!filterGenre
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20 hover:bg-amber-600 cursor-pointer select-none rounded-full px-3 py-1'
                    : 'rounded-full px-3 py-1 cursor-pointer select-none text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }
                >
                  <button onClick={() => setFilterGenre(null)} aria-label="筛选全部题材">全部</button>
                </Badge>
                {allGenres.map((genre) => (
                  <Badge
                    key={genre}
                    asChild
                    variant={filterGenre === genre ? undefined : "outline"}
                    className={filterGenre === genre
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20 hover:bg-amber-600 cursor-pointer select-none rounded-full px-3 py-1'
                      : 'rounded-full px-3 py-1 cursor-pointer select-none text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }
                  >
                    <button onClick={() => setFilterGenre(filterGenre === genre ? null : genre)} aria-label={`筛选题材: ${genre}`}>{genre}</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="py-4">
                <CardHeader className="px-5">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-1" />
                </CardHeader>
                <CardContent className="px-5 space-y-3">
                  <Skeleton className="h-2 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                </CardContent>
                <CardFooter className="px-5">
                  <Skeleton className="h-4 w-24" />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State (no novels at all) */}
        {!loading && novels.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 py-16 px-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 mb-6">
              <BookMarked className="size-10 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold">还没有小说？</h3>
            <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
              点击上方「新建小说」开始创作！AI 将辅助您从灵感到完稿的每一步。
            </p>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="mt-6 gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md hover:from-amber-600 hover:to-orange-700 hover:shadow-lg transition-all"
            >
              <Plus className="size-4" />
              新建小说
            </Button>
            {/* Template suggestions */}
            <div className="mt-8 text-center">
              <p className="text-xs text-muted-foreground mb-3">试试模板：</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['穿越重生', '修仙玄幻', '悬疑推理'].map((template) => (
                  <button
                    key={template}
                    onClick={() => {
                      setSelectedTemplate(template);
                      setCreateDialogOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border/60 text-muted-foreground hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-700 transition-all"
                  >
                    <Wand2 className="size-3" />
                    {template}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* No filter results */}
        {!loading && novels.length > 0 && filteredNovels.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 py-12 px-4">
            <Search className="size-10 text-muted-foreground/40 mb-4" />
            <h3 className="text-base font-semibold text-muted-foreground">未找到匹配的小说</h3>
            <p className="mt-2 max-w-md text-center text-sm text-muted-foreground/70">
              尝试更换搜索关键词或清除筛选条件
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchQuery('');
                setFilterGenre(null);
              }}
            >
              清除筛选
            </Button>
          </div>
        )}

        {/* Novel Cards Grid */}
        {!loading && displayedNovels.length > 0 && (
          <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-children">
            {displayedNovels.map((novel) => (
              <NovelCard
                key={novel.id}
                novel={novel}
                onClick={handleNovelClick}
                onDelete={handleDeleteNovel}
                onEdit={handleEditNovel}
                onExportTxt={handleExportTxt}
                onExportDocx={handleExportDocx}
                onDuplicate={handleDuplicateNovel}
                isPinned={pinnedNovelIds.includes(novel.id)}
                onTogglePin={togglePinnedNovel}
              />
            ))}
          </div>

          {/* Count Display + Load More */}
          <div className="flex flex-col items-center gap-3 mt-6">
            <p className="text-xs text-muted-foreground">
              共 {sortedNovels.length} 部小说 · 显示 {displayedNovels.length} 部
            </p>
            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="gap-2 text-xs"
              >
                {loadingMore ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : null}
                {loadingMore ? '加载中...' : '加载更多'}
              </Button>
            )}
          </div>
          </>
        )}

        {/* Mobile FAB - always visible on small screens */}
        {!loading && (
          <div className="fixed bottom-6 right-6 sm:hidden z-50">
            <button
              onClick={() => setCreateDialogOpen(true)}
              aria-label="新建小说"
              className="focus-ring-visible w-14 h-14 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        )}
      </section>

      {/* Feature Highlights */}
      <section className="mt-12 mb-8">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold tracking-tight gradient-text">创作工具</h2>
          <p className="text-sm text-muted-foreground mt-1">强大的 AI 工具链，覆盖网文创作全流程</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Sparkles, title: 'AI 智能生成', desc: `${TOTAL_STEPS}步引导式创作，AI辅助从灵感到完稿`, color: 'from-amber-500 to-orange-500', shadowColor: 'shadow-amber-500/20' },
            { icon: Bot, title: '多Agent协作', desc: '6位专业Agent协同工作，覆盖创作全流程', color: 'from-blue-500 to-indigo-500', shadowColor: 'shadow-blue-500/20' },
            { icon: BookOpen, title: '章节自动生成', desc: '一键生成小说章节，支持连续创作', color: 'from-emerald-500 to-teal-500', shadowColor: 'shadow-emerald-500/20' },
            { icon: Settings2, title: '33款大模型', desc: '支持GLM、NVIDIA等主流模型自由切换', color: 'from-violet-500 to-purple-500', shadowColor: 'shadow-violet-500/20' },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative rounded-xl border border-border/60 bg-card p-5 glass-card-hover cursor-default overflow-hidden"
            >
              {/* Decorative gradient line on top */}
              <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br ${feature.color} mb-3 shadow-md ${feature.shadowColor} transition-transform duration-300 group-hover:scale-110`}>
                <feature.icon className="size-5 text-white" />
              </div>
              <h3 className="font-semibold text-sm mb-1.5 group-hover:text-foreground transition-colors">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
                <Sparkles className="size-4 text-white" />
              </div>
              <span className="font-semibold text-sm">笔境 AI</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                v1.0
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Sparkles className="size-3 text-amber-500" />
                AI 驱动
              </span>
              <span className="text-border">|</span>
              <span>Powered by GLM &amp; NVIDIA</span>
              <span className="text-border">|</span>
              <span>&copy; {new Date().getFullYear()} 笔境 AI</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Edit Novel Dialog */}
      <EditNovelDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        novel={editingNovel}
        onSave={handleEditSave}
      />
    </div>
  );
}

const NovelCard = memo(function NovelCard({
  novel,
  onClick,
  onDelete,
  onEdit,
  onExportTxt,
  onExportDocx,
  onDuplicate,
  isPinned,
  onTogglePin,
}: {
  novel: NovelData;
  onClick: (novel: NovelData) => void;
  onDelete: (id: string) => void;
  onEdit: (novel: NovelData) => void;
  onExportTxt: (novel: NovelData) => void;
  onExportDocx: (novel: NovelData) => void;
  onDuplicate: (novel: NovelData) => void;
  isPinned: boolean;
  onTogglePin: (id: string) => void;
}) {
  const progress = Math.round((novel.currentStep / TOTAL_STEPS) * 100);
  const status = statusConfig[novel.status] || statusConfig.draft;
  const genreColor = genreColors[novel.genre] || genreColors['未分类'];
  const [exporting, setExporting] = React.useState<string | null>(null);

  const handleExportTxt = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setExporting('txt');
    try {
      await onExportTxt(novel);
    } finally {
      setExporting(null);
    }
  };

  const handleExportDocx = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setExporting('docx');
    try {
      await onExportDocx(novel);
    } finally {
      setExporting(null);
    }
  };

  const handleExportDocxFormatted = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setExporting('docx-formatted');
    try {
      const res = await fetch(`/api/novels/${novel.id}`);
      if (!res.ok) {
        toast.error('导出失败：无法获取小说数据');
        return;
      }
      const data = await res.json();
      await exportNovelToDocxFormatted(data, novel);
      toast.success('DOCX（精排版）导出成功');
      addExportHistory(novel.id, novel.title, 'docx-formatted');
    } finally {
      setExporting(null);
    }
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate(novel);
  };

  // Sparkline data: chapter word counts
  const sparklineData = useMemo(() => {
    if (!novel.chapters || novel.chapters.length < 2) return null;
    const wordCounts = novel.chapters
      .filter((c) => c.wordCount > 0)
      .map((c) => c.wordCount);
    return wordCounts.length >= 2 ? wordCounts : null;
  }, [novel.chapters]);

  const sparklinePath = useMemo(() => {
    if (!sparklineData || sparklineData.length < 2) return '';
    const w = 60;
    const h = 20;
    const padding = 2;
    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min || 1;
    const points = sparklineData.map((val, i) => {
      const x = padding + (i / (sparklineData.length - 1)) * (w - padding * 2);
      const y = h - padding - ((val - min) / range) * (h - padding * 2);
      return `${x},${y}`;
    });
    return points.join(' ');
  }, [sparklineData]);

  return (
    <ContextMenu>
    <ContextMenuTrigger asChild>
    <Card
      className="group cursor-pointer py-4 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:shadow-amber-500/5 dark:hover:shadow-black/20 hover:-translate-y-0.5 border-border/60 hover:border-amber-500/20 dark:hover:border-amber-500/20 card-spotlight"
      onClick={() => onClick(novel)}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
      }}
    >
      <CardHeader className="px-5 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-snug line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            {novel.title}
          </CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            {isPinned && <Pin className="size-3.5 text-amber-500 fill-amber-500" />}
            <Badge className={`text-[10px] px-1.5 py-0.5 bg-gradient-to-r text-white ${genreColor} border-0`}>
              {novel.genre}
            </Badge>
          </div>
        </div>
        {novel.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
            {novel.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="px-5 py-2 space-y-3">
        {/* Status and Style Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${status.className} border-0`}>
            {status.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {novel.style}
          </Badge>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">创作进度</span>
            <span className="font-medium text-amber-600 dark:text-amber-400">{progress}%</span>
          </div>
          <Progress
            value={progress}
            className="h-1.5 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500 progress-bar-shimmer"
          />
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ListChecks className="size-3" />
            {novel.currentStep}/{TOTAL_STEPS} 步
          </span>
          <span className="flex items-center gap-1">
            <FileText className="size-3" />
            {novel._count?.chapters || 0} 章
          </span>
          {novel.chapters && novel.chapters.length > 0 && (
            <span className="text-[10px] text-muted-foreground/60">
              · {Math.round(novel.chapters.reduce((s, c) => s + (c.wordCount || 0), 0)).toLocaleString()}字
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="px-5 pt-0 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground"
          title={formatDateTime(novel.createdAt)}
        >
          <Calendar className="size-3" />
          {formatRelativeTime(novel.createdAt)}
        </span>

        <div className="flex items-center gap-1">
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400"
                onClick={(e) => e.stopPropagation()}
                disabled={!!exporting}
                aria-label="导出"
              >
                {exporting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={handleExportTxt}>
                <FileText className="size-4" />
                导出 TXT
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportDocx}>
                <FileType2 className="size-4" />
                导出 DOCX
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportDocxFormatted}>
                <FileType className="size-4" />
                导出 DOCX（精排版）
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(novel);
            }}
            aria-label="编辑"
          >
            <Pencil className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400"
            onClick={handleDuplicate}
            aria-label="复制小说"
          >
            <Copy className="size-3.5" />
          </Button>

          <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400"
              onClick={(e) => e.stopPropagation()}
              aria-label="删除"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除「{novel.title}」吗？此操作不可撤销，所有相关步骤、章节和对话记录都将被删除。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(novel.id)}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </CardFooter>
    </Card>
    </ContextMenuTrigger>
    <ContextMenuContent className="w-48">
      <ContextMenuItem onClick={(e) => { e.preventDefault(); onClick(novel); }}>
        <Monitor className="size-4" />
        打开工作台
      </ContextMenuItem>
      <ContextMenuItem onClick={(e) => { e.preventDefault(); onEdit(novel); }}>
        <Pencil className="size-4" />
        编辑
      </ContextMenuItem>
      <ContextMenuItem onClick={(e) => { e.preventDefault(); onDuplicate(novel); }}>
        <Copy className="size-4" />
        复制
      </ContextMenuItem>
      <ContextMenuItem onClick={(e) => { e.preventDefault(); onTogglePin(novel.id); }}>
        <Pin className={`size-4 ${isPinned ? 'fill-amber-500 text-amber-500' : ''}`} />
        {isPinned ? '取消置顶' : '置顶'}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Download className="size-4" />
          导出
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-40">
          <ContextMenuItem onClick={(e) => { e.preventDefault(); onExportTxt(novel); }}>
            <FileText className="size-4" />
            导出 TXT
          </ContextMenuItem>
          <ContextMenuItem onClick={(e) => { e.preventDefault(); onExportDocx(novel); }}>
            <FileType2 className="size-4" />
            导出 DOCX
          </ContextMenuItem>
          <ContextMenuItem onClick={handleExportDocxFormatted}>
            <FileType className="size-4" />
            导出 DOCX（精排版）
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onClick={(e) => { e.preventDefault(); onDelete(novel.id); }}>
        <Trash2 className="size-4" />
        删除
      </ContextMenuItem>
    </ContextMenuContent>
    </ContextMenu>
  );
});
