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
import { Feather, Moon, Sun, Plus, Bot } from 'lucide-react';

const viewLabels: Record<string, string> = {
  dashboard: '仪表盘',
  workspace: '创作工作台',
  console: '智能体控制台',
  reader: '小说阅读',
};

export function Header() {
  const { theme, setTheme } = useTheme();
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const setCreateDialogOpen = useAppStore((s) => s.setCreateDialogOpen);
  const currentNovel = useAppStore((s) => s.currentNovel);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleBreadcrumbClick = (mode: 'dashboard' | 'workspace' | 'console' | 'reader') => {
    if (mode !== viewMode) {
      setViewMode(mode);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
            <Feather className="size-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            笔境 AI
          </span>
        </div>

        {/* Center: Breadcrumb */}
        <div className="hidden sm:block">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  className="cursor-pointer"
                  onClick={() => handleBreadcrumbClick('dashboard')}
                >
                  仪表盘
                </BreadcrumbLink>
              </BreadcrumbItem>
              {viewMode !== 'dashboard' && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {(viewMode === 'reader' || viewMode === 'console') ? (
                      <BreadcrumbLink
                        className="cursor-pointer"
                        onClick={() => handleBreadcrumbClick('workspace')}
                      >
                        创作工作台
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{viewLabels[viewMode]}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {viewMode === 'console' && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{viewLabels[viewMode]}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                  {(viewMode === 'workspace' || viewMode === 'reader' || viewMode === 'console') && currentNovel && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="max-w-[160px] truncate">
                          {currentNovel.title}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Mobile breadcrumb */}
        <div className="sm:hidden flex items-center gap-1 text-sm text-muted-foreground">
          {viewMode === 'dashboard' && '仪表盘'}
          {viewMode === 'workspace' && `工作台${currentNovel ? ` · ${currentNovel.title}` : ''}`}
          {viewMode === 'console' && `智能体${currentNovel ? ` · ${currentNovel.title}` : ''}`}
          {viewMode === 'reader' && `阅读`}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
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
