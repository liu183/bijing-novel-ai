'use client';

import React from 'react';
import { useAppStore } from '@/store/app-store';
import { DashboardView } from '@/components/novel/dashboard';
import { WorkspaceView } from '@/components/novel/workspace';
import { ReaderView } from '@/components/novel/reader';
import { Header } from '@/components/novel/header';
import { CreateNovelDialog } from '@/components/novel/create-novel-dialog';
import { GenerateStepDialog } from '@/components/novel/generate-step-dialog';

export default function HomePage() {
  const viewMode = useAppStore((s) => s.viewMode);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {viewMode === 'dashboard' && <DashboardView />}
        {viewMode === 'workspace' && <WorkspaceView />}
        {viewMode === 'reader' && <ReaderView />}
      </main>
      <CreateNovelDialog />
      <GenerateStepDialog />
    </div>
  );
}
