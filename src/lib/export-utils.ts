export interface ExportHistoryEntry {
  novelId: string;
  novelTitle: string;
  format: string;
  timestamp: number;
}

export function getExportHistory(): ExportHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem('export-history') || '[]');
  } catch {
    return [];
  }
}

export function addExportHistory(novelId: string, novelTitle: string, format: string) {
  try {
    const history = getExportHistory();
    history.unshift({ novelId, novelTitle, format, timestamp: Date.now() });
    localStorage.setItem('export-history', JSON.stringify(history.slice(0, 50)));
  } catch { /* ignore */ }
}
