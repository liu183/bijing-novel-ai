'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { getModelInfo, ALL_MODELS, DEFAULT_MODEL_ID, getModelsByCategory } from '@/lib/ai/models';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Cpu,
  Crown,
  Gauge,
  Zap,
  Eye,
  CheckCircle2,
  Search,
  Sparkles,
  Settings2,
  ChevronUp,
  X,
  LucideIcon,
} from 'lucide-react';
import type { ModelInfo } from '@/lib/ai/models';

// Category configuration
const categoryConfig: Record<string, { icon: LucideIcon; color: string; bgColor: string; label: string }> = {
  flagship: {
    icon: Crown,
    color: 'text-amber-500',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    label: '旗舰模型',
  },
  balanced: {
    icon: Gauge,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    label: '均衡模型',
  },
  fast: {
    icon: Zap,
    color: 'text-sky-500',
    bgColor: 'bg-sky-100 dark:bg-sky-900/30',
    label: '快速模型',
  },
  specialized: {
    icon: Cpu,
    color: 'text-violet-500',
    bgColor: 'bg-violet-100 dark:bg-violet-900/30',
    label: '专业模型',
  },
};

// Provider colors
const providerColors: Record<string, string> = {
  Nvidia: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  Meta: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  'Mistral AI': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  Google: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  Microsoft: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400',
  Alibaba: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  DeepSeek: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  '智谱GLM': 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
};

export function ModelSelector() {
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const currentModelInfo = getModelInfo(selectedModel || DEFAULT_MODEL_ID);

  // Filter models by search
  const filteredModels = useMemo(() => {
    if (!search.trim()) return ALL_MODELS;
    const q = search.toLowerCase();
    return ALL_MODELS.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  }, [search]);

  // Group filtered models by category
  const groupedModels = useMemo(() => {
    const groups: Record<string, ModelInfo[]> = {};
    for (const model of filteredModels) {
      if (!groups[model.category]) groups[model.category] = [];
      groups[model.category].push(model);
    }
    return groups;
  }, [filteredModels]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Focus search input when opening
  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSelect = (model: ModelInfo) => {
    setSelectedModel(model.id);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <Button
        variant="outline"
        onClick={() => setOpen(!open)}
        className={`h-8 gap-1.5 px-2.5 text-xs font-normal border-border/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all ${
          open ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20' : ''
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 max-w-[180px] sm:max-w-[240px]">
          {currentModelInfo ? (
            <>
              <Badge
                variant="secondary"
                className={`text-[9px] px-1 py-0 h-4 shrink-0 ${
                  providerColors[currentModelInfo.provider] || 'bg-gray-100 text-gray-700'
                }`}
              >
                {currentModelInfo.provider}
              </Badge>
              <span className="truncate">{currentModelInfo.name}</span>
            </>
          ) : (
            <>
              <Sparkles className="size-3 shrink-0 text-amber-500" />
              <span className="truncate">选择模型</span>
            </>
          )}
        </div>
        <ChevronUp
          className={`size-3 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </Button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[420px] max-w-[calc(100vw-2rem)] rounded-xl border border-border/80 bg-background shadow-xl shadow-black/5 z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-amber-500" />
                <h3 className="font-semibold text-sm">选择 AI 模型</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setOpen(false);
                  setSettingsOpen(true);
                }}
                title="高级设置"
              >
                <Settings2 className="size-3.5 text-muted-foreground" />
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索模型名称、提供商..."
                className="h-8 pl-8 pr-8 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <Separator />

          {/* Current Selection */}
          <div className="px-4 py-2 bg-muted/20">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>当前使用:</span>
              {currentModelInfo && (
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 ${
                    providerColors[currentModelInfo.provider] || ''
                  }`}
                >
                  {currentModelInfo.name}
                </Badge>
              )}
              {!currentModelInfo && <span className="text-amber-600">未选择</span>}
            </div>
          </div>

          <Separator />

          {/* Model List */}
          <ScrollArea className="max-h-[360px]">
            <div className="py-2">
              {filteredModels.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Search className="size-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">没有找到匹配的模型</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">尝试其他搜索关键词</p>
                </div>
              ) : (
                Object.entries(groupedModels).map(([category, models]) => {
                  const config = categoryConfig[category];
                  if (!config) return null;
                  const Icon = config.icon;

                  return (
                    <div key={category} className="mb-1">
                      {/* Category Header */}
                      <div className="flex items-center gap-2 px-4 py-1.5">
                        <div className={`flex h-5 w-5 items-center justify-center rounded-md ${config.bgColor}`}>
                          <Icon className={`size-3 ${config.color}`} />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {config.label}
                        </span>
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                          {models.length}
                        </Badge>
                      </div>

                      {/* Model Items */}
                      {models.map((model) => {
                        const isSelected = selectedModel === model.id;
                        return (
                          <button
                            key={model.id}
                            onClick={() => handleSelect(model)}
                            className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-all duration-100 group ${
                              isSelected
                                ? 'bg-amber-50 dark:bg-amber-950/20'
                                : 'hover:bg-muted/40'
                            }`}
                          >
                            {/* Radio */}
                            <div className="mt-0.5 flex-shrink-0">
                              {isSelected ? (
                                <CheckCircle2 className="size-4 text-amber-500" />
                              ) : (
                                <div className="size-4 rounded-full border-2 border-muted-foreground/20 group-hover:border-muted-foreground/40 transition-colors" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-sm font-medium ${
                                    isSelected ? 'text-amber-700 dark:text-amber-400' : ''
                                  }`}
                                >
                                  {model.name}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className={`text-[9px] px-1 py-0 h-4 ${
                                    providerColors[model.provider] || ''
                                  }`}
                                >
                                  {model.provider}
                                </Badge>
                                {model.supportsVision && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] px-1 py-0 h-4 gap-0.5 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400"
                                  >
                                    <Eye className="size-2.5" />
                                    视觉
                                  </Badge>
                                )}
                                {model.supportsFunctionCall && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] px-1 py-0 h-4 gap-0.5 bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400"
                                  >
                                    <Zap className="size-2.5" />
                                    函数调用
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground/80 mt-0.5 line-clamp-1">
                                {model.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-muted-foreground/60 font-mono">
                                  {model.maxTokens >= 1048576
                                    ? '1M'
                                    : model.maxTokens >= 131072
                                    ? '128K'
                                    : `${(model.maxTokens / 1024).toFixed(0)}K`}
                                  {' '}tokens
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Footer */}
          <div className="px-4 py-2.5 flex items-center justify-between bg-muted/10">
            <p className="text-[10px] text-muted-foreground/60">
              {ALL_MODELS.length} 个模型可选 · Nvidia NIM · 智谱 GLM
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              onClick={() => {
                setOpen(false);
                setSettingsOpen(true);
              }}
            >
              <Settings2 className="size-3" />
              高级设置
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
