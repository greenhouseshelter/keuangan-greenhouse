import { ActivityLog } from '../types';
import { addActivityLogToSheets, getActivityLogsFromSheets, clearActivityLogsOnSheets } from './db';

// Cache logs in memory during current session to provide fast UI interaction
let inMemoryLogsCache: ActivityLog[] = [];

export async function getActivityLogs(): Promise<ActivityLog[]> {
  try {
    const sheetsLogs = await getActivityLogsFromSheets();
    if (sheetsLogs && sheetsLogs.length > 0) {
      // Sort by timestamp descending
      const sorted = [...sheetsLogs].sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }).slice(0, 1000);
      inMemoryLogsCache = sorted;
      return sorted;
    }
  } catch (err) {
    console.warn("Gagal mengambil log dari cloud Sheets:", err);
  }
  return inMemoryLogsCache;
}

/**
 * Sync local activity logs with Google Sheets (compatibility helper)
 */
export async function syncActivityLogsWithSheets(): Promise<ActivityLog[]> {
  return getActivityLogs();
}

export function addActivityLog(action: string, details: string): void {
  // Resolve current active user from active login session (localStorage remains ONLY for auth token/session validation)
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

  // Add to in-memory cache to make it responsive
  inMemoryLogsCache = [newLog, ...inMemoryLogsCache].slice(0, 1000);

  // Push straight to cloud (Sheets)
  addActivityLogToSheets(newLog).catch(err => {
    console.warn("Gagal mengunggah log ke Google Sheets (Tindakan Background):", err);
  });
}

export function clearActivityLogs(): void {
  inMemoryLogsCache = [];
  
  // Clear on Sheets asynchronously in the background
  clearActivityLogsOnSheets().catch(err => {
    console.warn("Gagal membersihkan database log di Google Sheets:", err);
  });
}
