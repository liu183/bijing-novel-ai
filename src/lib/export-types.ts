/** Shared type definitions for novel export utilities */

export interface NovelExportData {
  steps: { stepNumber: number; title: string; content: string }[];
  chapters: { number: number; title: string; content: string }[];
}
