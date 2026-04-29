'use client';

import React from 'react';
import { useAppStore } from '@/store/app-store';
import { DashboardView } from '@/components/novel/dashboard';
import { WorkspaceView } from '@/components/novel/workspace';
import { ReaderView } from '@/components/novel/reader';
import { Header } from '@/components/novel/header';
import { AgentConsole } from '@/components/novel/agent-console';
import { CreateNovelDialog } from '@/components/novel/create-novel-dialog';
import { GenerateStepDialog } from '@/components/novel/generate-step-dialog';
import { ModelSettingsDialog } from '@/components/novel/model-settings-dialog';
import { CommandPalette } from '@/components/novel/command-palette';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from '@/components/error-boundary';

export default function HomePage() {
  const viewMode = useAppStore((s) => s.viewMode);
  const currentNovel = useAppStore((s) => s.currentNovel);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <ErrorBoundary>
        <AnimatePresence mode="wait">
          {viewMode === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="view-transition">
              <DashboardView />
            </motion.div>
          )}
          {viewMode === 'workspace' && (
            <motion.div key="workspace" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="view-transition">
              <WorkspaceView />
            </motion.div>
          )}
          {viewMode === 'reader' && (
            <motion.div key="reader" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="view-transition">
              <ReaderView />
            </motion.div>
          )}
          {viewMode === 'console' && currentNovel && (
            <motion.div key="console" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="view-transition">
              <div className="h-[calc(100vh-3.5rem)]">
                <AgentConsole novelId={currentNovel.id} />
              </div>
            </motion.div>
          )}
          {viewMode === 'console' && !currentNovel && (
            <motion.div key="console-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="view-transition">
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">请先创建或选择一个小说项目以使用智能体控制台</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </ErrorBoundary>
      </main>
      <CreateNovelDialog />
      <GenerateStepDialog />
      <ModelSettingsDialog />
      <CommandPalette />
    </div>
  );
}
