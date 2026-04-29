import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// Shared formatting utilities used across components

/** Format a date string to 'yyyy-MM-dd' */
export function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'yyyy-MM-dd', { locale: zhCN });
  } catch {
    return dateStr;
  }
}

/** Format a date string to 'yyyy-MM-dd HH:mm' */
export function formatDateTime(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'yyyy-MM-dd HH:mm', { locale: zhCN });
  } catch {
    return dateStr;
  }
}

/** Format a date string as relative time (e.g. "3天前") */
export function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: zhCN });
  } catch {
    return formatDate(dateStr);
  }
}

/** Format a timestamp (ms) as relative time, with short-circuit for recent times */
export function formatTimestamp(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: zhCN });
}

/** Format a word count for display (e.g. "1.5万字", "3,200字") */
export function formatWordCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万字`;
  }
  return `${count.toLocaleString()}字`;
}

/** Format seconds into a human-readable timer (e.g. "1:23", "45s") */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

/** Validate a novel creation/edit form. Returns errors map and whether form is valid. */
export function validateNovelForm(form: {
  title: string;
  targetWords: string;
}): { errors: Record<string, string>; valid: boolean } {
  const errors: Record<string, string> = {};

  if (!form.title.trim()) {
    errors.title = '请输入小说标题';
  } else if (form.title.trim().length > 50) {
    errors.title = '标题不能超过50个字符';
  }

  const words = parseInt(form.targetWords);
  if (isNaN(words) || words < 1000) {
    errors.targetWords = '目标字数至少1000';
  } else if (words > 5000000) {
    errors.targetWords = '目标字数不能超过500万';
  }

  return { errors, valid: Object.keys(errors).length === 0 };
}
