'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Feather, Moon, Sun, Plus, Bot, Home, ChevronRight } from 'lucide-react';
import { ModelSelector } from './model-selector';

const viewLabels: Record<string, string> = {
  dashboard: '首页',
  workspace: '工作区',
  console: '智能体',
  reader: '阅读',
};

export function Header() {
  const { theme, setTheme } = useTheme();
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const setCreateDialogOpen = useAppStore((s) => s.setCreateDialogOpen);
  const currentNovel = useAppStore((s) => s.currentNovel);
  const currentChapterNumber = useAppStore((s) => s.currentChapterNumber);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleBreadcrumbClick = (mode: 'dashboard' | 'workspace' | 'console' | 'reader') => {
    if (mode !== viewMode) {
      setViewMode(mode);
    }
  };

  // Build breadcrumb segments for desktop
  const showHome = viewMode !== 'dashboard';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo + Home Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
              <Feather className="size-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              笔境 AI
            </span>
          </div>
          {/* 返回首页 button - always visible except on dashboard */}
          {showHome && (
            <>
              <ChevronRight className="size-3.5 text-muted-foreground/40 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBreadcrumbClick('dashboard')}
                className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                <Home className="size-3.5" />
                <span className="hidden sm:inline">首页</span>
              </Button>
            </>
          )}
        </div>

        {/* Center: Breadcrumb (desktop) */}
        <div className="hidden sm:flex items-center">
          <Breadcrumb>
            <BreadcrumbList className="gap-0.5">
              {/* Novel name - clickable to workspace */}
              {currentNovel && viewMode !== 'dashboard' && (
                <>
                  <BreadcrumbSeparator className="text-muted-foreground/30" />
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      className="cursor-pointer text-xs hover:text-amber-600 dark:hover:text-amber-400 transition-colors max-w-[140px] truncate"
                      onClick={() => handleBreadcrumbClick('workspace')}
                    >
                      {currentNovel.title}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              )}

              {/* View mode page */}
              {viewMode !== 'dashboard' && (
                <>
                  <BreadcrumbSeparator className="text-muted-foreground/30" />
                  <BreadcrumbItem>
                    {viewMode === 'reader' || viewMode === 'console' ? (
                      <BreadcrumbLink
                        className="cursor-pointer text-xs hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                        onClick={() => handleBreadcrumbClick(viewMode)}
                      >
                        {viewLabels[viewMode]}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="text-xs">{viewLabels[viewMode]}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </>
              )}

              {/* Reader chapter info */}
              {viewMode === 'reader' && currentChapterNumber > 0 && (
                <>
                  <BreadcrumbSeparator className="text-muted-foreground/30" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      第{currentChapterNumber}章
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Mobile breadcrumb */}
        <div className="sm:hidden flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
          {viewMode === 'dashboard' && <span className="truncate">首页</span>}
          {viewMode === 'workspace' && (
            <>
              <Home className="size-3 shrink-0" />
              <ChevronRight className="size-2.5 text-muted-foreground/40 shrink-0" />
              <span className="truncate">{currentNovel?.title || '工作台'}</span>
            </>
          )}
          {viewMode === 'console' && (
            <>
              <Home className="size-3 shrink-0" />
              <ChevronRight className="size-2.5 text-muted-foreground/40 shrink-0" />
              <span className="truncate">{currentNovel?.title || ''}</span>
              <ChevronRight className="size-2.5 text-muted-foreground/40 shrink-0" />
              <span className="truncate">智能体</span>
            </>
          )}
          {viewMode === 'reader' && (
            <>
              <Home className="size-3 shrink-0" />
              <ChevronRight className="size-2.5 text-muted-foreground/40 shrink-0" />
              <span className="truncate">{currentNovel?.title || ''}</span>
              <ChevronRight className="size-2.5 text-muted-foreground/40 shrink-0" />
              <span className="truncate shrink-0">第{currentChapterNumber}章</span>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Model Selector */}
          <ModelSelector />

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-9 w-9 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30"
            aria-label="切换主题"
          >
            {mounted && theme === 'dark' ? (
              <Sun className="size-4 text-amber-400" />
            ) : (
              <Moon className="size-4 text-muted-foreground" />
            )}
          </Button>

          {/* Agent Console Toggle */}
          {currentNovel && (
            <Button
              variant={viewMode === 'console' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode(viewMode === 'console' ? 'workspace' : 'console')}
              className={`h-9 gap-1.5 transition-all ${
                viewMode === 'console'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm'
                  : 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
              }`}
            >
              <Bot className="size-3.5" />
              <span className="hidden sm:inline">{viewMode === 'console' ? '工作台' : '智能体'}</span>
            </Button>
          )}

          {/* New Project Button */}
          <Button
            onClick={() => setCreateDialogOpen(true)}
            size="sm"
            className="h-9 gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm hover:from-amber-600 hover:to-orange-700 hover:shadow-md transition-all"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">新建项目</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
