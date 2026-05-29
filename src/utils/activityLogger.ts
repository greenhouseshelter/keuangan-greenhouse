export interface ActivityLog {
  id: string;
  timestamp: string; // ISO Date-time
  username: string;
  role: string;
  action: string;
  details: string;
}

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
    console.warn("Gagal membaca log aktivitas:", e);
  }
  return [];
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
    id: `log-${Math.floor(Date.now() + Math.random() * 1000)}`,
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
    console.error("Gagal menyimpan log aktivitas:", e);
  }
  return updated;
}

export function clearActivityLogs(): void {
  try {
    localStorage.removeItem('greenhouse_activity_logs');
  } catch (e) {}
}
