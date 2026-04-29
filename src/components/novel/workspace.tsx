'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppStore, type StepData } from '@/store/app-store';
import { STEPS, PHASES, getStepConfig, getPhaseForStep } from '@/lib/steps-config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
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
  ArrowLeft,
  Pencil,
  Save,
  Lock,
  Unlock,
  Sparkles,
  Send,
  BookOpen,
  Loader2,
  ChevronRight,
  X,
  CheckCircle2,
  Circle,
  Timer,
  MessageSquare,
  PanelLeftClose,
  PanelRightClose,
  Trash2,
  Copy,
  Clock,
  Type,
  HelpCircle,
  Keyboard,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Icon mapping
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

// Phase color mapping for text/borders
const phaseColorMap: Record<string, { text: string; bg: string; border: string; badge: string }> = {
  'Phase 1: 基础': {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  },
  'Phase 2: 设计': {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  },
  'Phase 3: 细化': {
    text: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-500',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
  },
  'Phase 4: 精修': {
    text: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-500',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
  },
  'Phase 5: 迭代': {
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-500',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
  },
};

export function WorkspaceView() {
  const currentNovel = useAppStore((s) => s.currentNovel);
  const setCurrentNovel = useAppStore((s) => s.setCurrentNovel);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const currentStep = useAppStore((s) => s.currentStep);
  const setCurrentStep = useAppStore((s) => s.setCurrentStep);
  const setGenerateDialogOpen = useAppStore((s) => s.setGenerateDialogOpen);
  const setGenerateStepNumber = useAppStore((s) => s.setGenerateStepNumber);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const isChatLoading = useAppStore((s) => s.isChatLoading);
  const setIsChatLoading = useAppStore((s) => s.setIsChatLoading);
  const chatMessages = useAppStore((s) => s.chatMessages);
  const setChatMessages = useAppStore((s) => s.setChatMessages);
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const isChapterGenerating = useAppStore((s) => s.isChapterGenerating);
  const setIsChapterGenerating = useAppStore((s) => s.setIsChapterGenerating);
  const setGenerateChapterNumber = useAppStore((s) => s.setGenerateChapterNumber);
  const selectedModel = useAppStore((s) => s.selectedModel);

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [mobileTab, setMobileTab] = useState<'steps' | 'content' | 'chat'>('content');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const originalContentRef = useRef<string>('');

  // Fetch novel data with steps when entering workspace
  useEffect(() => {
    if (!currentNovel) return;
    const fetchNovelData = async () => {
      try {
        const res = await fetch(`/api/novels/${currentNovel.id}`);
        if (res.ok) {
          const data = await res.json();
          setCurrentNovel(data);
          // Initialize chat messages from the server
          if (data.messages && data.messages.length > 0) {
            setChatMessages(data.messages.map((m: { role: string; content: string; stepRef?: number; createdAt?: string }) => ({
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content,
              stepRef: m.stepRef,
              createdAt: m.createdAt,
            })));
          }
        }
      } catch (error) {
        console.error('Failed to fetch novel data:', error);
      }
    };
    fetchNovelData();
  }, [currentNovel?.id, setCurrentNovel, setChatMessages, setCurrentStep]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Get steps from novel
  const novelSteps: StepData[] = currentNovel?.steps || [];

  const getStepData = (stepNumber: number): StepData | undefined => {
    return novelSteps.find((s) => s.stepNumber === stepNumber);
  };

  const currentStepData = getStepData(currentStep);
  const currentStepConfig = getStepConfig(currentStep);
  const currentPhase = getPhaseForStep(currentStep);
  const phaseColors = phaseColorMap[currentPhase?.name || ''] || phaseColorMap['Phase 1: 基础'];
  const StepIcon = iconMap[currentStepConfig.icon] || Lightbulb;

  // Handle step click
  const handleStepClick = (stepNumber: number) => {
    setCurrentStep(stepNumber);
    setEditing(false);
    // On mobile, switch to content tab
    setMobileTab('content');
  };

  // Handle generate step
  const handleGenerateStep = (stepNumber?: number) => {
    const num = stepNumber || currentStep;

    // Check step dependencies
    const stepConfig = getStepConfig(num);
    if (stepConfig?.dependencies) {
      const missingDeps = stepConfig.dependencies.filter(
        dep => !novelSteps.find(s => s.stepNumber === dep && (s.status === 'completed' || s.status === 'locked'))
      );
      if (missingDeps.length > 0) {
        const depNames = missingDeps.map(d => {
          const cfg = getStepConfig(d);
          return `第${d}步 ${cfg?.title || ''}`;
        });
        toast.warning('建议先完成前置步骤', {
          description: `请先完成: ${depNames.join('、')}`,
          action: {
            label: '继续生成',
            onClick: () => {
              setGenerateStepNumber(num);
              setGenerateDialogOpen(true);
            },
          },
          duration: 6000,
        });
        return;
      }
    }

    setGenerateStepNumber(num);
    setGenerateDialogOpen(true);
  };

  // Handle edit toggle
  const handleEditToggle = () => {
    if (editing) {
      // Check if there are unsaved changes
      if (editContent !== originalContentRef.current) {
        setDiscardDialogOpen(true);
        return;
      }
      setEditing(false);
    } else {
      originalContentRef.current = currentStepData?.content || '';
      setEditContent(currentStepData?.content || '');
      setEditing(true);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!currentNovel) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/novels/${currentNovel.id}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepNumber: currentStep,
          content: editContent,
          status: currentStepData?.status || 'pending',
        }),
      });
      if (res.ok) {
        const updatedStep = await res.json();
        // Update local novel data
        const updatedSteps = [...(novelSteps.filter((s) => s.stepNumber !== currentStep)), {
          stepNumber: currentStep,
          title: currentStepConfig.title,
          content: editContent,
          status: currentStepData?.status || 'pending',
        }] as StepData[];
        if (currentNovel) {
          setCurrentNovel({ ...currentNovel, steps: updatedSteps });
        }
        setEditing(false);
        toast.success('内容已保存');
      } else {
        toast.error('保存失败');
      }
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // Handle confirm/lock step
  const handleConfirmStep = async () => {
    if (!currentNovel || !currentStepData) return;
    try {
      const res = await fetch(`/api/novels/${currentNovel.id}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepNumber: currentStep,
          content: currentStepData.content,
          status: 'locked',
        }),
      });
      if (res.ok) {
        const updatedStep = await res.json();
        const updatedSteps = novelSteps.map((s) =>
          s.stepNumber === currentStep ? { ...s, status: 'locked' } : s
        );
        if (currentNovel) {
          setCurrentNovel({ ...currentNovel, steps: updatedSteps });
        }
        toast.success(`第${currentStep}步已确认锁定`);
      } else {
        toast.error('确认失败');
      }
    } catch {
      toast.error('确认失败');
    }
  };

  // Handle unlock step
  const handleUnlockStep = async () => {
    if (!currentNovel || !currentStepData) return;
    try {
      const res = await fetch(`/api/novels/${currentNovel.id}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepNumber: currentStep,
          content: currentStepData.content,
          status: 'completed',
        }),
      });
      if (res.ok) {
        const updatedSteps = novelSteps.map((s) =>
          s.stepNumber === currentStep ? { ...s, status: 'completed' } : s
        );
        if (currentNovel) {
          setCurrentNovel({ ...currentNovel, steps: updatedSteps });
        }
        toast.success(`第${currentStep}步已解锁`);
      } else {
        toast.error('解锁失败');
      }
    } catch {
      toast.error('解锁失败');
    }
  };

  // Handle generate chapter
  const handleGenerateChapter = async () => {
    if (!currentNovel) return;
    setIsChapterGenerating(true);
    try {
      const chapterNumber = (currentNovel.chapters?.length || 0) + 1;
      const res = await fetch(`/api/novels/${currentNovel.id}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterNumber, model: selectedModel }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '生成失败');
      }
      toast.success(`第${chapterNumber}章生成完成`);
      // Refresh novel
      const novelRes = await fetch(`/api/novels/${currentNovel.id}`);
      if (novelRes.ok) {
        setCurrentNovel(await novelRes.json());
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '章节生成失败');
    } finally {
      setIsChapterGenerating(false);
    }
  };

  // Handle send chat (streaming)
  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim() || !currentNovel) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setIsChatLoading(true);

    const userMessage = {
      id: `temp-${Date.now()}`,
      role: 'user' as const,
      content: userMsg,
      createdAt: new Date().toISOString(),
    };
    addChatMessage(userMessage);

    const assistantId = `stream-${Date.now()}`;
    const assistantMessage = {
      id: assistantId,
      role: 'assistant' as const,
      content: '',
      createdAt: new Date().toISOString(),
    };
    addChatMessage(assistantMessage);

    try {
      const response = await fetch(`/api/novels/${currentNovel.id}/chat-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          model: selectedModel || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'content') {
              fullContent += parsed.data;
              // Update the assistant message in store
              const msgs = useAppStore.getState().chatMessages.map((m) =>
                m.id === assistantId ? { ...m, content: fullContent } : m
              );
              useAppStore.getState().setChatMessages(msgs);
            } else if (parsed.type === 'error') {
              toast.error(parsed.data || 'AI 回复出错');
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (error) {
      console.error('Chat stream error:', error);
      // Remove the empty assistant message on error
      const msgs = useAppStore.getState().chatMessages.filter((m) => m.id !== assistantId);
      useAppStore.getState().setChatMessages(msgs);
      toast.error('AI 回复失败，请重试');
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, currentNovel, selectedModel, addChatMessage]);

  // Clear chat messages
  const clearChatMessages = useCallback(() => {
    setChatMessages([]);
    toast.success('对话已清空');
  }, [setChatMessages]);

  // Keyboard navigation between steps
  useEffect(() => {
    if (!currentNovel) return;
    const totalSteps = STEPS.length;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate when typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      // '?' or 'h' opens shortcuts help
      if (e.key === '?' || e.key === 'h') {
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          // Find and toggle the shortcuts help popover
          const helpBtn = document.querySelector('[data-shortcuts-help]');
          if (helpBtn) helpBtn.click();
          return;
        }
      }
      if (e.key === 'e' || e.key === 'E') {
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleEditToggle();
        }
      }
      if (e.key === 'g' || e.key === 'G') {
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleGenerateStep();
        }
      }
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentStep(currentStep >= totalSteps ? 1 : currentStep + 1);
        setEditing(false);
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentStep(currentStep <= 1 ? totalSteps : currentStep - 1);
        setEditing(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentNovel, currentStep, setCurrentStep]);

  // Handle chat keydown (Ctrl+Enter to send)
  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  // Step status icon
  const renderStepStatus = (stepNumber: number) => {
    const step = getStepData(stepNumber);
    const status = step?.status;

    if (status === 'generating' || (isGenerating && useAppStore.getState().generateStepNumber === stepNumber)) {
      return <Timer className="size-3.5 text-amber-500 animate-pulse" />;
    }
    if (status === 'completed' || status === 'locked') {
      return <CheckCircle2 className="size-3.5 text-emerald-500" />;
    }
    return <Circle className="size-3.5 text-muted-foreground/40" />;
  };

  // If no novel selected
  if (!currentNovel) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30 mx-auto">
            <BookOpen className="size-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold">未选择小说项目</h2>
          <p className="text-sm text-muted-foreground">请先从仪表盘选择一个小说项目</p>
          <Button variant="outline" onClick={() => setViewMode('dashboard')} className="gap-2">
            <ArrowLeft className="size-4" />
            返回仪表盘
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Desktop: 3-panel resizable layout */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel: Step Sidebar */}
          {!leftCollapsed && (
            <>
              <ResizablePanel defaultSize={20} minSize={16} maxSize={28} className="flex flex-col">
                <StepSidebar
                  currentNovel={currentNovel}
                  currentStep={currentStep}
                  novelSteps={novelSteps}
                  onStepClick={handleStepClick}
                  onGenerateStep={handleGenerateStep}
                  onGenerateChapter={handleGenerateChapter}
                  isChapterGenerating={isChapterGenerating}
                  onClose={() => setLeftCollapsed(true)}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}
          {leftCollapsed && (
            <ResizablePanel defaultSize={3} minSize={3} maxSize={3}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLeftCollapsed(false)}
                className="h-full w-full rounded-none border-r hover:bg-amber-50 dark:hover:bg-amber-950/30"
                title="展开步骤面板"
              >
                <PanelLeftClose className="size-4" />
              </Button>
            </ResizablePanel>
          )}

          {/* Main Panel: Step Content */}
          <ResizablePanel defaultSize={55} minSize={30}>
            <StepContentPanel
              stepConfig={currentStepConfig}
              stepData={currentStepData}
              phaseColors={phaseColors}
              phaseName={currentPhase?.name || ''}
              StepIcon={StepIcon}
              editing={editing}
              editContent={editContent}
              saving={saving}
              isGenerating={isGenerating}
              currentStep={currentStep}
              onEditToggle={handleEditToggle}
              onEditContentChange={setEditContent}
              onSave={handleSave}
              onGenerate={() => handleGenerateStep()}
              onConfirm={handleConfirmStep}
              onUnlock={handleUnlockStep}
            />
          </ResizablePanel>

          {/* Right Panel: Chat */}
          {!rightCollapsed && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={25} minSize={18} maxSize={35} className="flex flex-col">
                <ChatPanel
                  messages={chatMessages}
                  chatInput={chatInput}
                  isChatLoading={isChatLoading}
                  onChatInputChange={setChatInput}
                  onSendChat={handleSendChat}
                  onChatKeyDown={handleChatKeyDown}
                  chatEndRef={chatEndRef}
                  onClose={() => setRightCollapsed(true)}
                  chatInputRef={chatInputRef}
                  onClearMessages={clearChatMessages}
                />
              </ResizablePanel>
            </>
          )}
          {rightCollapsed && (
            <>
              <ResizablePanel defaultSize={3} minSize={3} maxSize={3}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRightCollapsed(false)}
                  className="h-full w-full rounded-none border-l hover:bg-amber-50 dark:hover:bg-amber-950/30"
                  title="展开对话面板"
                >
                  <PanelRightClose className="size-4" />
                </Button>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Mobile: Tabbed layout */}
      <div className="flex flex-col flex-1 md:hidden overflow-hidden">
        {/* Mobile content area */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {mobileTab === 'steps' ? (
              <motion.div
                key="mobile-steps"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <StepSidebar
                  currentNovel={currentNovel}
                  currentStep={currentStep}
                  novelSteps={novelSteps}
                  onStepClick={handleStepClick}
                  onGenerateStep={handleGenerateStep}
                  onGenerateChapter={handleGenerateChapter}
                  isChapterGenerating={isChapterGenerating}
                />
              </motion.div>
            ) : mobileTab === 'content' ? (
              <motion.div
                key="mobile-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <StepContentPanel
                  stepConfig={currentStepConfig}
                  stepData={currentStepData}
                  phaseColors={phaseColors}
                  phaseName={currentPhase?.name || ''}
                  StepIcon={StepIcon}
                  editing={editing}
                  editContent={editContent}
                  saving={saving}
                  isGenerating={isGenerating}
                  currentStep={currentStep}
                  onEditToggle={handleEditToggle}
                  onEditContentChange={setEditContent}
                  onSave={handleSave}
                  onGenerate={() => handleGenerateStep()}
                  onConfirm={handleConfirmStep}
                  onUnlock={handleUnlockStep}
                />
              </motion.div>
            ) : (
              <motion.div
                key="mobile-chat"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <ChatPanel
                  messages={chatMessages}
                  chatInput={chatInput}
                  isChatLoading={isChatLoading}
                  onChatInputChange={setChatInput}
                  onSendChat={handleSendChat}
                  onChatKeyDown={handleChatKeyDown}
                  chatEndRef={chatEndRef}
                  chatInputRef={chatInputRef}
                  onClearMessages={clearChatMessages}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile tab bar */}
        <div className="flex border-t bg-background shrink-0">
          <button
            onClick={() => setMobileTab('steps')}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
              mobileTab === 'steps'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-muted-foreground'
            }`}
          >
            <List className="size-4" />
            步骤
          </button>
          <button
            onClick={() => setMobileTab('content')}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
              mobileTab === 'content'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-muted-foreground'
            }`}
          >
            <FileText className="size-4" />
            内容
          </button>
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors relative ${
              mobileTab === 'chat'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-muted-foreground'
            }`}
          >
            <MessageSquare className="size-4" />
            对话
          </button>
        </div>
      </div>

      {/* Discard Changes Confirmation Dialog */}
      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>放弃修改？</AlertDialogTitle>
            <AlertDialogDescription>
              您有未保存的修改内容。确定要放弃这些修改吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续编辑</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setEditing(false); setDiscardDialogOpen(false); }}>
              放弃修改
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==========================================
// Step Sidebar Component
// ==========================================
function StepSidebar({
  currentNovel,
  currentStep,
  novelSteps,
  onStepClick,
  onGenerateStep,
  onGenerateChapter,
  isChapterGenerating,
  onClose,
}: {
  currentNovel: { title: string; genre: string; chapters?: { number: number }[] };
  currentStep: number;
  novelSteps: StepData[];
  onStepClick: (step: number) => void;
  onGenerateStep: (step: number) => void;
  onGenerateChapter: () => void;
  isChapterGenerating: boolean;
  onClose?: () => void;
}) {
  const getStepData = (stepNumber: number) =>
    novelSteps.find((s) => s.stepNumber === stepNumber);

  const renderStepStatus = (stepNumber: number) => {
    const step = getStepData(stepNumber);
    const status = step?.status;
    const store = useAppStore.getState();

    if (status === 'generating' || (store.isGenerating && store.generateStepNumber === stepNumber)) {
      return <Timer className="size-3.5 text-amber-500 animate-pulse" />;
    }
    if (status === 'locked') {
      return <Lock className="size-3.5 text-amber-500" />;
    }
    if (status === 'completed') {
      return <CheckCircle2 className="size-3.5 text-emerald-500" />;
    }
    return <Circle className="size-3.5 text-muted-foreground/40" />;
  };

  const completedCount = novelSteps.filter(
    (s) => s.status === 'completed' || s.status === 'locked'
  ).length;
  const progress = Math.round((completedCount / STEPS.length) * 100);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{currentNovel.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">创作进度 {progress}%</p>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
              <X className="size-3.5" />
            </Button>
          )}
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps List */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-2 space-y-1">
          {PHASES.map((phase) => {
            const colors = phaseColorMap[phase.name] || phaseColorMap['Phase 1: 基础'];
            return (
              <div key={phase.name} className="mb-3">
                {/* Phase header */}
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${phase.color.replace('bg-', 'bg-')}`} />
                  <span className={`text-[11px] font-medium ${colors.text}`}>
                    {phase.name}
                  </span>
                </div>

                {/* Steps */}
                {phase.steps.map((stepNum) => {
                  const config = getStepConfig(stepNum);
                  const data = getStepData(stepNum);
                  const isActive = currentStep === stepNum;
                  const Icon = iconMap[config.icon] || Lightbulb;

                  return (
                    <button
                      key={stepNum}
                      onClick={() => onStepClick(stepNum)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150 group ${
                        isActive
                          ? `${colors.bg} border-l-2 ${colors.border} -ml-[2px] pl-[calc(0.625rem+2px)]`
                          : 'hover:bg-muted/50 border-l-2 border-transparent -ml-[2px] pl-[calc(0.625rem+2px)]'
                      }`}
                    >
                      <Icon className={`size-4 shrink-0 ${isActive ? colors.text : 'text-muted-foreground/60 group-hover:text-muted-foreground'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground/60 font-mono">
                            {String(stepNum).padStart(2, '0')}
                          </span>
                          <span className={`text-xs font-medium truncate ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                            {config.title}
                          </span>
                        </div>
                      </div>
                      {renderStepStatus(stepNum)}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Generate Chapter Button */}
      <div className="px-3 py-3 border-t shrink-0">
        <Button
          onClick={onGenerateChapter}
          disabled={isChapterGenerating}
          variant="outline"
          className="w-full gap-2 text-xs h-8 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400"
        >
          {isChapterGenerating ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <BookOpen className="size-3.5" />
              生成章节 (第{(currentNovel.chapters?.length || 0) + 1}章)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ==========================================
// Step Content Panel Component
// ==========================================
function StepContentPanel({
  stepConfig,
  stepData,
  phaseColors,
  phaseName,
  StepIcon,
  editing,
  editContent,
  saving,
  isGenerating,
  currentStep,
  onEditToggle,
  onEditContentChange,
  onSave,
  onGenerate,
  onConfirm,
  onUnlock,
}: {
  stepConfig: ReturnType<typeof getStepConfig>;
  stepData: StepData | undefined;
  phaseColors: { text: string; bg: string; border: string; badge: string };
  phaseName: string;
  StepIcon: React.ElementType;
  editing: boolean;
  editContent: string;
  saving: boolean;
  isGenerating: boolean;
  currentStep: number;
  onEditToggle: () => void;
  onEditContentChange: (val: string) => void;
  onSave: () => void;
  onGenerate: () => void;
  onConfirm: () => void;
  onUnlock: () => void;
}) {
  const hasContent = stepData?.content && stepData.content.trim().length > 0;
  const isLocked = stepData?.status === 'locked';

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Step Header */}
      <div className="px-4 sm:px-6 py-3 border-b shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${phaseColors.bg} mt-0.5`}>
              <StepIcon className={`size-5 ${phaseColors.text}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-base">
                  第{currentStep}步 · {stepConfig.title}
                </h2>
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 border-0 ${phaseColors.badge}`}>
                  {phaseName}
                </Badge>
                {isLocked && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-0">
                    <Lock className="size-2.5 mr-0.5" />
                    已锁定
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{stepConfig.subtitle}</p>
            </div>
          </div>

          {/* Keyboard Shortcuts Help */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" data-shortcuts-help>
                <HelpCircle className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" side="bottom" align="end">
              <div className="flex items-center gap-2 mb-3">
                <Keyboard className="size-4 text-amber-500" />
                <h4 className="font-medium text-sm">快捷键</h4>
              </div>
              <div className="space-y-2">
                {[
                  { keys: 'j / ↓', desc: '下一步' },
                  { keys: 'k / ↑', desc: '上一步' },
                  { keys: 'e', desc: '编辑/保存切换' },
                  { keys: 'g', desc: '生成当前步骤' },
                  { keys: 'Esc', desc: '退出编辑' },
                ].map((shortcut) => (
                  <div key={shortcut.keys} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{shortcut.desc}</span>
                    <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {hasContent && !editing && !isLocked && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEditToggle}
                className="h-8 gap-1.5 text-xs"
              >
                <Pencil className="size-3.5" />
                <span className="hidden sm:inline">编辑</span>
              </Button>
            )}
            {editing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEditToggle}
                  disabled={saving}
                  className="h-8 gap-1.5 text-xs"
                >
                  <X className="size-3.5" />
                  取消
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSave}
                  disabled={saving}
                  className="h-8 gap-1.5 text-xs border-amber-300 dark:border-amber-700"
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  保存
                </Button>
              </>
            )}
            {hasContent && stepConfig.needConfirm && (
              isLocked ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onUnlock}
                  className="h-8 gap-1.5 text-xs text-amber-600"
                >
                  <Unlock className="size-3.5" />
                  <span className="hidden sm:inline">解锁</span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onConfirm}
                  className="h-8 gap-1.5 text-xs text-amber-600"
                >
                  <Lock className="size-3.5" />
                  <span className="hidden sm:inline">确认锁定</span>
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="h-full flex flex-col"
        >
          <ScrollArea className="flex-1">
            <div className="px-4 sm:px-6 py-5 max-w-4xl mx-auto">
              {editing ? (
                /* Edit Mode */
                <Textarea
                  value={editContent}
                  onChange={(e) => onEditContentChange(e.target.value)}
                  className="min-h-[400px] font-mono text-sm leading-relaxed resize-y"
                  placeholder="在此编辑内容..."
                />
              ) : hasContent ? (
                /* View Mode with Markdown */
                <>
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:leading-relaxed prose-li:leading-relaxed prose-strong:text-foreground">
                    <ReactMarkdown>{stepData!.content}</ReactMarkdown>
                  </div>
                  {/* Word Count / Reading Time / Copy Bar */}
                  <ContentInfoBar content={stepData!.content} />
                </>
              ) : (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 mb-6">
                    <StepIcon className={`size-10 ${phaseColors.text}`} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{stepConfig.title}</h3>
                  <p className="text-sm text-muted-foreground max-w-lg text-center leading-relaxed mb-6">
                    {stepConfig.description}
                  </p>
                  <Button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-orange-700 hover:shadow-lg transition-all"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        AI 生成中，请稍候...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        开始生成
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// Content Info Bar (Word Count, Reading Time, Copy)
// ==========================================
function ContentInfoBar({ content }: { content: string }) {
  // Count Chinese characters (non-whitespace, excluding markdown syntax)
  const cleanText = content
    .replace(/```[\s\S]*?```/g, '')        // remove code blocks
    .replace(/`[^`]+`/g, '')                // remove inline code
    .replace(/#{1,6}\s/g, '')               // remove heading markers
    .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, '$2') // remove bold/italic markers
    .replace(/~~(.*?)~~/g, '$1')            // remove strikethrough
    .replace(/!\[.*?\]\(.*?\)/g, '')        // remove image syntax
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1') // keep link text, remove url
    .replace(/>\s/g, '')                     // remove blockquote markers
    .replace(/[-*+]\s/g, '')                 // remove list markers
    .replace(/\d+\.\s/g, '')                 // remove numbered list markers
    .replace(/\s+/g, '');                    // remove all whitespace

  const charCount = cleanText.length;
  const readingTime = Math.max(1, Math.ceil(charCount / 400));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('已复制到剪贴板');
    } catch {
      toast.error('复制失败');
    }
  };

  return (
    <div className="flex items-center justify-between mt-6 pt-3 border-t border-border/50 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <Type className="size-3.5" />
          {charCount} 字
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          约 {readingTime} 分钟
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Copy className="size-3.5" />
        复制
      </Button>
    </div>
  );
}

// ==========================================
// Chat Panel Component
// ==========================================
function ChatPanel({
  messages,
  chatInput,
  isChatLoading,
  onChatInputChange,
  onSendChat,
  onChatKeyDown,
  chatEndRef,
  onClose,
  chatInputRef,
  onClearMessages,
}: {
  messages: { role: string; content: string; createdAt?: string }[];
  chatInput: string;
  isChatLoading: boolean;
  onChatInputChange: (val: string) => void;
  onSendChat: () => void;
  onChatKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  onClose?: () => void;
  chatInputRef?: React.RefObject<HTMLTextAreaElement | null>;
  onClearMessages?: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-4 text-amber-500" />
            <h3 className="font-semibold text-sm">AI 创作助手</h3>
          </div>
          <div className="flex items-center gap-1">
            {onClearMessages && messages.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClearMessages}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>清空对话</TooltipContent>
              </Tooltip>
            )}
            {onClose && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/30 mb-4">
                <MessageCircle className="size-6 text-amber-500" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">AI 创作助手</p>
              <p className="text-xs text-muted-foreground/70 max-w-[200px]">
                您可以就小说创作的任何问题与我对话，我会基于已完成的内容提供建议。
              </p>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] group ${
                    isUser ? '' : ''
                  }`}
                >
                  <div
                    className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-amber-500 text-white rounded-br-sm'
                        : 'bg-muted/80 dark:bg-muted/40 text-foreground rounded-bl-sm'
                    }`}
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-p:leading-relaxed prose-li:leading-relaxed prose-strong:text-foreground">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {!isUser && (
                    <div className="flex items-center justify-between mt-1.5 px-1">
                      {msg.createdAt && (
                        <span className="text-[10px] text-muted-foreground/50">
                          {new Date(msg.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {msg.content && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            toast.success('已复制');
                          }}
                        >
                          <Copy className="size-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-muted/80 dark:bg-muted/40 rounded-xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="size-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:0ms]" />
                  <div className="size-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:150ms]" />
                  <div className="size-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </ScrollArea>

      {/* Chat Input */}
      <div className="px-4 py-3 border-t shrink-0">
        <div className="flex items-end gap-2">
          <Textarea
            ref={chatInputRef}
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            onKeyDown={onChatKeyDown}
            placeholder="输入消息... (Enter 发送)"
            className="min-h-[36px] max-h-[120px] resize-none text-sm"
            rows={1}
            disabled={isChatLoading}
          />
          <Button
            size="icon"
            onClick={onSendChat}
            disabled={!chatInput.trim() || isChatLoading}
            className="shrink-0 h-9 w-9 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
          >
            <Send className="size-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1.5 text-center">
          按 Enter 发送，Shift+Enter 换行
        </p>
      </div>
    </div>
  );
}
