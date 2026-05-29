import { Transaction, User, DatabaseConfig, Account, ProjectItem, ActivityLog } from '../types';

export function getDatabaseConfig(): DatabaseConfig {
  return {
    mode: 'sheets',
    sheetsApiUrl: '/api/sheets-proxy',
    webAppUrl: '/api/sheets-proxy',
    spreadsheetId: '',
    driveFolderId: ''
  };
}

export function saveDatabaseConfig(config: DatabaseConfig) {
  // Connection parameters are stored and handled securely on the backend only
}

export async function fetchWithTimeout(resource: string, options: any = {}, timeout = 15000) {
  let targetUrl = resource;

  // Ensure relative or local-facing URLs are absolute
  if (targetUrl.startsWith('/') && !targetUrl.startsWith('//')) {
    targetUrl = new URL(targetUrl, window.location.origin).toString();
  } else if (targetUrl.startsWith('//') || !targetUrl.startsWith('http')) {
    targetUrl = new URL(targetUrl, window.location.origin).toString();
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const fetchOptions: any = {
      method: options.method || 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    if (options.body) {
      if (typeof options.body === 'string') {
        fetchOptions.body = options.body;
      } else {
        fetchOptions.body = JSON.stringify(options.body);
      }
    }

    const response = await fetch(targetUrl, fetchOptions);
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

function parseSheetsResponse(responseJson: any, errorMessage: string): any[] {
  if (!responseJson || typeof responseJson !== 'object') {
    throw new Error(`${errorMessage} (Respon tidak valid/kosong dari Google Sheets: ${String(responseJson).substring(0, 150)})`);
  }

  if (responseJson.status === 'error') {
    throw new Error(`Google Sheets Error: ${responseJson.message || 'Error tidak diketahui dari Google Apps Script'}`);
  }

  if (Array.isArray(responseJson)) {
    return responseJson;
  }

  if (Array.isArray(responseJson.data)) {
    return responseJson.data;
  }

  if (responseJson.status === 'success' && !responseJson.data) {
    return [];
  }

  throw new Error(`${errorMessage} (Format JSON tidak dikenal: ${JSON.stringify(responseJson).substring(0, 200)})`);
}

export async function getTransactions(): Promise<Transaction[]> {
  const config = getDatabaseConfig();
  const url = `${config.sheetsApiUrl}?action=getTransactions`;
  const res = await fetchWithTimeout(url, { method: 'GET' });
  if (!res.ok) {
    throw new Error('Gagal mengambil data transaksi dari sistem cloud Google Sheets.');
  }
  
  const responseJson = await res.json();
  const data = parseSheetsResponse(responseJson, 'Format data transaksi dari Google Sheets tidak didukung.');

  return data.map((tx: any) => ({
    ...tx,
    amount: Number(tx.amount) || 0,
  }));
}

export async function addTransaction(tx: Transaction): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'addTransaction', transaction: tx }),
  });
  if (!res.ok) {
    throw new Error('Gagal menambahkan transaksi baru ke Google Sheets.');
  }
  return true;
}

export async function updateTransaction(tx: Transaction): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateTransaction', transaction: tx }),
  });
  if (!res.ok) {
    throw new Error('Gagal memperbarui transaksi di Google Sheets.');
  }
  return true;
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'deleteTransaction', id }),
  });
  if (!res.ok) {
    throw new Error('Gagal menghapus transaksi dari Google Sheets.');
  }
  return true;
}

export async function getUsers(): Promise<User[]> {
  const config = getDatabaseConfig();
  const url = `${config.sheetsApiUrl}?action=getUsers`;

  const res = await fetchWithTimeout(url, { method: 'GET' });
  if (!res.ok) {
    throw new Error('Gagal mengambil hak akses pengguna dari Google Sheets.');
  }
  
  const responseJson = await res.json();
  return parseSheetsResponse(responseJson, 'Format data pengguna dari Google Sheets tidak didukung.');
}

export async function addUser(user: User): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'addUser',
      user: user
    }),
  });
  if (!res.ok) {
    throw new Error('Gagal menambahkan pengguna baru ke Google Sheets.');
  }
  return true;
}

export async function updateUser(updatedUser: User, oldUsername?: string): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'updateUser',
      user: updatedUser,
      oldUsername: oldUsername || updatedUser.username
    }),
  });
  if (!res.ok) {
    throw new Error('Gagal memperbarui data pengguna di Google Sheets.');
  }
  return true;
}

export async function deleteUser(username: string): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'deleteUser',
      username: username
    }),
  });
  if (!res.ok) {
    throw new Error('Gagal menghapus pengguna dari Google Sheets.');
  }
  return true;
}

export async function getAccounts(): Promise<Account[]> {
  const config = getDatabaseConfig();
  const url = `${config.sheetsApiUrl}?action=getAccounts`;
  const res = await fetchWithTimeout(url, { method: 'GET' });
  if (!res.ok) {
    throw new Error('Gagal mengambil akun COA dari Google Sheets.');
  }
  
  const responseJson = await res.json();
  return parseSheetsResponse(responseJson, 'Format data COA dari Google Sheets tidak didukung.');
}

export async function addAccount(account: Account): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'addAccount', account }),
  });
  if (!res.ok) {
    throw new Error('Gagal menambahkan akun COA baru ke Google Sheets.');
  }
  return true;
}

export async function updateAccount(account: Account): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateAccount', account }),
  });
  if (!res.ok) {
    throw new Error('Gagal memperbarui akun COA di Google Sheets.');
  }
  return true;
}

export async function deleteAccount(id: string): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'deleteAccount', id }),
  });
  if (!res.ok) {
    throw new Error('Gagal menghapus akun COA dari Google Sheets.');
  }
  return true;
}

export async function getProjects(): Promise<ProjectItem[]> {
  const config = getDatabaseConfig();
  const url = `${config.sheetsApiUrl}?action=getProjects`;
  const res = await fetchWithTimeout(url, { method: 'GET' });
  if (!res.ok) {
    throw new Error('Gagal mengambil proyek dari Google Sheets.');
  }
  
  const responseJson = await res.json();
  return parseSheetsResponse(responseJson, 'Format data proyek dari Google Sheets tidak didukung.');
}

export async function addProject(project: ProjectItem): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'addProject', project }),
  });
  if (!res.ok) {
    throw new Error('Gagal menambahkan proyek baru ke Google Sheets.');
  }
  return true;
}

export async function updateProject(project: ProjectItem): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateProject', project }),
  });
  if (!res.ok) {
    throw new Error('Gagal memperbarui proyek di Google Sheets.');
  }
  return true;
}

export async function deleteProject(id: string): Promise<boolean> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'deleteProject', id }),
  });
  if (!res.ok) {
    throw new Error('Gagal menghapus proyek dari Google Sheets.');
  }
  return true;
}

export interface SystemSettings {
  imageRequiredIn: boolean; 
  imageRequiredOut: boolean; 
}

export async function getSettings(): Promise<SystemSettings> {
  return { imageRequiredIn: false, imageRequiredOut: false };
}

export async function saveSettings(key: string, value: string): Promise<boolean> {
  return true;
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
