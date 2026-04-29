'use client';

import { useEffect, useCallback } from 'react';
import { useAppStore, type NovelData } from '@/store/app-store';

/**
 * Shared hook to fetch novel data and sync it to the Zustand store.
 * Used by workspace.tsx, reader.tsx, and generate-step-dialog.tsx.
 */
export function useNovel(novelId: string | null | undefined) {
  const setCurrentNovel = useAppStore((s) => s.setCurrentNovel);
  const setChatMessages = useAppStore((s) => s.setChatMessages);

  const fetchNovel = useCallback(async () => {
    if (!novelId) return;
    try {
      const res = await fetch(`/api/novels/${novelId}`);
      if (res.ok) {
        const data: NovelData = await res.json();
        setCurrentNovel(data);
        // Initialize chat messages from the server response
        if (data.messages && data.messages.length > 0) {
          setChatMessages(
            data.messages.map((m) => ({
              id: m.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content,
              stepRef: m.stepRef,
              createdAt: m.createdAt,
            }))
          );
        }
      }
    } catch (error) {
      console.error('Failed to fetch novel data:', error);
    }
  }, [novelId, setCurrentNovel, setChatMessages]);

  useEffect(() => {
    fetchNovel();
  }, [fetchNovel]);

  return { refetch: fetchNovel };
}
