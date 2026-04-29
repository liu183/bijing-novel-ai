'use client';

import React, { Suspense } from 'react';
import { useAppStore } from '@/store/app-store';
import { Header } from '@/components/novel/header';
import { CommandPalette } from '@/components/novel/command-palette';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from '@/components/error-boundary';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Lazy-loaded view components (code splitting) ───
const WorkspaceView = React.lazy(() => import('@/components/novel/workspace').then(m => ({ default: m.WorkspaceView })));
const ReaderView = React.lazy(() => import('@/components/novel/reader').then(m => ({ default: m.ReaderView })));
const AgentConsole = React.lazy(() => import('@/components/novel/agent-console').then(m => ({ default: m.AgentConsole })));
const DashboardView = React.lazy(() => import('@/components/novel/dashboard').then(m => ({ default: m.DashboardView })));

// ─── Lazy-loaded dialog components ───
const CreateNovelDialog = React.lazy(() => import('@/components/novel/create-novel-dialog').then(m => ({ default: m.CreateNovelDialog })));
const GenerateStepDialog = React.lazy(() => import('@/components/novel/generate-step-dialog').then(m => ({ default: m.GenerateStepDialog })));
const ModelSettingsDialog = React.lazy(() => import('@/components/novel/model-settings-dialog').then(m => ({ default: m.ModelSettingsDialog })));
const SettingsDialog = React.lazy(() => import('@/components/novel/settings-dialog').then(m => ({ default: m.SettingsDialog })));

// ─── View Skeleton Components ───
function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Hero skeleton */}
      <div className="text-center space-y-3 py-8">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-72 mx-auto" />
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl border p-4 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar skeleton */}
      <div className="w-64 border-r p-4 space-y-4 hidden md:block">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-1.5 w-full rounded-full" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
      </div>
      {/* Content skeleton */}
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      {/* Chat skeleton */}
      <div className="w-72 border-l p-4 space-y-4 hidden md:block">
        <Skeleton className="h-5 w-20" />
        <div className="space-y-3 pt-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function ReaderSkeleton() {
  return (
    <div className="flex flex-col flex-1">
      {/* Top bar skeleton */}
      <div className="h-14 border-b flex items-center justify-between px-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-24" />
      </div>
      {/* Preferences bar skeleton */}
      <div className="h-10 border-b flex items-center justify-center">
        <Skeleton className="h-6 w-20" />
      </div>
      {/* Content skeleton */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-8 space-y-4">
        <Skeleton className="h-6 w-48 mx-auto mb-6" />
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <Skeleton key={i} className="h-5 w-full indent-8" />
        ))}
      </div>
    </div>
  );
}

function ConsoleSkeleton() {
  return (
    <div className="h-[calc(100vh-3.5rem)] p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function ViewSkeleton({ view }: { view: string }) {
  switch (view) {
    case 'dashboard': return <DashboardSkeleton />;
    case 'workspace': return <WorkspaceSkeleton />;
    case 'reader': return <ReaderSkeleton />;
    case 'console': return <ConsoleSkeleton />;
    default: return <DashboardSkeleton />;
  }
}

// ─── Dialog loading fallback ───
function DialogSuspenseFallback({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

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
              <Suspense fallback={<ViewSkeleton view="dashboard" />}>
                <DashboardView />
              </Suspense>
            </motion.div>
          )}
          {viewMode === 'workspace' && (
            <motion.div key="workspace" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="view-transition">
              <Suspense fallback={<ViewSkeleton view="workspace" />}>
                <WorkspaceView />
              </Suspense>
            </motion.div>
          )}
          {viewMode === 'reader' && (
            <motion.div key="reader" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="view-transition">
              <Suspense fallback={<ViewSkeleton view="reader" />}>
                <ReaderView />
              </Suspense>
            </motion.div>
          )}
          {viewMode === 'console' && currentNovel && (
            <motion.div key="console" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="view-transition">
              <div className="h-[calc(100vh-3.5rem)]">
                <Suspense fallback={<ViewSkeleton view="console" />}>
                  <AgentConsole novelId={currentNovel.id} />
                </Suspense>
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
      <DialogSuspenseFallback>
        <CreateNovelDialog />
      </DialogSuspenseFallback>
      <DialogSuspenseFallback>
        <GenerateStepDialog />
      </DialogSuspenseFallback>
      <DialogSuspenseFallback>
        <ModelSettingsDialog />
      </DialogSuspenseFallback>
      <DialogSuspenseFallback>
        <SettingsDialog />
      </DialogSuspenseFallback>
      <CommandPalette />
    </div>
  );
}
