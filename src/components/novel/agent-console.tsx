'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useAppStore, type AgentActivityData } from '@/store/app-store';
import { AGENTS, getAgent, getSkillsForAgent, getCategoriesForAgent, type AgentRole, type AgentDefinition, type SkillDefinition } from '@/lib/agents';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Send,
  ChevronDown,
  ChevronUp,
  Brain,
  Bot,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Zap,
  X,
  Wrench,
  MessageSquare,
  Clock,
  PanelRightClose,
  Play,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// Props & Types
// ============================================================================

interface AgentConsoleProps {
  novelId: string;
  onClose?: () => void;
}

// ============================================================================
// Icon mapping for skill icons
// ============================================================================

const skillIconMap: Record<string, React.ElementType> = {
  Search: Brain,
  Route: Zap,
  Send: Send,
  ClipboardCheck: CheckCircle2,
  Users: Bot,
  Lightbulb: Sparkles,
  Zap: Zap,
  BarChart3: Bot,
  Combine: Sparkles,
  FileText: MessageSquare,
  Activity: Zap,
  ListTree: Bot,
  Gauge: Clock,
  Flag: Sparkles,
  UserCircle: Bot,
  Network: Bot,
  TrendingUp: Zap,
  MessageCircle: MessageSquare,
  BookOpen: MessageSquare,
  Image: Sparkles,
  MessagesSquare: MessageSquare,
  Play: Play,
  Flame: Sparkles,
  Microscope: Brain,
  ShieldCheck: CheckCircle2,
  Sparkles: Sparkles,
  PenTool: MessageSquare,
  Globe: Bot,
  Wand2: Sparkles,
  Swords: Zap,
  Scroll: MessageSquare,
};

// ============================================================================
// Agent status config
// ============================================================================

const statusConfig: Record<string, { label: string; color: string; dotClass: string; bgColor: string }> = {
  idle: {
    label: '待命中',
    color: 'text-muted-foreground',
    dotClass: 'bg-muted-foreground/50',
    bgColor: 'bg-muted/30',
  },
  thinking: {
    label: '思考中',
    color: 'text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
  },
  working: {
    label: '执行中',
    color: 'text-emerald-600 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  done: {
    label: '已完成',
    color: 'text-sky-600 dark:text-sky-400',
    dotClass: 'bg-sky-500',
    bgColor: 'bg-sky-50 dark:bg-sky-950/30',
  },
};

// ============================================================================
// Helper: get agent color classes
// ============================================================================

function getAgentColorClasses(color: string) {
  const map: Record<string, { text: string; bg: string; border: string; lightBg: string; badge: string }> = {
    'bg-amber-500': {
      text: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500',
      border: 'border-amber-500',
      lightBg: 'bg-amber-50 dark:bg-amber-950/40',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    },
    'bg-yellow-500': {
      text: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-500',
      border: 'border-yellow-500',
      lightBg: 'bg-yellow-50 dark:bg-yellow-950/40',
      badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
    },
    'bg-blue-600': {
      text: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-600',
      border: 'border-blue-500',
      lightBg: 'bg-blue-50 dark:bg-blue-950/40',
      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    },
    'bg-pink-500': {
      text: 'text-pink-600 dark:text-pink-400',
      bg: 'bg-pink-500',
      border: 'border-pink-500',
      lightBg: 'bg-pink-50 dark:bg-pink-950/40',
      badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400',
    },
    'bg-emerald-500': {
      text: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500',
      border: 'border-emerald-500',
      lightBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    },
    'bg-violet-500': {
      text: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-500',
      border: 'border-violet-500',
      lightBg: 'bg-violet-50 dark:bg-violet-950/40',
      badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
    },
    'bg-teal-500': {
      text: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-500',
      border: 'border-teal-500',
      lightBg: 'bg-teal-50 dark:bg-teal-950/40',
      badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
    },
  };
  return map[color] || map['bg-amber-500'];
}

// ============================================================================
// Helper: format timestamp
// ============================================================================

function formatTimestamp(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: zhCN });
}

// ============================================================================
// Main Agent Console Component
// ============================================================================

export function AgentConsole({ novelId, onClose }: AgentConsoleProps) {
  const activeAgent = useAppStore((s) => s.activeAgent);
  const setActiveAgent = useAppStore((s) => s.setActiveAgent);
  const agentActivities = useAppStore((s) => s.agentActivities);
  const addAgentActivity = useAppStore((s) => s.addAgentActivity);
  const setAgentActivities = useAppStore((s) => s.setAgentActivities);
  const agentStatus = useAppStore((s) => s.agentStatus);
  const setAgentStatus = useAppStore((s) => s.setAgentStatus);
  const selectedModel = useAppStore((s) => s.selectedModel);

  const [inputText, setInputText] = useState('');
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillDefinition | null>(null);
  const [skillDialogParams, setSkillDialogParams] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);

  const activityEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  const currentAgentDef = activeAgent ? getAgent(activeAgent) : AGENTS[0];
  const agentColors = getAgentColorClasses(currentAgentDef?.color || 'bg-amber-500');
  const currentStatus = activeAgent ? (agentStatus[activeAgent] || 'idle') : 'idle';
  const statusInfo = statusConfig[currentStatus];
  const currentSkills = activeAgent ? getSkillsForAgent(activeAgent) : [];
  const skillCategories = activeAgent ? getCategoriesForAgent(activeAgent) : [];

  // Auto-scroll activity log to bottom
  useEffect(() => {
    if (activityEndRef.current) {
      activityEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agentActivities]);

  // Generate unique ID
  const generateId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Handle send message - calls real Agent API
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isSending || !currentAgentDef) return;

    const message = inputText.trim();
    setInputText('');
    setIsSending(true);

    // Add user message to activity log
    addAgentActivity({
      id: generateId(),
      type: 'user_message',
      agentId: 'user',
      agentName: '你',
      agentAvatar: '👤',
      content: message,
      timestamp: Date.now(),
    });

    // Set agent status to thinking
    setAgentStatus(currentAgentDef.id, 'thinking');

    // Track the thinking activity ID so we can remove it later
    const thinkingId = generateId();

    // Add thinking activity
    addAgentActivity({
      id: thinkingId,
      type: 'thinking',
      agentId: currentAgentDef.id,
      agentName: currentAgentDef.name,
      agentAvatar: currentAgentDef.avatar,
      content: '正在分析您的请求...',
      timestamp: Date.now(),
    });

    try {
      // Call real Agent API
      const res = await fetch(`/api/novels/${novelId}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          agentId: currentAgentDef.id,
          model: selectedModel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Agent 请求失败');
      }

      // Remove the optimistic thinking bubble and replace with actual response
      setAgentActivities(useAppStore.getState().agentActivities.filter(a => a.id !== thinkingId));

      // Set agent status to working while processing activities
      setAgentStatus(currentAgentDef.id, 'working');

      // Add activities from the server response
      if (data.activities && Array.isArray(data.activities)) {
        for (const activity of data.activities) {
          addAgentActivity({
            id: activity.id || generateId(),
            type: activity.type || 'message',
            agentId: activity.agentId || currentAgentDef.id,
            agentName: activity.agentName || currentAgentDef.name,
            agentAvatar: currentAgentDef.avatar,
            content: activity.content || '',
            skillName: activity.skillName,
            skillDescription: activity.skillDescription,
            timestamp: activity.createdAt ? new Date(activity.createdAt).getTime() : Date.now(),
          });
        }
      }

      // Add the agent's message response
      if (data.agentMessage) {
        addAgentActivity({
          id: generateId(),
          type: 'message',
          agentId: data.agentMessage.agentId || currentAgentDef.id,
          agentName: data.agentMessage.agentName || currentAgentDef.name,
          agentAvatar: currentAgentDef.avatar,
          content: data.agentMessage.content,
          timestamp: Date.now(),
        });

        // Show skill usage if detected
        if (data.agentMessage.skillsUsed?.length > 0) {
          const skill = data.agentMessage.skillsUsed[0];
          addAgentActivity({
            id: generateId(),
            type: 'skill_complete',
            agentId: data.agentMessage.agentId || currentAgentDef.id,
            agentName: data.agentMessage.agentName || currentAgentDef.name,
            agentAvatar: currentAgentDef.avatar,
            skillName: skill.skillName,
            timestamp: Date.now(),
          });
        }
      }

      // Set agent status to done
      setAgentStatus(currentAgentDef.id, 'done');
    } catch (error) {
      // Remove the optimistic thinking bubble
      setAgentActivities(useAppStore.getState().agentActivities.filter(a => a.id !== thinkingId));

      // Reset agent status to idle on error
      setAgentStatus(currentAgentDef.id, 'idle');

      // Show error in activity log
      addAgentActivity({
        id: generateId(),
        type: 'error',
        agentId: currentAgentDef.id,
        agentName: currentAgentDef.name,
        agentAvatar: currentAgentDef.avatar,
        content: error instanceof Error ? error.message : '请求失败，请稍后重试',
        timestamp: Date.now(),
      });
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, currentAgentDef, novelId, addAgentActivity, generateId, setAgentStatus, setAgentActivities]);

  // Handle keyboard input
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Handle skill click
  const handleSkillClick = useCallback((skill: SkillDefinition) => {
    setSelectedSkill(skill);
    const params: Record<string, string> = {};
    for (const param of skill.parameters) {
      params[param.key] = param.defaultValue || '';
    }
    setSkillDialogParams(params);
    setSkillDialogOpen(true);
  }, []);

  // Handle execute skill - calls real Skill API
  const handleExecuteSkill = useCallback(async () => {
    if (!selectedSkill || !currentAgentDef) return;
    setSkillDialogOpen(false);

    const agentId = currentAgentDef.id;
    const agentName = currentAgentDef.name;
    const agentAvatar = currentAgentDef.avatar;

    // Add skill_start activity
    addAgentActivity({
      id: generateId(),
      type: 'skill_start',
      agentId,
      agentName,
      agentAvatar,
      content: '',
      skillName: selectedSkill.name,
      skillDescription: selectedSkill.description,
      timestamp: Date.now(),
    });

    try {
      // Call real Skill API
      const res = await fetch(`/api/novels/${novelId}/agent/skill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: currentAgentDef.id,
          skillId: selectedSkill.id,
          inputs: skillDialogParams,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '技能执行失败');
      }

      // Show completion
      addAgentActivity({
        id: generateId(),
        type: 'skill_complete',
        agentId,
        agentName,
        agentAvatar,
        content: '',
        skillName: selectedSkill.name,
        timestamp: Date.now(),
      });

      // Show result message
      addAgentActivity({
        id: generateId(),
        type: 'message',
        agentId,
        agentName,
        agentAvatar,
        content: data.result || '技能执行完成，但未返回结果。',
        timestamp: Date.now(),
      });
    } catch (error) {
      addAgentActivity({
        id: generateId(),
        type: 'error',
        agentId,
        agentName,
        agentAvatar,
        content: error instanceof Error ? error.message : '技能执行失败',
        timestamp: Date.now(),
      });
    }

    setSelectedSkill(null);
  }, [selectedSkill, currentAgentDef, novelId, skillDialogParams, addAgentActivity, generateId]);

  // Handle agent switch
  const handleAgentSwitch = useCallback((agentId: AgentRole) => {
    setActiveAgent(agentId);
    // Collapse skills when switching agents
    setSkillsOpen(false);
  }, [setActiveAgent]);

  if (!currentAgentDef) return null;

  return (
    <div ref={consoleRef} className="flex flex-col h-full bg-background">
      {/* ================================================================== */}
      {/* Section 1: Agent Header Bar                                        */}
      {/* ================================================================== */}
      <AgentHeaderBar
        currentAgent={currentAgentDef}
        agentColors={agentColors}
        currentStatus={currentStatus}
        statusInfo={statusInfo}
        onClose={onClose}
        onAgentSwitch={handleAgentSwitch}
      />

      <Separator className="shrink-0" />

      {/* ================================================================== */}
      {/* Section 2: Agent Activity Log (Main Area)                          */}
      {/* ================================================================== */}
      <div className="flex-1 overflow-hidden relative">
        {/* Clear activities button */}
        {agentActivities.length > 0 && (
          <button
            onClick={() => setAgentActivities([])}
            className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <Trash2 className="size-3" />
            清空活动记录
          </button>
        )}
        <ScrollArea className="h-full">
          <div className="px-3 sm:px-4 py-3 space-y-2 max-w-4xl mx-auto">
            {/* Empty state */}
            {agentActivities.length === 0 && (
              <EmptyState
                currentAgent={currentAgentDef}
                agentColors={agentColors}
                onSuggestionClick={setInputText}
                inputRef={inputRef}
              />
            )}

            {/* Activity entries */}
            <AnimatePresence initial={false}>
              {agentActivities.map((activity) => (
                <ActivityEntry
                  key={activity.id}
                  activity={activity}
                  agentColors={agentColors}
                />
              ))}
            </AnimatePresence>

            {/* Loading indicator for sending */}
            {isSending && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="flex items-center gap-2.5 px-3 py-2">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-xs bg-muted">
                      {currentAgentDef.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted/60 dark:bg-muted/30 rounded-xl rounded-bl-sm px-3.5 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="size-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:0ms]" />
                      <div className="size-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:150ms]" />
                      <div className="size-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={activityEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* ================================================================== */}
      {/* Section 3: Skills Panel (Collapsible)                              */}
      {/* ================================================================== */}
      <Collapsible open={skillsOpen} onOpenChange={setSkillsOpen}>
        <CollapsibleTrigger asChild>
          <button
            className="flex items-center justify-between w-full px-4 py-2.5 border-t bg-muted/30 hover:bg-muted/50 transition-colors shrink-0"
          >
            <div className="flex items-center gap-2">
              <Wrench className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                技能面板
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {currentSkills.length} 个技能
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              {skillsOpen ? (
                <ChevronDown className="size-3.5 text-muted-foreground" />
              ) : (
                <ChevronUp className="size-3.5 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ScrollArea className="max-h-48 border-t">
            <div className="px-4 py-3 space-y-4">
              {skillCategories.map((cat) => (
                <div key={cat.category}>
                  <h4 className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">
                    {cat.category}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cat.skills.map((skill) => (
                      <SkillCard
                        key={skill.id}
                        skill={skill}
                        agentColors={agentColors}
                        onClick={() => handleSkillClick(skill)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      <Separator className="shrink-0" />

      {/* ================================================================== */}
      {/* Section 4: Input Area                                               */}
      {/* ================================================================== */}
      <div className="px-3 sm:px-4 py-3 shrink-0">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <Textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`向 ${currentAgentDef.name} 发送消息...`}
            className="min-h-[40px] max-h-[140px] resize-none text-sm leading-relaxed"
            rows={1}
            disabled={isSending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            className={`shrink-0 h-10 w-10 text-white shadow-md transition-all ${
              isSending
                ? 'bg-muted-foreground'
                : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30'
            }`}
          >
            {isSending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between mt-1.5 max-w-4xl mx-auto">
          <p className="text-[10px] text-muted-foreground/50">
            Enter 发送 · Shift+Enter 换行
          </p>
          <p className={`text-[10px] ${agentColors.text} opacity-60`}>
            {currentAgentDef.role} · {currentAgentDef.description.slice(0, 30)}...
          </p>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Skill Execution Dialog                                             */}
      {/* ================================================================== */}
      <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{currentAgentDef.avatar}</span>
              <span>{selectedSkill?.name}</span>
            </DialogTitle>
            <DialogDescription>
              {selectedSkill?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedSkill && selectedSkill.parameters.length > 0 && (
            <div className="space-y-3 py-2">
              {selectedSkill.parameters.map((param) => (
                <div key={param.key} className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    {param.label}
                    {param.required && (
                      <span className="text-destructive text-xs">*</span>
                    )}
                  </label>
                  {param.type === 'textarea' ? (
                    <Textarea
                      value={skillDialogParams[param.key] || ''}
                      onChange={(e) =>
                        setSkillDialogParams((prev) => ({
                          ...prev,
                          [param.key]: e.target.value,
                        }))
                      }
                      placeholder={param.placeholder}
                      className="min-h-[80px] text-sm"
                    />
                  ) : param.type === 'select' && param.options ? (
                    <div className="flex flex-wrap gap-1.5">
                      {param.options.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() =>
                            setSkillDialogParams((prev) => ({
                              ...prev,
                              [param.key]: opt.value,
                            }))
                          }
                          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                            skillDialogParams[param.key] === opt.value
                              ? `${agentColors.lightBg} ${agentColors.border} border ${agentColors.text}`
                              : 'border-border hover:bg-muted/50 text-muted-foreground'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type={param.type === 'number' ? 'number' : 'text'}
                      value={skillDialogParams[param.key] || ''}
                      onChange={(e) =>
                        setSkillDialogParams((prev) => ({
                          ...prev,
                          [param.key]: e.target.value,
                        }))
                      }
                      placeholder={param.placeholder}
                      className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSkillDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleExecuteSkill}
              className={`text-white ${agentColors.bg} hover:opacity-90`}
            >
              <Play className="size-3.5 mr-1.5" />
              执行技能
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Sub-Component: Agent Header Bar
// ============================================================================

const AgentHeaderBar = memo(function AgentHeaderBar({
  currentAgent,
  agentColors,
  currentStatus,
  statusInfo,
  onClose,
  onAgentSwitch,
}: {
  currentAgent: AgentDefinition;
  agentColors: ReturnType<typeof getAgentColorClasses>;
  currentStatus: string;
  statusInfo: Record<string, string>;
  onClose?: () => void;
  onAgentSwitch: (agentId: AgentRole) => void;
}) {
  const statusCfg = statusConfig[currentStatus] || statusConfig.idle;

  return (
    <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 shrink-0">
      {/* Left: Agent info */}
      <div className="flex items-center gap-3 min-w-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 hover:opacity-80 transition-opacity cursor-pointer group">
              <div className={`relative`}>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className={`text-base ${agentColors.lightBg} ${agentColors.text} font-semibold`}>
                    {currentAgent.avatar}
                  </AvatarFallback>
                </Avatar>
                {/* Status dot */}
                <div className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background ${statusCfg.dotClass}`}>
                  {(currentStatus === 'thinking' || currentStatus === 'working') && (
                    <span className="absolute inset-0 rounded-full animate-ping opacity-75 bg-inherit" />
                  )}
                </div>
              </div>
              <div className="hidden sm:block text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate">{currentAgent.name}</span>
                  <span className="text-xs text-muted-foreground">{currentAgent.nameEn}</span>
                </div>
                <span className={`text-[11px] ${agentColors.text} font-medium`}>
                  {currentAgent.role}
                </span>
              </div>
              <div className="sm:hidden">
                <span className="font-semibold text-sm">{currentAgent.name}</span>
              </div>
              <ChevronDown className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>切换智能体</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {AGENTS.map((agent) => {
              const colors = getAgentColorClasses(agent.color);
              const isActive = agent.id === currentAgent.id;
              return (
                <DropdownMenuItem
                  key={agent.id}
                  onClick={() => onAgentSwitch(agent.id)}
                  className={`gap-3 cursor-pointer ${isActive ? `${colors.lightBg}` : ''}`}
                >
                  <span className="text-lg">{agent.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{agent.name}</span>
                      <span className="text-[10px] text-muted-foreground">{agent.nameEn}</span>
                    </div>
                    <span className={`text-[11px] ${colors.text}`}>{agent.role}</span>
                  </div>
                  {isActive && <CheckCircle2 className={`size-3.5 ${colors.text} shrink-0`} />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status badge */}
        <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${statusCfg.bgColor} ${statusCfg.color}`}>
          {(currentStatus === 'thinking' || currentStatus === 'working') ? (
            <Loader2 className="size-3 animate-spin" />
          ) : currentStatus === 'done' ? (
            <CheckCircle2 className="size-3" />
          ) : (
            <Bot className="size-3" />
          )}
          {statusCfg.label}
        </div>
      </div>

      {/* Right: Close button */}
      {onClose && (
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
          <PanelRightClose className="size-4" />
        </Button>
      )}
    </div>
  );
});

// ============================================================================
// Sub-Component: Empty State
// ============================================================================

const EmptyState = memo(function EmptyState({
  currentAgent,
  agentColors,
  onSuggestionClick,
  inputRef,
}: {
  currentAgent: AgentDefinition;
  agentColors: ReturnType<typeof getAgentColorClasses>;
  onSuggestionClick: (text: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const suggestions = [
    `帮我构思一个${currentAgent.id === 'director' ? '玄幻类型的小说创意' : '创作方案'}`,
    '分析一下目前的市场热门趋势',
    '为我的角色设计一个独特的成长弧线',
  ];

  return (
    <div className="flex flex-col items-center justify-center py-10 sm:py-16 px-4 text-center">
      {/* Agent avatar with glow */}
      <div className="relative mb-5">
        <div className={`absolute inset-0 rounded-2xl ${agentColors.bg} opacity-10 blur-xl scale-150`} />
        <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl ${agentColors.lightBg} border`}>
          <span className="text-3xl">{currentAgent.avatar}</span>
        </div>
      </div>

      <h3 className="text-base font-semibold mb-1">{currentAgent.name} 已就绪</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
        {currentAgent.description}
      </p>

      {/* Suggestion chips */}
      <div className="space-y-2 w-full max-w-sm">
        <p className="text-[11px] text-muted-foreground/60 font-medium">快速开始：</p>
        {suggestions.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => {
              onSuggestionClick(suggestion);
              inputRef.current?.focus();
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm border transition-all hover:shadow-sm ${
              idx === 0
                ? `${agentColors.lightBg} ${agentColors.border} border ${agentColors.text} hover:shadow-md`
                : 'border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sparkles className={`size-3.5 shrink-0 ${idx === 0 ? agentColors.text : 'text-muted-foreground/50'}`} />
              {suggestion}
            </span>
          </button>
        ))}
      </div>

      {/* Skills hint */}
      <p className="text-[10px] text-muted-foreground/40 mt-6">
        点击下方「技能面板」可手动调用 {currentAgent.name} 的专业能力
      </p>
    </div>
  );
});

// ============================================================================
// Sub-Component: Activity Entry
// ============================================================================

const ActivityEntry = memo(function ActivityEntry({
  activity,
  agentColors,
}: {
  activity: AgentActivityData;
  agentColors: ReturnType<typeof getAgentColorClasses>;
}) {
  const isUser = activity.type === 'user_message';
  const isThinking = activity.type === 'thinking';
  const isSkillStart = activity.type === 'skill_start';
  const isSkillComplete = activity.type === 'skill_complete';
  const isMessage = activity.type === 'message';
  const isError = activity.type === 'error';

  // Determine agent colors from activity
  const agentDef = getAgent(activity.agentId as AgentRole);
  const activityColors = agentDef ? getAgentColorClasses(agentDef.color) : agentColors;

  // User messages: right-aligned
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] sm:max-w-[75%]">
          <div className="flex items-center justify-end gap-2 mb-1">
            <span className="text-[10px] text-muted-foreground/50">{formatTimestamp(activity.timestamp)}</span>
            <span className="text-[11px] font-medium text-muted-foreground">你</span>
          </div>
          <div className="bg-amber-500 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed shadow-sm">
            {activity.content}
          </div>
        </div>
      </motion.div>
    );
  }

  // Thinking bubble
  if (isThinking) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-start"
      >
        <div className="flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%]">
          <AgentAvatar avatar={activity.agentAvatar} colors={activityColors} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[11px] font-medium ${activityColors.text}`}>{activity.agentName}</span>
              <span className="text-[10px] text-muted-foreground/50">{formatTimestamp(activity.timestamp)}</span>
            </div>
            <ThinkingBubble content={activity.content} colors={activityColors} />
          </div>
        </div>
      </motion.div>
    );
  }

  // Skill start
  if (isSkillStart) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, x: -8 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.25 }}
        className="flex justify-start"
      >
        <div className="max-w-[90%] sm:max-w-[80%]">
          <SkillInvocationCard
            activity={activity}
            colors={activityColors}
            isComplete={false}
          />
        </div>
      </motion.div>
    );
  }

  // Skill complete
  if (isSkillComplete) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex justify-start"
      >
        <div className="max-w-[90%] sm:max-w-[80%]">
          <SkillInvocationCard
            activity={activity}
            colors={activityColors}
            isComplete={true}
          />
        </div>
      </motion.div>
    );
  }

  // Error
  if (isError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex justify-start"
      >
        <div className="flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%]">
          <AgentAvatar avatar={activity.agentAvatar} colors={activityColors} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[11px] font-medium ${activityColors.text}`}>{activity.agentName}</span>
              <span className="text-[10px] text-muted-foreground/50">{formatTimestamp(activity.timestamp)}</span>
            </div>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 dark:bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{activity.content}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Agent message with markdown
  if (isMessage) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-start"
      >
        <div className="flex items-start gap-2.5 max-w-[90%] sm:max-w-[80%]">
          <AgentAvatar avatar={activity.agentAvatar} colors={activityColors} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[11px] font-medium ${activityColors.text}`}>{activity.agentName}</span>
              <span className="text-[10px] text-muted-foreground/50">{formatTimestamp(activity.timestamp)}</span>
            </div>
            <MessageBubbleWithCopy content={activity.content} colors={activityColors} />
          </div>
        </div>
      </motion.div>
    );
  }

  // Status change (minimal)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex justify-center py-1"
    >
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
        <Bot className="size-3" />
        <span>{activity.agentName}</span>
        <span>{activity.status === 'done' ? '完成任务' : activity.status === 'working' ? '开始工作' : '状态变更'}</span>
        <span>·</span>
        <span>{formatTimestamp(activity.timestamp)}</span>
      </div>
    </motion.div>
  );
});

// ============================================================================
// Sub-Component: Message Bubble with Copy Button
// ============================================================================

const MessageBubbleWithCopy = memo(function MessageBubbleWithCopy({
  content,
  colors,
}: {
  content: string;
  colors: ReturnType<typeof getAgentColorClasses>;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [content]);

  return (
    <div className="group/msg relative">
      <button
        onClick={handleCopy}
        className="absolute -top-2 right-1 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] text-muted-foreground/0 group-hover/msg:text-muted-foreground/70 hover:!text-foreground hover:bg-muted/80 transition-all"
        title={copied ? '已复制' : '复制'}
      >
        {copied ? (
          <>
            <Check className="size-3 text-emerald-500" />
            <span className="text-emerald-500">已复制</span>
          </>
        ) : (
          <>
            <Copy className="size-3" />
            <span>复制</span>
          </>
        )}
      </button>
      <div className={`rounded-2xl rounded-tl-md ${colors.lightBg} border border-border/50 px-4 py-3 text-sm leading-relaxed`}>
        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-blockquote:my-2 prose-hr:my-3 prose-pre:my-2 prose-img:my-2">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// Sub-Component: Agent Avatar
// ============================================================================

const AgentAvatar = memo(function AgentAvatar({
  avatar,
  colors,
}: {
  avatar: string;
  colors: ReturnType<typeof getAgentColorClasses>;
}) {
  return (
    <Avatar className="h-7 w-7 shrink-0 mt-0.5">
      <AvatarFallback className={`text-xs ${colors.lightBg} ${colors.text} font-medium`}>
        {avatar}
      </AvatarFallback>
    </Avatar>
  );
});

// ============================================================================
// Sub-Component: Thinking Bubble
// ============================================================================

const ThinkingBubble = memo(function ThinkingBubble({
  content,
  colors,
}: {
  content: string;
  colors: ReturnType<typeof getAgentColorClasses>;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl ${colors.lightBg} border border-border/30 px-3.5 py-2.5`}>
      {/* Animated gradient shimmer using framer-motion */}
      <motion.div
        className={`absolute inset-0 ${colors.bg} opacity-[0.06]`}
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      <div className="relative flex items-center gap-2.5">
        <div className="flex items-center gap-1">
          <div className={`size-1.5 rounded-full ${colors.bg} animate-pulse [animation-delay:0ms]`} />
          <div className={`size-1.5 rounded-full ${colors.bg} animate-pulse [animation-delay:200ms]`} />
          <div className={`size-1.5 rounded-full ${colors.bg} animate-pulse [animation-delay:400ms]`} />
        </div>
        <span className={`text-xs ${colors.text} font-medium`}>{content}</span>
        <Brain className={`size-3.5 ${colors.text} opacity-50`} />
      </div>
    </div>
  );
});

// ============================================================================
// Sub-Component: Skill Invocation Card
// ============================================================================

const SkillInvocationCard = memo(function SkillInvocationCard({
  activity,
  colors,
  isComplete,
}: {
  activity: AgentActivityData;
  colors: ReturnType<typeof getAgentColorClasses>;
  isComplete: boolean;
}) {
  return (
    <div className={`rounded-xl border ${isComplete ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20' : `${colors.lightBg} border-border/50`} overflow-hidden`}>
      {/* Left accent border */}
      <div className={`h-full absolute left-0 top-0 w-0.5 ${isComplete ? 'bg-emerald-500' : colors.border}`} />

      <div className="px-3.5 py-2.5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm shrink-0">{activity.agentAvatar}</span>
            <span className={`text-[11px] font-medium ${isComplete ? 'text-emerald-600 dark:text-emerald-400' : colors.text} truncate`}>
              {activity.agentName}
            </span>
            <span className="text-[10px] text-muted-foreground/50 shrink-0">正在调用技能</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isComplete ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0">
                <CheckCircle2 className="size-2.5 mr-0.5" />
                完成
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-0">
                <Loader2 className="size-2.5 mr-0.5 animate-spin" />
                执行中
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground/40">{formatTimestamp(activity.timestamp)}</span>
          </div>
        </div>

        {/* Skill name */}
        <div className="flex items-center gap-2 mb-1">
          <Wrench className={`size-3.5 ${isComplete ? 'text-emerald-500' : colors.text} shrink-0`} />
          <span className={`text-sm font-medium ${isComplete ? 'text-foreground' : colors.text}`}>
            {activity.skillName}
          </span>
        </div>

        {/* Skill description */}
        {activity.skillDescription && (
          <p className="text-xs text-muted-foreground leading-relaxed pl-5.5 mb-2">
            &ldquo;{activity.skillDescription}&rdquo;
          </p>
        )}

        {/* Progress bar (only when executing) - uses CSS animation */}
        {!isComplete && (
          <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${colors.bg}`}
              initial={{ width: '0%' }}
              animate={{ width: '85%' }}
              transition={{ duration: 3, ease: 'linear' }}
            />
          </div>
        )}
      </div>
    </div>
  );
});

// ============================================================================
// Sub-Component: Skill Card
// ============================================================================

const SkillCard = memo(function SkillCard({
  skill,
  agentColors,
  onClick,
}: {
  skill: SkillDefinition;
  agentColors: ReturnType<typeof getAgentColorClasses>;
  onClick: () => void;
}) {
  const SkillIcon = skillIconMap[skill.icon] || Wrench;

  return (
    <button
      onClick={onClick}
      className={`flex items-start gap-3 p-3 rounded-xl border border-border/50 ${agentColors.lightBg} hover:shadow-sm transition-all text-left group cursor-pointer hover:border-border`}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${agentColors.lightBg} border border-border/50 group-hover:border-current transition-colors`}>
        <SkillIcon className={`size-4 ${agentColors.text}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground truncate">{skill.name}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
          {skill.description}
        </p>
      </div>
      <Play className="size-3 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 mt-1 transition-colors" />
    </button>
  );
});


