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

export default function HomePage() {
  const viewMode = useAppStore((s) => s.viewMode);
  const currentNovel = useAppStore((s) => s.currentNovel);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {viewMode === 'dashboard' && <DashboardView />}
        {viewMode === 'workspace' && <WorkspaceView />}
        {viewMode === 'reader' && <ReaderView />}
        {viewMode === 'console' && currentNovel && (
          <div className="h-[calc(100vh-3.5rem)]">
            <AgentConsole novelId={currentNovel.id} />
          </div>
        )}
        {viewMode === 'console' && !currentNovel && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">请先创建或选择一个小说项目以使用智能体控制台</p>
          </div>
        )}
      </main>
      <CreateNovelDialog />
      <GenerateStepDialog />
    </div>
  );
}
