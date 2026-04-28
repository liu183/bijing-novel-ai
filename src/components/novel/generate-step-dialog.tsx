'use client';

import React, { useState, useCallback } from 'react';
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
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [inputs, setInputs] = useState<Record<string, string>>({});

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
    }
  }, [open, stepNumber, stepConfig.inputFields]);

  const handleInputChange = useCallback((key: string, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }, []);

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
      }

      setOpen(false);
    } catch (error) {
      console.error('Failed to generate step:', error);
      toast.error(error instanceof Error ? error.message : '生成失败，请重试');
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
                AI 生成中...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                开始生成
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
