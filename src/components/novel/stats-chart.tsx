'use client';

import React from 'react';
import type { NovelData } from '@/store/app-store';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

const genreColors: Record<string, string> = {
  '都市脑洞': '#f97316',
  '玄幻脑洞': '#a855f7',
  '悬疑脑洞': '#f43f5e',
  '科幻': '#06b6d4',
  '末世': '#ef4444',
  '年代重生': '#f59e0b',
  '言情': '#ec4899',
  '其他': '#6b7280',
  '未分类': '#6b7280',
};

// Define CustomTooltip outside of the component to avoid "Cannot create components during render"
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}：{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

interface StatsChartProps {
  novels: NovelData[];
}

export function StatsChart({ novels }: StatsChartProps) {
  const [isOpen, setIsOpen] = React.useState(true);

  if (!novels || novels.length === 0) return null;

  // Chart 1: Steps Progress Data (horizontal bar)
  const stepsProgressData = novels.map((novel) => ({
    name: novel.title.length > 8 ? novel.title.slice(0, 8) + '…' : novel.title,
    fullName: novel.title,
    '进度': novel.currentStep,
    genre: novel.genre,
  }));

  // Chart 2: Word Count Data
  const wordCountData = novels.map((novel) => {
    const actualWords = novel.chapters?.reduce((s, c) => s + (c.wordCount || 0), 0) || 0;
    return {
      name: novel.title.length > 8 ? novel.title.slice(0, 8) + '…' : novel.title,
      fullName: novel.title,
      '目标字数': novel.targetWords,
      '已写字数': actualWords,
    };
  });

  // Check if there's any data to show
  const hasStepsData = stepsProgressData.some((d) => d['进度'] > 0);
  const hasWordData = wordCountData.some((d) => d['已写字数'] > 0);

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full mb-4 group">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="size-5 text-amber-500" />
              创作数据
            </h2>
            <p className="text-sm text-muted-foreground mt-1">可视化查看创作进度与字数统计</p>
          </div>
          {isOpen ? (
            <ChevronUp className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronDown className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Steps Progress */}
            <div className="rounded-xl border border-border/60 bg-card p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" />
                各项目创作进度
              </h3>
              {!hasStepsData ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  暂无创作进度数据
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, stepsProgressData.length * 36 + 40)}>
                  <BarChart data={stepsProgressData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                    <XAxis
                      type="number"
                      domain={[0, 12]}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={80}
                      tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                    />
                    <Bar
                      dataKey="进度"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={20}
                    >
                      {stepsProgressData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={genreColors[entry.genre] || '#f59e0b'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              <p className="text-[10px] text-muted-foreground mt-2 text-right">单位：步（共12步）</p>
            </div>

            {/* Chart 2: Word Count Overview */}
            <div className="rounded-xl border border-border/60 bg-card p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                目标字数概览
              </h3>
              {!hasWordData ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  暂无章节字数数据
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, wordCountData.length * 36 + 40)}>
                  <BarChart data={wordCountData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                      tickFormatter={(value: number) => {
                        if (value >= 10000) return `${(value / 10000).toFixed(0)}万`;
                        return value.toLocaleString();
                      }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={80}
                      tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                      formatter={(value: number) => value.toLocaleString()}
                    />
                    <Bar
                      dataKey="目标字数"
                      fill="#f59e0b"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={16}
                    />
                    <Bar
                      dataKey="已写字数"
                      fill="#10b981"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={16}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="flex items-center justify-end gap-4 mt-2">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="inline-block size-2 rounded-full bg-amber-500" />
                  目标字数
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="inline-block size-2 rounded-full bg-emerald-500" />
                  已写字数
                </span>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
