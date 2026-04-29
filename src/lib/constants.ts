export const GENRES = ['都市脑洞', '玄幻奇幻', '玄幻脑洞', '仙侠武侠', '科幻末世', '科幻', '末世', '古代言情', '现代言情', '言情', '悬疑推理', '悬疑脑洞', '历史军事', '游戏竞技', '灵异恐怖', '校园青春', '年代重生', '其他'] as const;

export const STYLES = ['爽文', '虐文', '甜宠', '搞笑', '正剧', '严肃', '文艺', '温馨', '黑暗', '其他'] as const;

export const TOTAL_STEPS = 12;

/** Deterministic avatar color based on title string hash */
const AVATAR_COLORS = [
  'bg-amber-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-orange-500',
  'bg-cyan-500',
  'bg-pink-500',
];

const AVATAR_COLORS_DARK = [
  'bg-amber-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-teal-600',
  'bg-indigo-600',
  'bg-orange-600',
  'bg-cyan-600',
  'bg-pink-600',
];

export function getAvatarColor(title: string): string {
  if (!title) return AVATAR_COLORS[0];
  // Simple hash: sum of char codes
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getAvatarInitial(title: string): string {
  if (!title) return '?';
  return title.charAt(0);
}

export const genreColors: Record<string, string> = {
  '都市脑洞': 'from-blue-500 to-cyan-500',
  '修仙玄幻': 'from-purple-500 to-violet-500',
  '穿越重生': 'from-amber-500 to-orange-500',
  '悬疑推理': 'from-rose-500 to-pink-500',
  '末日生存': 'from-zinc-500 to-stone-500',
  '年代文': 'from-emerald-500 to-teal-500',
  '甜宠言情': 'from-pink-500 to-rose-500',
  '仙侠武侠': 'from-indigo-500 to-blue-500',
  '科幻未来': 'from-cyan-500 to-blue-500',
  '历史军事': 'from-red-500 to-amber-500',
  // Existing genres in the codebase
  '玄幻脑洞': 'from-purple-500 to-violet-500',
  '悬疑脑洞': 'from-rose-500 to-pink-500',
  '科幻': 'from-cyan-500 to-blue-500',
  '末世': 'from-zinc-500 to-stone-500',
  '年代重生': 'from-emerald-500 to-teal-500',
  '言情': 'from-pink-500 to-rose-500',
  '其他': 'from-zinc-500 to-stone-500',
  '未分类': 'from-zinc-500 to-stone-500',
  '玄幻奇幻': 'from-purple-500 to-violet-500',
  '科幻末世': 'from-cyan-500 to-blue-500',
  '古代言情': 'from-pink-500 to-rose-500',
  '现代言情': 'from-pink-500 to-rose-500',
  '游戏竞技': 'from-green-500 to-emerald-500',
  '灵异恐怖': 'from-gray-700 to-gray-900',
  '校园青春': 'from-sky-400 to-blue-400',
};

/** Hex color map for chart rendering (Recharts Cell fill) */
export const genreChartColors: Record<string, string> = {
  '都市脑洞': '#f97316',
  '修仙玄幻': '#8b5cf6',
  '穿越重生': '#f59e0b',
  '悬疑推理': '#f43f5e',
  '末日生存': '#71717a',
  '年代文': '#10b981',
  '甜宠言情': '#ec4899',
  '仙侠武侠': '#6366f1',
  '科幻未来': '#06b6d4',
  '历史军事': '#ef4444',
  '玄幻脑洞': '#a855f7',
  '悬疑脑洞': '#f43f5e',
  '科幻': '#06b6d4',
  '末世': '#ef4444',
  '年代重生': '#f59e0b',
  '言情': '#ec4899',
  '其他': '#6b7280',
  '未分类': '#6b7280',
  '玄幻奇幻': '#a855f7',
  '科幻末世': '#06b6d4',
  '古代言情': '#ec4899',
  '现代言情': '#f472b6',
  '游戏竞技': '#22c55e',
  '灵异恐怖': '#374151',
  '校园青春': '#38bdf8',
};
