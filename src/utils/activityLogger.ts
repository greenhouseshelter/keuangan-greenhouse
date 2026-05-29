import { ActivityLog } from '../types';
import { addActivityLogToSheets, getActivityLogsFromSheets, clearActivityLogsOnSheets } from './db';

export function getActivityLogs(): ActivityLog[] {
  try {
    const raw = localStorage.getItem('greenhouse_activity_logs');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Gagal membaca log aktivitas lokal:", e);
  }
  return [];
}

/**
 * Sync local activity logs with Google Sheets, merging remote logs with local
 */
export async function syncActivityLogsWithSheets(): Promise<ActivityLog[]> {
  const localLogs = getActivityLogs();
  try {
    const sheetsLogs = await getActivityLogsFromSheets();
    if (sheetsLogs && sheetsLogs.length > 0) {
      // Merge unique entries by ID
      const mergedMap = new Map<string, ActivityLog>();
      
      // Load sheets logs
      sheetsLogs.forEach(log => {
        if (log && log.id) mergedMap.set(log.id, log);
      });
      
      // Load/overwrite with local logs
      localLogs.forEach(log => {
        if (log && log.id) mergedMap.set(log.id, log);
      });

      // Sort by timestamp descending
      const merged = Array.from(mergedMap.values()).sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }).slice(0, 1000);

      localStorage.setItem('greenhouse_activity_logs', JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn("Gagal melakukan pencocokan & unduh log dari Sheets:", err);
  }
  return localLogs;
}

export function addActivityLog(action: string, details: string): ActivityLog[] {
  const logs = getActivityLogs();
  
  // Resolve current active user from localStorage
  let username = 'Sistem';
  let role = 'System';
  try {
    const rawUser = localStorage.getItem('greenhouse_active_user');
    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (user && user.username) {
        username = user.username;
        role = user.role || 'User';
      }
    }
  } catch (e) {}

  const newLog: ActivityLog = {
    id: `log-${Math.floor(Date.now() + Math.random() * 100000)}`,
    timestamp: new Date().toISOString(),
    username,
    role,
    action,
    details
  };

  const updated = [newLog, ...logs].slice(0, 1000); // cap to 1000 logs for memory performance
  try {
    localStorage.setItem('greenhouse_activity_logs', JSON.stringify(updated));
  } catch (e) {
    console.error("Gagal menyimpan log aktivitas ke penyimpanan lokal:", e);
  }

  // Push to Sheets asynchronously in the background
  addActivityLogToSheets(newLog).catch(err => {
    console.warn("Gagal mengunggah log ke Google Sheets (Tindakan Background):", err);
  });

  return updated;
}

export function clearActivityLogs(): void {
  try {
    localStorage.removeItem('greenhouse_activity_logs');
  } catch (e) {}
  
  // Clear on Sheets asynchronously in the background
  clearActivityLogsOnSheets().catch(err => {
    console.warn("Gagal membersihkan database log di Google Sheets:", err);
  });
}
