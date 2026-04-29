'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/app-store';
import { getStepConfig, type InputField } from '@/lib/steps-config';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { fireConfetti } from '@/lib/confetti';
import { TOTAL_STEPS } from '@/lib/constants';

export function GenerateStepDialog() {
  const open = useAppStore((s) => s.generateDialogOpen);
  const setOpen = useAppStore((s) => s.setGenerateDialogOpen);
  const stepNumber = useAppStore((s) => s.generateStepNumber);
  const currentNovel = useAppStore((s) => s.currentNovel);
  const setIsGenerating = useAppStore((s) => s.setIsGenerating);
  const setCurrentNovel = useAppStore((s) => s.setCurrentNovel);
  const setCurrentStep = useAppStore((s) => s.setCurrentStep);
  const selectedModel = useAppStore((s) => s.selectedModel);

  const [loading, setLoading] = useState(false);
  const [genError, setGenError] = useState('');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [elapsedTime, setElapsedTime] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tipRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stepTips: Record<number, string[]> = {
    1: ['分析题材偏好和市场需求...', '构思多个独特的故事创意...', '评估创意的可行性和商业潜力...'],
    2: ['扩展核心创意为一页故事梗概...', '构建清晰的故事三幕结构...', '完善情节逻辑和角色动机...'],
    3: ['设计主角的成长弧线...', '创建丰富的配角体系...', '构建角色之间的关系网络...'],
    4: ['提炼核心主题和思想深度...', '设计主题的多层表达方式...', '确保主题贯穿整个故事...'],
    5: ['规划故事的整体节奏结构...', '安排关键转折和高潮节点...', '设计幕与幕之间的过渡...'],
    6: ['设计主要场景的空间布局...', '细化每个场景的冲突和张力...', '安排场景之间的衔接...'],
    7: ['构思最具视觉冲击力的关键场面...', '设计场景中的情感高潮点...', '打磨场面的细节描写...'],
    8: ['根据角色性格设计对白风格...', '创作有辨识度的角色语言...', '通过对白推进情节发展...'],
    9: ['设计象征元素和隐喻系统...', '安排暗线的伏笔和回收...', '构建多层叙事结构...'],
    10: ['分析当前节奏的张弛有度...', '调整快慢节奏的交替频率...', '确保读者的阅读体验流畅...'],
    11: ['设计多种可能的结局方案...', '确保结局呼应主题和伏笔...', '平衡读者的期待和惊喜...'],
    12: ['分析已有内容的一致性...', '打磨文字质量和表达精度...', '优化整体叙事节奏...'],
  };

  const getTips = (stepNum: number): string[] => {
    return stepTips[stepNum] || ['AI 正在分析您的创作需求...', '正在生成高质量内容...', '即将完成，请稍候...'];
  };

  const generatingTips = getTips(stepNumber);

  const stepConfig = getStepConfig(stepNumber);

  // Reset inputs when dialog opens or step changes
  React.useEffect(() => {
    if (open) {
      const defaults: Record<string, string> = {};
      stepConfig.inputFields.forEach((field) => {
        if (field.defaultValue) {
          defaults[field.key] = field.defaultValue;
        }
      });
      setInputs(defaults);
      setLoading(false);
      setGenError('');
      setElapsedTime(0);
      setTipIndex(0);
    }
  }, [open, stepNumber, stepConfig.inputFields]);

  // Timer and tip rotation during loading
  useEffect(() => {
    if (loading) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      const currentTips = getTips(stepNumber);
      tipRef.current = setInterval(() => {
        setTipIndex(prev => (prev + 1) % currentTips.length);
      }, 4000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (tipRef.current) { clearInterval(tipRef.current); tipRef.current = null; }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (tipRef.current) clearInterval(tipRef.current);
    };
  }, [loading, stepNumber]);

  const handleInputChange = useCallback((key: string, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
  };

  const handleSubmit = async () => {
    if (!currentNovel) return;

    // Validate required fields
    const missingRequired = stepConfig.inputFields.filter(
      (field) => field.required && !inputs[field.key]?.trim()
    );
    if (missingRequired.length > 0) {
      toast.error(`请填写必填项：${missingRequired.map((f) => f.label).join('、')}`);
      return;
    }

    setLoading(true);
    setElapsedTime(0);
    setTipIndex(0);
    setGenError('');
    setIsGenerating(true);

    try {
      const res = await fetch(`/api/novels/${currentNovel.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepNumber, inputs, model: selectedModel }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '生成失败');
      }

      toast.success(`第${stepNumber}步「${stepConfig.title}」生成完成`);

      // Refresh novel data
      const novelRes = await fetch(`/api/novels/${currentNovel.id}`);
      if (novelRes.ok) {
        const updatedNovel = await novelRes.json();
        setCurrentNovel(updatedNovel);
        setCurrentStep(stepNumber);

        // Check if all steps are completed/locked → milestone celebration!
        const completedSteps = (updatedNovel.steps || []).filter(
          (s: { status: string }) => s.status === 'completed' || s.status === 'locked'
        ).length;
        if (completedSteps >= TOTAL_STEPS) {
          setTimeout(fireConfetti, 300);
        }
      }

      setOpen(false);
    } catch (error) {
      console.error('Failed to generate step:', error);
      const msg = error instanceof Error ? error.message : '生成失败，请重试';
      toast.error(msg);
      setGenError(msg);
    } finally {
      setLoading(false);
      setIsGenerating(false);
    }
  };

  const renderField = (field: InputField) => {
    switch (field.type) {
      case 'select':
        return (
          <div key={field.key} className="space-y-2">
            <Label className="text-sm">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <Select
              value={inputs[field.key] || ''}
              onValueChange={(val) => handleInputChange(field.key, val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={field.placeholder || `请选择${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'textarea':
        return (
          <div key={field.key} className="space-y-2">
            <Label className="text-sm">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <Textarea
              value={inputs[field.key] || ''}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="min-h-[80px] resize-y"
              rows={3}
            />
          </div>
        );

      case 'number':
        return (
          <div key={field.key} className="space-y-2">
            <Label className="text-sm">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <Input
              type="number"
              value={inputs[field.key] || ''}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              placeholder={field.placeholder}
            />
          </div>
        );

      case 'text':
      default:
        return (
          <div key={field.key} className="space-y-2">
            <Label className="text-sm">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <Input
              value={inputs[field.key] || ''}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              placeholder={field.placeholder}
            />
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && setOpen(o)}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shrink-0">
              <Sparkles className="size-4 text-white" />
            </div>
            <div>
              <span>第{stepNumber}步 · {stepConfig.title}</span>
              <p className="text-sm font-normal text-muted-foreground mt-0.5">
                {stepConfig.subtitle}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {stepConfig.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {stepConfig.inputFields.map(renderField)}
        </div>

        {/* Loading progress section */}
        {loading && (
          <div className="space-y-3 py-2">
            <div className="h-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500"
                style={{ 
                  width: '100%',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer-bg 1.5s infinite linear'
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center animate-pulse">
              {generatingTips[tipIndex]}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                AI 生成中... {formatTime(elapsedTime)}
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                开始生成
              </>
            )}
          </Button>
          {genError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive mt-2">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{genError}</span>
              <button onClick={() => setGenError('')} className="ml-auto hover:text-destructive/70">×</button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
