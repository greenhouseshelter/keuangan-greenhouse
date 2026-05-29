import { Transaction, User, DatabaseConfig, Account, ProjectItem, ActivityLog } from '../types';

export function getDatabaseConfig(): DatabaseConfig {
  let savedConf = null;
  try {
    const raw = localStorage.getItem('greenhouse_db_config');
    if (raw) savedConf = JSON.parse(raw);
  } catch (e) {}

  const webAppUrl = savedConf?.webAppUrl || savedConf?.sheetsApiUrl || "https://script.google.com/macros/s/AKfycby-930U2vtfb-8SMm1ts9qrJfMi5qILo3NCdOLh6X-PDLvTr0WE6TIiKJp3J9XJ_pvn/exec";
  const spreadsheetId = savedConf?.spreadsheetId || "1Bg49SSvPGncwpM9a31ug7c3q12zyMy38ABLplCjMY6E";

  return {
    mode: 'sheets',
    sheetsApiUrl: webAppUrl,
    webAppUrl: webAppUrl,
    spreadsheetId: spreadsheetId
  };
}

export function saveDatabaseConfig(config: DatabaseConfig) {
  try {
    localStorage.setItem('greenhouse_db_config', JSON.stringify(config));
  } catch (e) {}
}

export async function fetchWithTimeout(resource: string, options: any = {}, timeout = 15000) {
  const config = getDatabaseConfig();
  const webAppUrl = config.webAppUrl;
  const spreadsheetId = config.spreadsheetId;
  
  let targetUrl = resource;
  
  // Normalize URL to direct Google Script Web App URL
  if (targetUrl.startsWith('/api/sheets-proxy')) {
    targetUrl = targetUrl.replace('/api/sheets-proxy', webAppUrl);
  } else if (targetUrl.startsWith('//') || !targetUrl.startsWith('http')) {
    // If it's a relative URL, but not sheets proxy, let it go to local origin
    targetUrl = new URL(targetUrl, window.location.origin).toString();
  }

  // If this target is going to the Apps Script Web App URL, inject spreadsheetId
  if (targetUrl.startsWith(webAppUrl) || targetUrl.includes('script.google.com')) {
    try {
      const urlObj = new URL(targetUrl);
      if (spreadsheetId) {
        urlObj.searchParams.set('spreadsheetId', spreadsheetId);
        urlObj.searchParams.set('sheetId', spreadsheetId);
      }
      urlObj.searchParams.set('_t', Date.now().toString());
      targetUrl = urlObj.toString();
    } catch (err) {
      const sep = targetUrl.includes('?') ? '&' : '?';
      targetUrl = `${targetUrl}${sep}spreadsheetId=${spreadsheetId}&sheetId=${spreadsheetId}&_t=${Date.now()}`;
    }
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const fetchOptions: any = {
      method: options.method || 'GET',
      signal: controller.signal,
      headers: {}
    };

    // Keep headers simple and standard for CORS
    if (options.headers) {
      const parsedUrl = targetUrl.startsWith('http') ? new URL(targetUrl) : null;
      const isExternalScript = parsedUrl && (parsedUrl.hostname.includes('google.com') || parsedUrl.hostname.includes('googleusercontent.com'));
      
      for (const [key, val] of Object.entries(options.headers)) {
        const lowerKey = key.toLowerCase();
        if (isExternalScript && (lowerKey.startsWith('x-') || lowerKey === 'authorization')) {
          continue; // skip custom headers to avoid CORS preflight options
        }
        fetchOptions.headers[key] = val;
      }
    }

    if (options.body) {
      let bodyData: any = {};
      try {
        if (typeof options.body === 'string') {
          bodyData = JSON.parse(options.body);
        } else {
          bodyData = { ...options.body };
        }
      } catch (err) {
        bodyData = { raw: options.body };
      }

      // Inject sheetId / spreadsheetId on post bodies going to Google Apps Script
      if (spreadsheetId && (targetUrl.startsWith(webAppUrl) || targetUrl.includes('script.google.com'))) {
        bodyData.spreadsheetId = spreadsheetId;
        bodyData.sheetId = spreadsheetId;
      }
      
      // Specify simple text/plain content-type to avoid CORS preflight trigger, which Apps Script loves
      const isExternal = targetUrl.includes('script.google.com') || targetUrl.includes('googleusercontent.com');
      if (isExternal) {
        fetchOptions.headers['Content-Type'] = 'text/plain;charset=utf-8';
      } else {
        fetchOptions.headers['Content-Type'] = 'application/json';
      }
      
      fetchOptions.body = JSON.stringify(bodyData);
    }

    const response = await fetch(targetUrl, fetchOptions);
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function getTransactions(): Promise<Transaction[]> {
  const config = getDatabaseConfig();
  const url = `${config.sheetsApiUrl}?action=getTransactions`;
  const res = await fetchWithTimeout(url, { method: 'GET' });
  if (!res.ok) throw new Error('Database Offline / Gagal tersambung ke Google Sheets.');
  
  const responseJson = await res.json();
  if (responseJson.status === 'success' && Array.isArray(responseJson.data)) {
    return responseJson.data.map((tx: any) => ({
      ...tx,
      amount: Number(tx.amount) || 0,
    }));
  }
  throw new Error(responseJson.message || 'Format data transaksi tidak valid.');
}

export async function addTransaction(tx: Transaction): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'addTransaction', transaction: tx }),
  });
  if (!res.ok) throw new Error('Gagal menambahkan transaksi ke Google Sheets.');
  return true;
}

export async function updateTransaction(tx: Transaction): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateTransaction', transaction: tx }),
  });
  if (!res.ok) throw new Error('Gagal memperbarui transaksi di Google Sheets.');
  return true;
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'deleteTransaction', id }),
  });
  if (!res.ok) throw new Error('Gagal menghapus transaksi dari Google Sheets.');
  return true;
}

export function getLocalCustomUsers(): User[] {
  try {
    const raw = localStorage.getItem('greenhouse_custom_users');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function saveLocalCustomUsers(users: User[]) {
  try {
    localStorage.setItem('greenhouse_custom_users', JSON.stringify(users));
  } catch (e) {}
}

export function getDeletedUsernames(): string[] {
  try {
    const raw = localStorage.getItem('greenhouse_deleted_usernames');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function saveDeletedUsernames(usernames: string[]) {
  try {
    localStorage.setItem('greenhouse_deleted_usernames', JSON.stringify(usernames));
  } catch (e) {}
}

function getLocalUsersWithDefaults(): User[] {
  const defaults: User[] = [
    { role: 'Admin', username: 'admin', password: 'adminpassword123' },
    { role: 'Pengelola', username: 'pengelola', password: 'pengelolapassword123' },
    { role: 'Finance', username: 'finance', password: 'financepassword123' },
    { role: 'Accounting', username: 'accounting', password: 'accountingpassword123' },
  ];
  
  const custom = getLocalCustomUsers();
  const deleted = getDeletedUsernames();
  
  // Combine defaults and custom
  const merged = [...defaults];
  custom.forEach(lc => {
    const idx = merged.findIndex(m => m.username.toLowerCase() === lc.username.toLowerCase());
    if (idx >= 0) {
      merged[idx] = lc;
    } else {
      merged.push(lc);
    }
  });

  // Filter out any that were deleted
  return merged.filter(u => !deleted.includes(u.username.toLowerCase()));
}

export async function getUsers(): Promise<User[]> {
  const config = getDatabaseConfig();
  const url = `${config.sheetsApiUrl}?action=getUsers`;
  const deleted = getDeletedUsernames();

  try {
    const res = await fetchWithTimeout(url, { method: 'GET' });
    if (res.ok) {
      const responseJson = await res.json();
      if (responseJson.status === 'success' && Array.isArray(responseJson.data)) {
        const fetched: User[] = responseJson.data;
        const localCustom = getLocalCustomUsers();
        
        const merged = [...fetched];
        localCustom.forEach(lc => {
          const idx = merged.findIndex(m => m.username.toLowerCase() === lc.username.toLowerCase());
          if (idx >= 0) {
            merged[idx] = lc;
          } else {
            merged.push(lc);
          }
        });

        // Filter deleted ones
        return merged.filter(u => !deleted.includes(u.username.toLowerCase()));
      }
    }
  } catch (err) {
    console.warn("getUsers from sheets failed, loading local fallback:", err);
  }

  return getLocalUsersWithDefaults();
}

export async function addUser(user: User): Promise<boolean> {
  const config = getDatabaseConfig();
  
  // Try calling Sheets
  try {
    await fetchWithTimeout(config.sheetsApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addUser',
        role: user.role,
        username: user.username,
        password: user.password
      }),
    });
  } catch (err) {
    console.warn("Failed sending addUser to Google Sheets, using local sync:", err);
  }

  // Remove from deleted list if it was deleted previously
  let deleted = getDeletedUsernames();
  if (deleted.includes(user.username.toLowerCase())) {
    deleted = deleted.filter(name => name !== user.username.toLowerCase());
    saveDeletedUsernames(deleted);
  }

  // Save to local custom persistence
  const localCustom = getLocalCustomUsers();
  const idx = localCustom.findIndex(u => u.username.toLowerCase() === user.username.toLowerCase());
  if (idx >= 0) {
    localCustom[idx] = user;
  } else {
    localCustom.push(user);
  }
  saveLocalCustomUsers(localCustom);
  return true;
}

export async function updateUser(updatedUser: User, oldUsername?: string): Promise<boolean> {
  const config = getDatabaseConfig();
  const targetUsername = oldUsername || updatedUser.username;

  try {
    await fetchWithTimeout(config.sheetsApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateUser',
        role: updatedUser.role,
        username: updatedUser.username,
        password: updatedUser.password,
        oldUsername: targetUsername
      }),
    });
  } catch (err) {
    console.warn("Failed sending updateUser to Google Sheets, using local sync:", err);
  }

  // If oldUsername changed, we delete old one and update local lists
  if (oldUsername && oldUsername.toLowerCase() !== updatedUser.username.toLowerCase()) {
    let deleted = getDeletedUsernames();
    if (!deleted.includes(oldUsername.toLowerCase())) {
      deleted.push(oldUsername.toLowerCase());
      saveDeletedUsernames(deleted);
    }
  }

  // Sync to local custom persistence
  let localCustom = getLocalCustomUsers();
  const idx = localCustom.findIndex(u => u.username.toLowerCase() === targetUsername.toLowerCase());
  if (idx >= 0) {
    localCustom[idx] = updatedUser;
  } else {
    localCustom.push(updatedUser);
  }
  saveLocalCustomUsers(localCustom);
  return true;
}

export async function deleteUser(username: string): Promise<boolean> {
  const config = getDatabaseConfig();
  
  try {
    await fetchWithTimeout(config.sheetsApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'deleteUser',
        username: username
      }),
    });
  } catch (err) {
    console.warn("Failed sending deleteUser to Google Sheets, using local sync:", err);
  }

  // Add to deleted folder so default list does not pull it back in
  let deleted = getDeletedUsernames();
  if (!deleted.includes(username.toLowerCase())) {
    deleted.push(username.toLowerCase());
    saveDeletedUsernames(deleted);
  }

  // Remove from custom users
  let localCustom = getLocalCustomUsers();
  localCustom = localCustom.filter(u => u.username.toLowerCase() !== username.toLowerCase());
  saveLocalCustomUsers(localCustom);
  return true;
}

export async function getAccounts(): Promise<Account[]> {
  const config = getDatabaseConfig();
  const url = `${config.sheetsApiUrl}?action=getAccounts`;
  const res = await fetchWithTimeout(url, { method: 'GET' });
  if (!res.ok) throw new Error('Database Offline / Gagal mengambil data akun.');
  
  const responseJson = await res.json();
  if (responseJson.status === 'success' && Array.isArray(responseJson.data)) {
    return responseJson.data;
  }
  throw new Error(responseJson.message || 'Format data akun keuangan tidak valid.');
}

export async function addAccount(account: Account): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'addAccount', account }),
  });
  if (!res.ok) throw new Error('Gagal menambahkan akun baru.');
  return true;
}

export async function updateAccount(account: Account): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateAccount', account }),
  });
  if (!res.ok) throw new Error('Gagal memperbarui akun.');
  return true;
}

export async function deleteAccount(id: string): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'deleteAccount', id }),
  });
  if (!res.ok) throw new Error('Gagal menghapus akun.');
  return true;
}

export async function getProjects(): Promise<ProjectItem[]> {
  const config = getDatabaseConfig();
  const url = `${config.sheetsApiUrl}?action=getProjects`;
  const res = await fetchWithTimeout(url, { method: 'GET' });
  if (!res.ok) throw new Error('Database Offline / Gagal mengambil data proyek.');
  
  const responseJson = await res.json();
  if (responseJson.status === 'success' && Array.isArray(responseJson.data)) {
    return responseJson.data;
  }
  throw new Error(responseJson.message || 'Format data proyek tidak valid.');
}

export async function addProject(project: ProjectItem): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'addProject', project }),
  });
  if (!res.ok) throw new Error('Gagal menambahkan proyek baru.');
  return true;
}

export async function updateProject(project: ProjectItem): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateProject', project }),
  });
  if (!res.ok) throw new Error('Gagal memperbarui proyek.');
  return true;
}

export async function deleteProject(id: string): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'deleteProject', id }),
  });
  if (!res.ok) throw new Error('Gagal menghapus proyek.');
  return true;
}

export interface SystemSettings {
  imageRequiredIn: boolean; 
  imageRequiredOut: boolean; 
}

export async function getSettings(): Promise<SystemSettings> {
  const config = getDatabaseConfig();
  const url = `${config.sheetsApiUrl}?action=getSettings`;
  const res = await fetchWithTimeout(url, { method: 'GET' });
  if (!res.ok) throw new Error('Database Offline / Gagal mengambil pengaturan bukti gambar.');
  
  const responseJson = await res.json();
  if (responseJson.status === 'success' && responseJson.data) {
    let sheetsIn = false;
    let sheetsOut = false;
    if (responseJson.data.imageRequiredIn !== undefined) {
      sheetsIn = responseJson.data.imageRequiredIn === 'true' || responseJson.data.imageRequiredIn === true;
    }
    if (responseJson.data.imageRequiredOut !== undefined) {
      sheetsOut = responseJson.data.imageRequiredOut === 'true' || responseJson.data.imageRequiredOut === true;
    }
    if (responseJson.data.imageRequiredIn === undefined && responseJson.data.imageRequired !== undefined) {
      const legacy = responseJson.data.imageRequired === 'true' || responseJson.data.imageRequired === true;
      sheetsIn = legacy;
      sheetsOut = legacy;
    }
    return {
      imageRequiredIn: sheetsIn,
      imageRequiredOut: sheetsOut
    };
  }
  throw new Error(responseJson.message || 'Gagal memuat sistem pengaturan.');
}

export async function saveSettings(key: string, value: string): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateSettings', key, value }),
  });
  if (!res.ok) throw new Error('Gagal memperbarui pengaturan bukti gambar.');
  return true;
}

export async function uploadFileToDrive(filename: string, mimeType: string, base64Data: string): Promise<string> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    body: JSON.stringify({ action: 'uploadFile', filename, mimeType, base64Data })
  }, 35000); // 35s timeout for heavy pictures uploads
  
  if (!res.ok) throw new Error('Gagal mengunggah bukti ke Google Drive.');
  
  const resJson = await res.json();
  if (resJson.status === 'success' && resJson.data && resJson.data.url) {
    return resJson.data.url;
  }
  throw new Error(resJson.message || 'Tanggapan unggah file Google Drive tidak dikenal.');
}

export async function getActivityLogsFromSheets(): Promise<ActivityLog[]> {
  const config = getDatabaseConfig();
  const url = `${config.sheetsApiUrl}?action=getActivityLogs`;
  try {
    const res = await fetchWithTimeout(url, { method: 'GET' });
    if (!res.ok) return [];
    const responseJson = await res.json();
    if (responseJson.status === 'success' && Array.isArray(responseJson.data)) {
      return responseJson.data.map((log: any) => ({
        ...log,
        id: log.id || `log-${Math.floor(Date.now() + Math.random() * 1000)}`,
        timestamp: log.timestamp || new Date().toISOString()
      }));
    }
  } catch (err) {
    console.warn("Gagal mengambil log aktivitas dari Google Sheets:", err);
  }
  return [];
}

export async function addActivityLogToSheets(log: ActivityLog): Promise<boolean> {
  const config = getDatabaseConfig();
  try {
    const res = await fetchWithTimeout(config.sheetsApiUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'addActivityLog', log })
    });
    return res.ok;
  } catch (err) {
    console.warn("Gagal mengirim log aktivitas ke Google Sheets:", err);
    return false;
  }
}

export async function clearActivityLogsOnSheets(): Promise<boolean> {
  const config = getDatabaseConfig();
  try {
    const res = await fetchWithTimeout(config.sheetsApiUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'clearActivityLogs' })
    });
    return res.ok;
  } catch (err) {
    console.warn("Gagal menghapus log aktivitas di Google Sheets:", err);
    return false;
  }
}

