'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAppStore, type NovelData } from '@/store/app-store';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  Clock,
  Pencil,
  Search,
  Download,
  Bot,
  Settings2,
} from 'lucide-react';
import { EditNovelDialog } from './edit-novel-dialog';
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
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  writing: { label: '创作中', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  completed: { label: '已完成', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  archived: { label: '已归档', className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500' },
};

const genreColors: Record<string, string> = {
  '都市脑洞': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  '玄幻脑洞': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  '悬疑脑洞': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
  '科幻': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400',
  '末世': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  '年代重生': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  '言情': 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400',
  '其他': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  '未分类': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export function DashboardView() {
  const novels = useAppStore((s) => s.novels);
  const setNovels = useAppStore((s) => s.setNovels);
  const setCurrentNovel = useAppStore((s) => s.setCurrentNovel);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const setCreateDialogOpen = useAppStore((s) => s.setCreateDialogOpen);
  const [loading, setLoading] = useState(true);
  const [editingNovel, setEditingNovel] = useState<NovelData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGenre, setFilterGenre] = useState<string | null>(null);

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

  const handleNovelClick = (novel: NovelData) => {
    setCurrentNovel(novel);
    setViewMode('workspace');
  };

  const handleDeleteNovel = async (id: string) => {
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
  };

  const handleExportNovel = async (novel: NovelData) => {
    try {
      const res = await fetch(`/api/novels/${novel.id}`);
      if (!res.ok) {
        toast.error('导出失败：无法获取小说数据');
        return;
      }
      const data = await res.json();

      // Format as TXT
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
        data.steps.forEach((step: { stepNumber: number; title: string; content: string }, idx: number) => {
          txt += `=== 第${idx + 1}步: ${step.title || `步骤${step.stepNumber || idx + 1}`} ===\n`;
          txt += `${step.content || '(无内容)'}\n\n`;
        });
      } else {
        txt += '(暂无创作步骤)\n\n';
      }

      // Chapters section
      txt += `【章节内容】\n\n`;
      if (data.chapters && data.chapters.length > 0) {
        data.chapters.forEach((ch: { number: number; title: string; content: string }) => {
          txt += `--- 第${ch.number}章 ${ch.title} ---\n`;
          txt += `${ch.content || '(无内容)'}\n\n`;
        });
      } else {
        txt += '(暂无章节内容)\n\n';
      }

      // Download
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${novel.title}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('导出成功');
    } catch {
      toast.error('导出失败');
    }
  };

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
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-warm-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-stone-950/40">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-amber-200/40 dark:bg-amber-800/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-orange-200/40 dark:bg-orange-800/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-32 w-32 rounded-full bg-amber-100/30 dark:bg-amber-900/10 blur-2xl" />
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
              从灵感到完稿，AI 全流程辅助您的网文创作。12步智能引导、对话式设定构建、章节自动生成，让写作变得更简单。
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                onClick={() => setCreateDialogOpen(true)}
                size="lg"
                className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-700 hover:shadow-xl hover:shadow-amber-500/30 transition-all"
              >
                <Plus className="size-4" />
                开始创作
              </Button>
              <Button variant="outline" size="lg" className="gap-2" onClick={() => {
                const el = document.getElementById('novels-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}>
                了解更多
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="mx-auto max-w-7xl px-4 -mt-6 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card
              key={stat.label}
              className="border-0 shadow-lg shadow-black/5 dark:shadow-black/20 py-4 gap-3"
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
                    <div>
                      <p className="text-xl font-bold tracking-tight">{stat.value}</p>
                      {stat.secondary && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{stat.secondary}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

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
            className="gap-1.5 hidden sm:flex"
          >
            <Plus className="size-4" />
            新建
          </Button>
        </div>

        {/* Continue Editing Card */}
        {!loading && novels.length > 0 && (() => {
          const recentNovel = [...novels].sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0];
          const completedSteps = (recentNovel.steps || []).filter(
            s => s.status === 'completed' || s.status === 'locked'
          ).length;
          return (
            <div onClick={() => { setCurrentNovel(recentNovel); setViewMode('workspace'); }}
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
                      已完成 {completedSteps}/12 步 · {recentNovel.genre} · {recentNovel.style}
                    </p>
                  </div>
                </div>
                <Button className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm hover:from-amber-600 hover:to-orange-700">
                  继续创作
                  <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1 rounded-full bg-amber-100 dark:bg-amber-900/30 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all" style={{ width: `${Math.round((completedSteps / 12) * 100)}%` }} />
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
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索小说标题、题材或描述..."
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
              />
            </div>

            {/* Genre Filter Chips */}
            {allGenres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterGenre(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    !filterGenre
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20'
                      : 'border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  全部
                </button>
                {allGenres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setFilterGenre(filterGenre === genre ? null : genre)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      filterGenre === genre
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20'
                        : 'border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    {genre}
                  </button>
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
              <BookOpen className="size-10 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold">还没有小说项目</h3>
            <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
              开始您的网文创作之旅吧！AI 将辅助您从灵感到完稿的每一步。
            </p>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="mt-6 gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md hover:from-amber-600 hover:to-orange-700 hover:shadow-lg transition-all"
            >
              <Plus className="size-4" />
              创建第一个小说项目
            </Button>
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
        {!loading && filteredNovels.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredNovels.map((novel) => (
              <NovelCard
                key={novel.id}
                novel={novel}
                onClick={() => handleNovelClick(novel)}
                onDelete={() => handleDeleteNovel(novel.id)}
                onEdit={() => handleEditNovel(novel)}
                onExport={() => handleExportNovel(novel)}
              />
            ))}
          </div>
        )}

        {/* Mobile FAB */}
        {!loading && filteredNovels.length > 0 && (
          <div className="fixed bottom-6 right-6 sm:hidden z-40">
            <Button
              onClick={() => setCreateDialogOpen(true)}
              size="icon"
              className="h-12 w-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 hover:from-amber-600 hover:to-orange-700"
            >
              <Plus className="size-5" />
            </Button>
          </div>
        )}
      </section>

      {/* Feature Highlights */}
      <section className="mt-12 mb-8">
        <h2 className="text-xl font-semibold mb-6 text-center">创作工具</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Sparkles, title: 'AI 智能生成', desc: '12步引导式创作，AI辅助从灵感到完稿', color: 'from-amber-500 to-orange-500' },
            { icon: Bot, title: '多Agent协作', desc: '6位专业Agent协同工作，覆盖创作全流程', color: 'from-blue-500 to-indigo-500' },
            { icon: BookOpen, title: '章节自动生成', desc: '一键生成小说章节，支持连续创作', color: 'from-emerald-500 to-teal-500' },
            { icon: Settings2, title: '33款大模型', desc: '支持GLM、NVIDIA等主流模型自由切换', color: 'from-violet-500 to-purple-500' },
          ].map((feature) => (
            <div key={feature.title} className="rounded-xl border border-border/60 bg-card p-5 hover:shadow-md transition-shadow">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${feature.color} mb-3`}>
                <feature.icon className="size-5 text-white" />
              </div>
              <h3 className="font-medium text-sm mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

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

function NovelCard({
  novel,
  onClick,
  onDelete,
  onEdit,
  onExport,
}: {
  novel: NovelData;
  onClick: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onExport: () => void;
}) {
  const progress = Math.round((novel.currentStep / 12) * 100);
  const status = statusConfig[novel.status] || statusConfig.draft;
  const genreColor = genreColors[novel.genre] || genreColors['未分类'];

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'yyyy-MM-dd', { locale: zhCN });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card
      className="group cursor-pointer py-4 transition-all duration-200 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-0.5 border-border/60"
      onClick={onClick}
    >
      <CardHeader className="px-5 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-snug line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            {novel.title}
          </CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${genreColor} border-0`}>
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
            className="h-1.5 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500"
          />
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ListChecks className="size-3" />
            {novel.currentStep}/12 步
          </span>
          <span className="flex items-center gap-1">
            <FileText className="size-3" />
            {novel._count?.chapters || 0} 章
          </span>
        </div>
      </CardContent>

      <CardFooter className="px-5 pt-0 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Calendar className="size-3" />
          {formatDate(novel.createdAt)}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400"
            onClick={(e) => {
              e.stopPropagation();
              onExport();
            }}
          >
            <Download className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="size-3.5" />
          </Button>

          <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400"
              onClick={(e) => e.stopPropagation()}
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
                onClick={onDelete}
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
  );
}
