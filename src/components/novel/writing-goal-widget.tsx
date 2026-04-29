'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { Target } from 'lucide-react';

export function WritingGoalWidget() {
  const dailyGoal = useAppStore((s) => s.dailyGoal);
  const setDailyGoal = useAppStore((s) => s.setDailyGoal);
  const currentNovel = useAppStore((s) => s.currentNovel);
  const [todayWords, setTodayWords] = useState(0);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(dailyGoal.toString());

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const log = JSON.parse(localStorage.getItem(`writing-log-${today}`) || '{"words":0}');
      setTodayWords(log.words || 0);
    } catch {
      // ignore
    }
  }, [currentNovel]);

  // Listen for custom event when words are written
  useEffect(() => {
    const handler = () => {
      const today = new Date().toISOString().split('T')[0];
      try {
        const log = JSON.parse(localStorage.getItem(`writing-log-${today}`) || '{"words":0}');
        setTodayWords(log.words || 0);
      } catch {
        // ignore
      }
    };
    window.addEventListener('writing-log-updated', handler);
    return () => window.removeEventListener('writing-log-updated', handler);
  }, []);

  const progress = Math.min(todayWords / dailyGoal, 1);
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference * (1 - progress);
  const color = progress >= 1 ? '#10b981' : progress >= 0.5 ? '#f59e0b' : '#f97316';

  const commitGoal = () => {
    setEditing(false);
    const v = parseInt(inputValue);
    if (v > 0) setDailyGoal(v);
  };

  return (
    <div className="flex flex-col items-center gap-1 p-2">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/10" />
          <circle cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-500" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {editing ? (
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={commitGoal}
              onKeyDown={(e) => { if (e.key === 'Enter') commitGoal(); if (e.key === 'Escape') { setEditing(false); setInputValue(dailyGoal.toString()); } }}
              className="w-12 text-center text-xs bg-transparent border-b border-amber-500 outline-none"
              autoFocus
            />
          ) : (
            <button
              onClick={() => { setEditing(true); setInputValue(dailyGoal.toString()); }}
              className="text-center group"
            >
              <span className="text-sm font-bold" style={{ color }}>{todayWords.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground block">/ {dailyGoal.toLocaleString()}</span>
            </button>
          )}
        </div>
      </div>
      {progress >= 1 && (
        <p className="text-[10px] text-emerald-500 font-medium">今日目标达成!</p>
      )}
      <button
        onClick={() => { setEditing(true); setInputValue(dailyGoal.toString()); }}
        className="text-[10px] text-muted-foreground/60 hover:text-amber-500 flex items-center gap-0.5 transition-colors cursor-pointer"
      >
        <Target className="size-3" />
        点击修改目标
      </button>
    </div>
  );
}
