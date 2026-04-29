'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { Target } from 'lucide-react';

export function WritingGoalWidget() {
  const dailyGoal = useAppStore((s) => s.dailyGoal);
  const setDailyGoal = useAppStore((s) => s.setDailyGoal);
  const currentNovel = useAppStore((s) => s.currentNovel);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(dailyGoal.toString());

  const today = new Date().toDateString();

  // Compute today's words from actual chapter data
  const todayWords = useMemo(() => {
    if (!currentNovel?.chapters) return 0;
    return currentNovel.chapters
      .filter(ch => {
        const chapterDate = new Date(Math.max(ch.createdAt, ch.updatedAt || ch.createdAt)).toDateString();
        return chapterDate === today;
      })
      .reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
  }, [currentNovel?.chapters, today]);

  // Compute weekly progress for chart (last 7 days)
  const weeklyData = useMemo(() => {
    if (!currentNovel?.chapters) return [];
    const days: { label: string; words: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      const dayLabel = i === 0 ? '今天' : i === 1 ? '昨天' : `${date.getMonth() + 1}/${date.getDate()}`;
      const dayWords = currentNovel.chapters
        .filter(ch => new Date(ch.createdAt).toDateString() === dateStr)
        .reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
      days.push({ label: dayLabel, words: dayWords });
    }
    return days;
  }, [currentNovel?.chapters]);

  const maxWeekly = Math.max(...weeklyData.map(d => d.words), dailyGoal, 1);

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
              <span className="text-sm font-bold number-glow" style={{ color }}>{todayWords.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground block">/ {dailyGoal.toLocaleString()}</span>
            </button>
          )}
        </div>
      </div>
      {progress >= 1 && (
        <p className="text-[10px] text-emerald-500 font-medium">今日目标达成!</p>
      )}
      {/* Mini weekly chart */}
      {weeklyData.length > 0 && (
        <div className="flex items-end gap-[2px] h-5 mt-1">
          {weeklyData.map((day, i) => (
            <div
              key={i}
              className="w-[6px] rounded-sm transition-all duration-300"
              style={{
                height: `${Math.max(day.words / maxWeekly * 100, 4)}%`,
                backgroundColor: i === weeklyData.length - 1 ? color : 'rgba(245, 158, 11, 0.25)',
              }}
              title={`${day.label}: ${day.words}字`}
            />
          ))}
        </div>
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
