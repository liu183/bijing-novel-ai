'use client';

import React from 'react';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Zap,
  Crown,
  Gauge,
  Cpu,
  Eye,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import type { ModelInfo } from '@/lib/ai/models';
import { getModelsByCategory } from '@/lib/ai/models';

// Icons for categories
const categoryIcons: Record<string, React.ElementType> = {
  flagship: Crown,
  balanced: Gauge,
  fast: Zap,
  specialized: Cpu,
};

const categoryColors: Record<string, string> = {
  flagship: 'text-amber-500',
  balanced: 'text-emerald-500',
  fast: 'text-blue-500',
  specialized: 'text-purple-500',
};

export function ModelSettingsDialog() {
  const settingsOpen = useAppStore((s) => s.settingsOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);

  const categories = getModelsByCategory();
  const [expandedCategory, setExpandedCategory] = React.useState<string>('flagship');

  // Fetch current settings on open
  React.useEffect(() => {
    if (settingsOpen) {
      fetch('/api/settings')
        .then((r) => r.json())
        .then((data) => {
          if (data.currentModel && !selectedModel) {
            setSelectedModel(data.currentModel);
          }
        })
        .catch(() => {});
    }
  }, [settingsOpen, selectedModel, setSelectedModel]);

  const handleSelectModel = (model: ModelInfo) => {
    setSelectedModel(model.id);
  };

  const handleSave = () => {
    setSettingsOpen(false);
  };

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="size-5 text-amber-500" />
            模型配置
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            选择 AI 创作使用的大模型。不同模型在创作质量、响应速度和成本上各有差异。
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {/* Current Model */}
        <div className="px-6 py-3 bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
            当前选择
          </div>
          <div className="flex items-center gap-2">
            {selectedModel ? (
              <>
                {(() => {
                  const modelInfo = categories.flagship.models
                    .concat(categories.balanced.models, categories.fast.models, categories.specialized.models)
                    .find((m) => m.id === selectedModel);
                  return modelInfo ? (
                    <>
                      <Badge variant="outline" className="text-xs font-medium">
                        {modelInfo.provider}
                      </Badge>
                      <span className="font-medium">{modelInfo.name}</span>
                      <span className="text-xs text-muted-foreground">({modelInfo.id})</span>
                    </>
                  ) : (
                    <span className="font-medium text-amber-600">{selectedModel}</span>
                  );
                })()}
              </>
            ) : (
              <span className="text-muted-foreground">未选择</span>
            )}
          </div>
        </div>

        <Separator />

        {/* Model Categories */}
        <ScrollArea className="flex-1 px-6 py-2">
          <div className="space-y-3 pb-4">
            {Object.entries(categories).map(([key, category]) => {
              const Icon = categoryIcons[key] || Cpu;
              const isExpanded = expandedCategory === key;

              return (
                <div key={key} className="border border-border/60 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? '' : key)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                  >
                    <Icon className={`size-4 ${categoryColors[key]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{category.label}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {category.models.length}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
                    </div>
                    <ChevronDown
                      className={`size-4 text-muted-foreground transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/40 bg-muted/10">
                      {category.models.map((model) => {
                        const isSelected = selectedModel === model.id;
                        return (
                          <button
                            key={model.id}
                            onClick={() => handleSelectModel(model)}
                            className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                              isSelected
                                ? 'bg-amber-50 dark:bg-amber-950/20'
                                : 'hover:bg-muted/30'
                            } ${category.models.indexOf(model) < category.models.length - 1 ? 'border-b border-border/20' : ''}`}
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              {isSelected ? (
                                <CheckCircle2 className="size-4 text-amber-500" />
                              ) : (
                                <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{model.name}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {model.provider}
                                </Badge>
                                {model.supportsVision && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                                    <Eye className="size-2.5" />视觉
                                  </Badge>
                                )}
                                {model.supportsFunctionCall && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                                    <Zap className="size-2.5" />函数调用
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {model.description}
                              </p>
                              <p className="text-[10px] text-muted-foreground/70 mt-1">
                                上下文: {model.maxTokens >= 1048576 ? '1M' : model.maxTokens >= 131072 ? '128K' : `${(model.maxTokens / 1024).toFixed(0)}K`} tokens
                                {' · '}
                                ID: {model.id}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setSettingsOpen(false)}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
          >
            保存配置
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
