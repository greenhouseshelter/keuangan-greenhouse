import { Transaction, User, DatabaseConfig, Account, ProjectItem, ActivityLog } from '../types';
import { INITIAL_USERS, INITIAL_PROJECTS, INITIAL_ACCOUNTS, INITIAL_TRANSACTIONS } from '../data/mockData';

export function getDatabaseConfig(): DatabaseConfig {
  let savedConf = null;
  try {
    const raw = localStorage.getItem('greenhouse_db_config');
    if (raw) savedConf = JSON.parse(raw);
  } catch (e) {}

  const webAppUrl = savedConf?.webAppUrl || savedConf?.sheetsApiUrl || "https://script.google.com/macros/s/AKfycby-930U2vtfb-8SMm1ts9qrJfMi5qILo3NCdOLh6X-PDLvTr0WE6TIiKJp3J9XJ_pvn/exec";
  const spreadsheetId = savedConf?.spreadsheetId || "1Bg49SSvPGncwpM9a31ug7c3q12zyMy38ABLplCjMY6E";
  const driveFolderId = savedConf?.driveFolderId || "1HEWsIzHlFpgDs2L2UwAEPLPRU5viABwg";

  return {
    mode: 'sheets',
    sheetsApiUrl: webAppUrl,
    webAppUrl: webAppUrl,
    spreadsheetId: spreadsheetId,
    driveFolderId: driveFolderId
  };
}

export function saveDatabaseConfig(config: DatabaseConfig) {
  try {
    localStorage.setItem('greenhouse_db_config', JSON.stringify(config));
  } catch (e) {}
}

export function getCachedTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem('greenhouse_transactions');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return INITIAL_TRANSACTIONS;
}

export function saveCachedTransactions(txs: Transaction[]) {
  try {
    localStorage.setItem('greenhouse_transactions', JSON.stringify(txs));
  } catch (e) {}
}

export function getCachedAccounts(): Account[] {
  try {
    const raw = localStorage.getItem('greenhouse_accounts');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return INITIAL_ACCOUNTS;
}

export function saveCachedAccounts(accounts: Account[]) {
  try {
    localStorage.setItem('greenhouse_accounts', JSON.stringify(accounts));
  } catch (e) {}
}

export function getCachedProjects(): ProjectItem[] {
  try {
    const raw = localStorage.getItem('greenhouse_projects');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return INITIAL_PROJECTS;
}

export function saveCachedProjects(projects: ProjectItem[]) {
  try {
    localStorage.setItem('greenhouse_projects', JSON.stringify(projects));
  } catch (e) {}
}

export async function fetchWithTimeout(resource: string, options: any = {}, timeout = 15000) {
  const config = getDatabaseConfig();
  const webAppUrl = config.webAppUrl;
  const spreadsheetId = config.spreadsheetId;
  
  let targetUrl = resource;
  let useProxy = false;
  let queryParams = '';

  // Determine if this is a Google Sheets / Apps Script call
  const isGoogleScript = targetUrl.startsWith('http') && 
    (targetUrl.includes('script.google.com') || targetUrl.includes('googleusercontent.com') || (webAppUrl && targetUrl.includes(webAppUrl)));

  if (isGoogleScript) {
    useProxy = true;
    try {
      const urlObj = new URL(targetUrl);
      queryParams = urlObj.search;
    } catch (e) {
      const idx = targetUrl.indexOf('?');
      if (idx !== -1) {
        queryParams = targetUrl.slice(idx);
      }
    }
  } else if (targetUrl.startsWith('/api/sheets-proxy')) {
    useProxy = true;
    const idx = targetUrl.indexOf('?');
    if (idx !== -1) {
      queryParams = targetUrl.slice(idx);
    }
  }

  // Rewrite targetUrl to go through local server proxy if applicable
  if (useProxy) {
    targetUrl = `/api/sheets-proxy${queryParams}`;
  }

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
      headers: {}
    };

    if (options.headers) {
      for (const [key, val] of Object.entries(options.headers)) {
        fetchOptions.headers[key] = val;
      }
    }

    if (!fetchOptions.headers['Content-Type'] && !fetchOptions.headers['content-type']) {
      fetchOptions.headers['Content-Type'] = 'application/json';
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

      // Inject sheetId / spreadsheetId on post bodies going to Google Apps Script proxy
      if (spreadsheetId && useProxy) {
        bodyData.spreadsheetId = spreadsheetId;
        bodyData.sheetId = spreadsheetId;
      }
      
      fetchOptions.body = JSON.stringify(bodyData);
    }

    // Crucial: Inject override headers so proxy executes on our behalf using browser-sync credentials
    if (useProxy) {
      if (webAppUrl) {
        fetchOptions.headers['x-web-app-url'] = webAppUrl;
        fetchOptions.headers['x-sheets-api-url'] = webAppUrl;
      }
      if (spreadsheetId) {
        fetchOptions.headers['x-spreadsheet-id'] = spreadsheetId;
        fetchOptions.headers['x-sheets-id'] = spreadsheetId;
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

export async function getTransactions(): Promise<Transaction[]> {
  const config = getDatabaseConfig();
  const url = `${config.sheetsApiUrl}?action=getTransactions`;
  try {
    const res = await fetchWithTimeout(url, { method: 'GET' });
    if (!res.ok) {
      console.warn('Database Offline / Gagal tersambung ke Google Sheets. Menggunakan cache lokal.');
      return getCachedTransactions();
    }
    
    const responseJson = await res.json();
    let data: any[] = [];
    
    if (Array.isArray(responseJson)) {
      data = responseJson;
    } else if (responseJson && Array.isArray(responseJson.data)) {
      data = responseJson.data;
    } else if (responseJson && responseJson.status === 'success' && !responseJson.data) {
      data = [];
    } else {
      console.warn('Format data dari Google Sheets tidak didukung. Menggunakan cache lokal.');
      return getCachedTransactions();
    }

    const mapped = data.map((tx: any) => ({
      ...tx,
      amount: Number(tx.amount) || 0,
    }));

    saveCachedTransactions(mapped);
    return mapped;
  } catch (err) {
    console.warn('Error fetching transactions, using cache fallback:', err);
    return getCachedTransactions();
  }
}

export async function addTransaction(tx: Transaction): Promise<boolean> {
  const config = getDatabaseConfig();
  
  // Update cache first immediately
  const txs = getCachedTransactions();
  const idx = txs.findIndex(t => t.id === tx.id);
  if (idx >= 0) {
    txs[idx] = tx;
  } else {
    txs.push(tx);
  }
  saveCachedTransactions(txs);

  try {
    const res = await fetchWithTimeout(config.sheetsApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addTransaction', transaction: tx }),
    });
    if (!res.ok) console.warn('Gagal menambahkan transaksi ke Google Sheets via API.');
  } catch (err) {
    console.warn('Gagal menambahkan transaksi ke Google Sheets (Offline):', err);
  }
  return true;
}

export async function updateTransaction(tx: Transaction): Promise<boolean> {
  const config = getDatabaseConfig();
  
  // Update cache first immediately
  const txs = getCachedTransactions();
  const idx = txs.findIndex(t => t.id === tx.id);
  if (idx >= 0) {
    txs[idx] = tx;
    saveCachedTransactions(txs);
  }

  try {
    const res = await fetchWithTimeout(config.sheetsApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateTransaction', transaction: tx }),
    });
    if (!res.ok) console.warn('Gagal memperbarui transaksi di Google Sheets via API.');
  } catch (err) {
    console.warn('Gagal memperbarui transaksi di Google Sheets (Offline):', err);
  }
  return true;
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const config = getDatabaseConfig();
  
  // Update cache first immediately
  let txs = getCachedTransactions();
  txs = txs.filter(t => t.id !== id);
  saveCachedTransactions(txs);

  try {
    const res = await fetchWithTimeout(config.sheetsApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteTransaction', id }),
    });
    if (!res.ok) console.warn('Gagal menghapus transaksi dari Google Sheets via API.');
  } catch (err) {
    console.warn('Gagal menghapus transaksi dari Google Sheets (Offline):', err);
  }
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
  try {
    const res = await fetchWithTimeout(url, { method: 'GET' });
    if (!res.ok) {
      console.warn('Database Offline / Gagal mengambil data akun. Menggunakan cache lokal.');
      return getCachedAccounts();
    }
    
    const responseJson = await res.json();
    let data: any[] = [];
    if (Array.isArray(responseJson)) {
      data = responseJson;
    } else if (responseJson && Array.isArray(responseJson.data)) {
      data = responseJson.data;
    } else if (responseJson && responseJson.status === 'success' && !responseJson.data) {
      data = [];
    } else {
      console.warn('Format data akun dari Google Sheets tidak didukung. Menggunakan cache lokal.');
      return getCachedAccounts();
    }

    saveCachedAccounts(data);
    return data;
  } catch (err) {
    console.warn('Error fetching accounts, using cache fallback:', err);
    return getCachedAccounts();
  }
}

export async function addAccount(account: Account): Promise<boolean> {
  const config = getDatabaseConfig();
  
  // Update cache first
  const accounts = getCachedAccounts();
  const idx = accounts.findIndex(a => a.id === account.id);
  if (idx >= 0) {
    accounts[idx] = account;
  } else {
    accounts.push(account);
  }
  saveCachedAccounts(accounts);

  try {
    const res = await fetchWithTimeout(config.sheetsApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addAccount', account }),
    });
    if (!res.ok) console.warn('Gagal menambahkan akun baru via API.');
  } catch (err) {
    console.warn('Gagal menambahkan akun baru (Offline):', err);
  }
  return true;
}

export async function updateAccount(account: Account): Promise<boolean> {
  const config = getDatabaseConfig();
  
  // Update cache first
  const accounts = getCachedAccounts();
  const idx = accounts.findIndex(a => a.id === account.id);
  if (idx >= 0) {
    accounts[idx] = account;
    saveCachedAccounts(accounts);
  }

  try {
    const res = await fetchWithTimeout(config.sheetsApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateAccount', account }),
    });
    if (!res.ok) console.warn('Gagal memperbarui akun via API.');
  } catch (err) {
    console.warn('Gagal memperbarui akun (Offline):', err);
  }
  return true;
}

export async function deleteAccount(id: string): Promise<boolean> {
  const config = getDatabaseConfig();
  
  // Update cache first
  let accounts = getCachedAccounts();
  accounts = accounts.filter(a => a.id !== id);
  saveCachedAccounts(accounts);

  try {
    const res = await fetchWithTimeout(config.sheetsApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteAccount', id }),
    });
    if (!res.ok) console.warn('Gagal menghapus akun via API.');
  } catch (err) {
    console.warn('Gagal menghapus akun (Offline):', err);
  }
  return true;
}

export async function getProjects(): Promise<ProjectItem[]> {
  const config = getDatabaseConfig();
  const url = `${config.sheetsApiUrl}?action=getProjects`;
  try {
    const res = await fetchWithTimeout(url, { method: 'GET' });
    if (!res.ok) {
      console.warn('Database Offline / Gagal mengambil data proyek. Menggunakan cache lokal.');
      return getCachedProjects();
    }
    
    const responseJson = await res.json();
    let data: any[] = [];
    if (Array.isArray(responseJson)) {
      data = responseJson;
    } else if (responseJson && Array.isArray(responseJson.data)) {
      data = responseJson.data;
    } else if (responseJson && responseJson.status === 'success' && !responseJson.data) {
      data = [];
    } else {
      console.warn('Format data proyek dari Google Sheets tidak didukung. Menggunakan cache lokal.');
      return getCachedProjects();
    }

    saveCachedProjects(data);
    return data;
  } catch (err) {
    console.warn('Error fetching projects, using cache fallback:', err);
    return getCachedProjects();
  }
}

export async function addProject(project: ProjectItem): Promise<boolean> {
  const config = getDatabaseConfig();
  
  // Update cache first
  const projects = getCachedProjects();
  const idx = projects.findIndex(p => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.push(project);
  }
  saveCachedProjects(projects);

  try {
    const res = await fetchWithTimeout(config.sheetsApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addProject', project }),
    });
    if (!res.ok) console.warn('Gagal menambahkan proyek baru via API.');
  } catch (err) {
    console.warn('Gagal menambahkan proyek baru (Offline):', err);
  }
  return true;
}

export async function updateProject(project: ProjectItem): Promise<boolean> {
  const config = getDatabaseConfig();
  
  // Update cache first
  const projects = getCachedProjects();
  const idx = projects.findIndex(p => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = project;
    saveCachedProjects(projects);
  }

  try {
    const res = await fetchWithTimeout(config.sheetsApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateProject', project }),
    });
    if (!res.ok) console.warn('Gagal memperbarui proyek via API.');
  } catch (err) {
    console.warn('Gagal memperbarui proyek (Offline):', err);
  }
  return true;
}

export async function deleteProject(id: string): Promise<boolean> {
  const config = getDatabaseConfig();
  
  // Update cache first
  let projects = getCachedProjects();
  projects = projects.filter(p => p.id !== id);
  saveCachedProjects(projects);

  try {
    const res = await fetchWithTimeout(config.sheetsApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteProject', id }),
    });
    if (!res.ok) console.warn('Gagal menghapus proyek via API.');
  } catch (err) {
    console.warn('Gagal menghapus proyek (Offline):', err);
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
  try {
    const res = await fetchWithTimeout(url, { method: 'GET' });
    if (!res.ok) {
      console.warn('Database Offline / Gagal mengambil pengaturan. Menggunakan default.');
      return getCachedSettings();
    }
    
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
      const settings = {
        imageRequiredIn: sheetsIn,
        imageRequiredOut: sheetsOut
      };
      saveCachedSettings(settings);
      return settings;
    }
    return getCachedSettings();
  } catch (err) {
    console.warn('Error fetching settings, using default/cached settings:', err);
    return getCachedSettings();
  }
}

export function getCachedSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem('greenhouse_settings');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { imageRequiredIn: false, imageRequiredOut: false };
}

export function saveCachedSettings(settings: SystemSettings) {
  try {
    localStorage.setItem('greenhouse_settings', JSON.stringify(settings));
  } catch (e) {}
}

export async function saveSettings(key: string, value: string): Promise<boolean> {
  const config = getDatabaseConfig();

  // Update cached copy
  const current = getCachedSettings();
  if (key === 'imageRequiredIn') {
    current.imageRequiredIn = value === 'true';
  } else if (key === 'imageRequiredOut') {
    current.imageRequiredOut = value === 'true';
  }
  saveCachedSettings(current);

  try {
    const res = await fetchWithTimeout(config.sheetsApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateSettings', key, value }),
    });
    if (!res.ok) console.warn('Gagal memperbarui pengaturan via API.');
  } catch (err) {
    console.warn('Gagal memperbarui pengaturan (Offline):', err);
  }
  return true;
}

export async function uploadFileToDrive(filename: string, mimeType: string, base64Data: string): Promise<string> {
  const config = getDatabaseConfig();
  const res = await fetchWithTimeout(config.sheetsApiUrl, {
    method: 'POST',
    body: JSON.stringify({ 
      action: 'uploadFile', 
      filename, 
      mimeType, 
      base64Data,
      folderId: config.driveFolderId || '1HEWsIzHlFpgDs2L2UwAEPLPRU5viABwg'
    })
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

