import { Transaction, User, DatabaseConfig, Account, ProjectItem, ActivityLog } from '../types';
import backendConfig from '../../backend_config.json';

// Keep track of direct connection override
let useDirectConnection = false;

// Check if we are running on a custom client-side domain (e.g. Vercel)
const isCustomDomain = typeof window !== 'undefined' && 
  window.location.hostname && 
  !window.location.hostname.includes('localhost') && 
  !window.location.hostname.includes('127.0.0.1') && 
  !window.location.hostname.endsWith('.run.app') && 
  !window.location.hostname.includes('aistudio.google') && 
  !window.location.hostname.includes('googleusercontent.com');

export function getDatabaseConfig(): DatabaseConfig {
  const isDirect = useDirectConnection || isCustomDomain;
  return {
    mode: 'sheets',
    sheetsApiUrl: isDirect ? backendConfig.webAppUrl : '/api/sheets-proxy',
    webAppUrl: backendConfig.webAppUrl,
    spreadsheetId: backendConfig.spreadsheetId,
    driveFolderId: ''
  };
}

export function saveDatabaseConfig(config: DatabaseConfig) {
  // Connection parameters are stored and handled securely on the backend only
}

export async function fetchWithTimeout(resource: string, options: any = {}, timeout = 15000): Promise<Response> {
  let targetUrl = resource;
  const isProxyUrl = targetUrl.includes('/api/sheets-proxy');
  const isDirectGoogleUrl = targetUrl.startsWith('https://script.google.com');
  const isSheetsDatabaseCall = isProxyUrl || isDirectGoogleUrl;
  const isDirect = useDirectConnection || isCustomDomain;

  if (isSheetsDatabaseCall && isDirect) {
    let finalBase = targetUrl;
    let queryParams = new URLSearchParams();

    if (isProxyUrl) {
      let urlObj: URL;
      if (targetUrl.startsWith('http')) {
        urlObj = new URL(targetUrl);
      } else {
        urlObj = new URL(targetUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
      }
      queryParams = new URLSearchParams(urlObj.search);
      finalBase = backendConfig.webAppUrl;
    } else {
      const urlObj = new URL(targetUrl);
      queryParams = new URLSearchParams(urlObj.search);
      finalBase = `${urlObj.origin}${urlObj.pathname}`;
    }

    if (backendConfig.spreadsheetId) {
      queryParams.set('spreadsheetId', backendConfig.spreadsheetId);
      queryParams.set('sheetId', backendConfig.spreadsheetId);
    }

    const separator = finalBase.includes('?') ? '&' : '?';
    const paramsStr = queryParams.toString();
    targetUrl = paramsStr ? `${finalBase}${separator}${paramsStr}` : finalBase;
    
    options.redirect = 'follow';

    if (options.method === 'POST' && options.body) {
      try {
        let bodyObj = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
        if (typeof bodyObj === 'object' && backendConfig.spreadsheetId) {
          bodyObj = {
            ...bodyObj,
            spreadsheetId: backendConfig.spreadsheetId,
            sheetId: backendConfig.spreadsheetId
          };
          options.body = JSON.stringify(bodyObj);
        }
      } catch (e) {
        console.warn('Gagal memproses/menyuntik spreadsheetId ke POST body:', e);
      }
    }
  }

  // Ensure relative or local-facing URLs are absolute
  if (targetUrl.startsWith('/') && !targetUrl.startsWith('//')) {
    targetUrl = new URL(targetUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000').toString();
  } else if (targetUrl.startsWith('//') || !targetUrl.startsWith('http')) {
    targetUrl = new URL(targetUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000').toString();
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = { ...(options.headers || {}) };

    if (isSheetsDatabaseCall && isDirect) {
      if ((options.method || 'GET').toUpperCase() === 'POST') {
        // Force text/plain to bypass CORS preflight check on direct script.google.com posts
        headers['Content-Type'] = 'text/plain';
      } else {
        // Remove Content-Type for GET requests to script.google.com to prevent preflight OPTIONS requests
        delete headers['Content-Type'];
      }
    } else {
      // Normal localhost/proxy flow
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    const fetchOptions: any = {
      method: options.method || 'GET',
      signal: controller.signal,
      headers,
      redirect: options.redirect || 'follow'
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

    // Auto fallback trigger if proxy fails or returns 404/502
    if (isSheetsDatabaseCall && !isDirect && (response.status === 404 || response.status === 502)) {
      console.warn(`Proxy returned HTTP ${response.status}. Automatically falling back to direct Google Web App URL...`);
      useDirectConnection = true;
      return fetchWithTimeout(resource, options, timeout);
    }

    return response;
  } catch (error) {
    clearTimeout(id);

    // Network errors or offline exceptions
    if (isSheetsDatabaseCall && !isDirect) {
      console.warn("Proxy connection error. Automatically falling back to direct Google Web App: ", error);
      useDirectConnection = true;
      return fetchWithTimeout(resource, options, timeout);
    }
    throw error;
  }
}

async function handleNonOkResponse(res: Response, defaultMessage: string): Promise<never> {
  try {
    const errData = await res.json();
    if (errData && errData.message) {
      throw new Error(`${defaultMessage}. Detail: ${errData.message}`);
    }
  } catch (_) {}
  throw new Error(`${defaultMessage} (Status Server: HTTP ${res.status} ${res.statusText || ''})`);
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
    await handleNonOkResponse(res, 'Gagal mengambil data transaksi dari sistem cloud Google Sheets');
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
    await handleNonOkResponse(res, 'Gagal menambahkan transaksi baru ke Google Sheets');
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
    await handleNonOkResponse(res, 'Gagal memperbarui transaksi di Google Sheets');
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
    await handleNonOkResponse(res, 'Gagal menghapus transaksi dari Google Sheets');
  }
  return true;
}

export async function getUsers(): Promise<User[]> {
  const config = getDatabaseConfig();
  const url = `${config.sheetsApiUrl}?action=getUsers`;

  const res = await fetchWithTimeout(url, { method: 'GET' });
  if (!res.ok) {
    await handleNonOkResponse(res, 'Gagal mengambil hak akses pengguna dari Google Sheets');
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
    await handleNonOkResponse(res, 'Gagal menambahkan pengguna baru ke Google Sheets');
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
    await handleNonOkResponse(res, 'Gagal memperbarui data pengguna di Google Sheets');
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
    await handleNonOkResponse(res, 'Gagal menghapus pengguna dari Google Sheets');
  }
  return true;
}

export async function getAccounts(): Promise<Account[]> {
  const config = getDatabaseConfig();
  const url = `${config.sheetsApiUrl}?action=getAccounts`;
  const res = await fetchWithTimeout(url, { method: 'GET' });
  if (!res.ok) {
    await handleNonOkResponse(res, 'Gagal mengambil akun COA dari Google Sheets');
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
    await handleNonOkResponse(res, 'Gagal menambahkan akun COA baru ke Google Sheets');
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
    await handleNonOkResponse(res, 'Gagal memperbarui akun COA di Google Sheets');
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
    await handleNonOkResponse(res, 'Gagal menghapus akun COA dari Google Sheets');
  }
  return true;
}

export async function getProjects(): Promise<ProjectItem[]> {
  const config = getDatabaseConfig();
  const url = `${config.sheetsApiUrl}?action=getProjects`;
  const res = await fetchWithTimeout(url, { method: 'GET' });
  if (!res.ok) {
    await handleNonOkResponse(res, 'Gagal mengambil proyek dari Google Sheets');
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
    await handleNonOkResponse(res, 'Gagal menambahkan proyek baru ke Google Sheets');
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
    await handleNonOkResponse(res, 'Gagal memperbarui proyek di Google Sheets');
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
    await handleNonOkResponse(res, 'Gagal menghapus proyek dari Google Sheets');
  }
  return true;
}

export interface SystemSettings {
  imageRequiredIn: boolean; 
  imageRequiredOut: boolean; 
}

export async function getSettings(): Promise<SystemSettings> {
  const config = getDatabaseConfig();
  const url = `${config.sheetsApiUrl}?action=getSettings`;
  
  let imageRequiredIn = false;
  let imageRequiredOut = false;
  
  // Try loading from localStorage first to guarantee instant speed
  const local = localStorage.getItem('greenhouse_system_settings');
  if (local) {
    try {
      const parsed = JSON.parse(local);
      imageRequiredIn = !!parsed.imageRequiredIn;
      imageRequiredOut = !!parsed.imageRequiredOut;
    } catch (e) {}
  }
  
  try {
    const res = await fetchWithTimeout(url, { method: 'GET' });
    if (res.ok) {
      const responseJson = await res.json();
      if (responseJson.status === 'success' && Array.isArray(responseJson.data)) {
        for (const row of responseJson.data) {
          if (row.key === 'imageRequiredIn') {
            try {
              imageRequiredIn = typeof row.value === 'string' ? JSON.parse(row.value) : !!row.value;
            } catch (e) {
              imageRequiredIn = row.value === 'true' || row.value === 1 || row.value === true;
            }
          }
          if (row.key === 'imageRequiredOut') {
            try {
              imageRequiredOut = typeof row.value === 'string' ? JSON.parse(row.value) : !!row.value;
            } catch (e) {
              imageRequiredOut = row.value === 'true' || row.value === 1 || row.value === true;
            }
          }
        }
        // Save latest sync locally
        localStorage.setItem('greenhouse_system_settings', JSON.stringify({ imageRequiredIn, imageRequiredOut }));
      }
    }
  } catch (err) {
    console.warn("Gagal mengambil pengaturan dari Google Sheets, menggunakan data cache lokal:", err);
  }
  
  return { imageRequiredIn, imageRequiredOut };
}

export async function saveSettings(key: string, value: boolean): Promise<boolean> {
  const config = getDatabaseConfig();
  try {
    const res = await fetchWithTimeout(config.sheetsApiUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'updateSettings', key, value }),
    });
    if (res.ok) {
      const local = localStorage.getItem('greenhouse_system_settings');
      const settings = local ? JSON.parse(local) : { imageRequiredIn: false, imageRequiredOut: false };
      settings[key] = value;
      localStorage.setItem('greenhouse_system_settings', JSON.stringify(settings));
      return true;
    }
  } catch (err) {
    console.warn("Gagal menyimpan pengaturan ke Google Sheets Web App:", err);
  }
  
  // Fallback local save in case of being offline
  const local = localStorage.getItem('greenhouse_system_settings');
  const settings = local ? JSON.parse(local) : { imageRequiredIn: false, imageRequiredOut: false };
  settings[key] = value;
  localStorage.setItem('greenhouse_system_settings', JSON.stringify(settings));
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
