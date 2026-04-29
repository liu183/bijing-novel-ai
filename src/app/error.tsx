'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30 mx-auto">
          <AlertTriangle className="size-10 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">页面出现了问题</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            抱歉，页面遇到了一个意外错误。您可以尝试重新加载页面，或返回首页。
          </p>
        </div>
        {error.message && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200/50 dark:border-red-800/30 p-3 text-left">
            <p className="text-xs text-red-600 dark:text-red-400 font-mono break-all">{error.message}</p>
          </div>
        )}
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={reset} className="gap-2">
            <RotateCcw className="size-4" />
            重新加载
          </Button>
          <Button onClick={() => window.location.href = '/'} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700">
            <Home className="size-4" />
            返回首页
          </Button>
        </div>
      </div>
    </div>
  );
}
