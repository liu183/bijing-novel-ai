import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentRole } from '@/lib/agents';
import { DEFAULT_MODEL_ID } from '@/lib/ai/models';

export type ViewMode = 'dashboard' | 'workspace' | 'reader' | 'console';

export interface AgentActivityData {
  id: string;
  type: 'thinking' | 'skill_start' | 'skill_complete' | 'message' | 'error' | 'status_change' | 'user_message';
  agentId: string;
  agentName: string;
  agentAvatar: string;
  content: string;
  skillName?: string;
  skillDescription?: string;
  status?: string;
  timestamp: number;
}

interface StepData {
  id?: string;
  stepNumber: number;
  title: string;
  content: string;
  status: 'pending' | 'generating' | 'completed' | 'locked';
}

interface ChapterData {
  id?: string;
  number: number;
  title: string;
  content: string;
  wordCount: number;
  status: 'draft' | 'writing' | 'completed';
}

interface MessageData {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  stepRef?: number;
  createdAt?: string;
}

interface NovelData {
  id: string;
  title: string;
  genre: string;
  subgenre: string;
  style: string;
  targetWords: number;
  description: string;
  status: string;
  currentStep: number;
  createdAt: string;
  updatedAt: string;
  steps?: StepData[];
  chapters?: ChapterData[];
  messages?: MessageData[];
  _count?: { steps: number; chapters: number };
}

interface AppState {
  // View
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Novels list
  novels: NovelData[];
  setNovels: (novels: NovelData[]) => void;

  // Current novel
  currentNovel: NovelData | null;
  setCurrentNovel: (novel: NovelData | null) => void;

  // Current step
  currentStep: number;
  setCurrentStep: (step: number) => void;

  // UI states
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  isChatLoading: boolean;
  setIsChatLoading: (loading: boolean) => void;
  isChapterGenerating: boolean;
  setIsChapterGenerating: (generating: boolean) => void;

  // Chat messages (local)
  chatMessages: MessageData[];
  setChatMessages: (messages: MessageData[]) => void;
  addChatMessage: (message: MessageData) => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Create novel dialog
  createDialogOpen: boolean;
  setCreateDialogOpen: (open: boolean) => void;

  // Step generation dialog
  generateDialogOpen: boolean;
  setGenerateDialogOpen: (open: boolean) => void;
  generateStepNumber: number;
  setGenerateStepNumber: (step: number) => void;

  // Chapter generation
  generateChapterNumber: number;
  setGenerateChapterNumber: (num: number) => void;

  // Agent system
  activeAgent: AgentRole | null;
  setActiveAgent: (agent: AgentRole | null) => void;
  agentActivities: AgentActivityData[];
  addAgentActivity: (activity: AgentActivityData) => void;
  setAgentActivities: (activities: AgentActivityData[]) => void;
  clearAgentActivities: () => void;
  agentStatus: Record<string, 'idle' | 'thinking' | 'working' | 'done'>;
  setAgentStatus: (agentId: string, status: 'idle' | 'thinking' | 'working' | 'done') => void;

  // Settings
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  selectedModel: string | null;
  setSelectedModel: (modelId: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // View
      viewMode: 'dashboard',
      setViewMode: (mode) => set({ viewMode: mode }),

      // Novels list
      novels: [],
      setNovels: (novels) => set({ novels }),

      // Current novel
      currentNovel: null,
      setCurrentNovel: (novel) => set({ currentNovel: novel }),

      // Current step
      currentStep: 1,
      setCurrentStep: (step) => set({ currentStep: step }),

      // UI states
      isGenerating: false,
      setIsGenerating: (generating) => set({ isGenerating: generating }),
      isChatLoading: false,
      setIsChatLoading: (loading) => set({ isChatLoading: loading }),
      isChapterGenerating: false,
      setIsChapterGenerating: (generating) => set({ isChapterGenerating: generating }),

      // Chat messages
      chatMessages: [],
      setChatMessages: (messages) => set({ chatMessages: messages }),
      addChatMessage: (message) =>
        set((state) => ({ chatMessages: [...state.chatMessages, message] })),

      // Sidebar
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Create novel dialog
      createDialogOpen: false,
      setCreateDialogOpen: (open) => set({ createDialogOpen: open }),

      // Step generation dialog
      generateDialogOpen: false,
      setGenerateDialogOpen: (open) => set({ generateDialogOpen: open }),
      generateStepNumber: 1,
      setGenerateStepNumber: (step) => set({ generateStepNumber: step }),

      // Chapter generation
      generateChapterNumber: 1,
      setGenerateChapterNumber: (num) => set({ generateChapterNumber: num }),

      // Agent system
      activeAgent: 'director' as AgentRole,
      setActiveAgent: (agent) => set({ activeAgent: agent }),
      agentActivities: [],
      addAgentActivity: (activity) =>
        set((state) => ({ agentActivities: [...state.agentActivities, activity] })),
      setAgentActivities: (activities) => set({ agentActivities: activities }),
      clearAgentActivities: () => set({ agentActivities: [] }),
      agentStatus: {},
      setAgentStatus: (agentId, status) =>
        set((state) => ({
          agentStatus: { ...state.agentStatus, [agentId]: status },
        })),

      // Settings
      settingsOpen: false,
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      selectedModel: DEFAULT_MODEL_ID,
      setSelectedModel: (modelId) => set({ selectedModel: modelId }),
    }),
    {
      name: 'bijing-novel-ai-settings',
      partialize: (state) => ({
        selectedModel: state.selectedModel,
      }),
    }
  )
);
