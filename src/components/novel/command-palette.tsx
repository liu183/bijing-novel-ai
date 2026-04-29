'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useAppStore, type ViewMode } from '@/store/app-store';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  PenTool,
  BookOpen,
  Bot,
  Plus,
  Moon,
  Sun,
  Settings2,
  Keyboard,
  Lightbulb,
  FileText,
  Users,
  Compass,
  GitBranch,
  List,
  Film,
  MessageCircle,
  Layers,
  Activity,
  Flag,
  RefreshCcw,
} from 'lucide-react';
import { STEPS } from '@/lib/steps-config';

const iconMap: Record<string, React.ElementType> = {
  Lightbulb,
  FileText,
  Users,
  Compass,
  GitBranch,
  List,
  Film,
  MessageCircle,
  Layers,
  Activity,
  Flag,
  RefreshCcw,
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const setCreateDialogOpen = useAppStore((s) => s.setCreateDialogOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const novels = useAppStore((s) => s.novels);
  const currentStep = useAppStore((s) => s.currentStep);
  const setCurrentStep = useAppStore((s) => s.setCurrentStep);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const navigate = (mode: ViewMode) => {
    setViewMode(mode);
    setOpen(false);
  };

  const jumpToStep = (stepNumber: number) => {
    setCurrentStep(stepNumber);
    setViewMode('workspace');
    setOpen(false);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
    setOpen(false);
  };

  const openCreateDialog = () => {
    setCreateDialogOpen(true);
    setOpen(false);
  };

  const openModelSelector = () => {
    setSettingsOpen(true);
    setOpen(false);
  };

  const openShortcutsHelp = () => {
    setOpen(false);
    // Trigger the shortcuts help popover if in workspace
    setTimeout(() => {
      const helpBtn = document.querySelector('[data-shortcuts-help]');
      if (helpBtn) (helpBtn as HTMLElement).click();
    }, 100);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="输入命令或搜索..." />
      <CommandList>
        <CommandEmpty>未找到匹配的结果</CommandEmpty>

        {/* Novels */}
        {novels.length > 0 && (
          <CommandGroup heading="小说项目">
            {novels.slice(0, 8).map((novel) => (
              <CommandItem
                key={novel.id}
                value={`novel ${novel.title} ${novel.genre}`}
                onSelect={() => {
                  useAppStore.getState().setCurrentNovel(novel);
                  useAppStore.getState().setViewMode('workspace');
                  setOpen(false);
                }}
              >
                <BookOpen className="mr-2 size-4" />
                <span>{novel.title}</span>
                <Badge variant="outline" className="ml-auto text-[10px]">{novel.genre}</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Navigation */}
        <CommandGroup heading="导航">
          <CommandItem
            value="dashboard 仪表盘"
            onSelect={() => navigate('dashboard')}
          >
            <LayoutDashboard className="size-4" />
            <span>仪表盘</span>
            <CommandShortcut>↵ 切换视图</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="workspace 工作台"
            onSelect={() => navigate('workspace')}
          >
            <PenTool className="size-4" />
            <span>工作台</span>
            <CommandShortcut>↵ 切换视图</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="reader 阅读器"
            onSelect={() => navigate('reader')}
          >
            <BookOpen className="size-4" />
            <span>阅读器</span>
            <CommandShortcut>↵ 切换视图</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="console 控制台 agent"
            onSelect={() => navigate('console')}
          >
            <Bot className="size-4" />
            <span>Agent 控制台</span>
            <CommandShortcut>↵ 切换视图</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        {/* Steps - only when in workspace or no matter what */}
        <CommandGroup heading="创作步骤">
          {STEPS.map((step) => {
            const Icon = iconMap[step.icon] || Lightbulb;
            return (
              <CommandItem
                key={step.number}
                value={`step ${step.number} ${step.title} ${step.subtitle}`}
                onSelect={() => jumpToStep(step.number)}
              >
                <Icon className="size-4" />
                <span>
                  第{step.number}步 · {step.title}
                </span>
                <span className="text-xs text-muted-foreground ml-auto mr-2 hidden sm:inline">
                  {step.subtitle}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {/* Quick Actions */}
        <CommandGroup heading="快捷操作">
          <CommandItem
            value="create 新建小说 新建项目"
            onSelect={openCreateDialog}
          >
            <Plus className="size-4" />
            <span>新建小说</span>
            <CommandShortcut>↵ 新建</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="theme 主题 深色 浅色 dark light 切换主题"
            onSelect={toggleTheme}
          >
            {theme === 'dark' ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
            <span>切换主题</span>
            <CommandShortcut>↵ 切换</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="model 模型 选择 设置 model-selector"
            onSelect={openModelSelector}
          >
            <Settings2 className="size-4" />
            <span>打开模型选择</span>
            <CommandShortcut>↵ 打开</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="shortcuts 快捷键 帮助 keyboard"
            onSelect={openShortcutsHelp}
          >
            <Keyboard className="size-4" />
            <span>快捷键帮助</span>
            <CommandShortcut>↵ 打开</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
