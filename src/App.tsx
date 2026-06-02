import React, { useState, useEffect } from 'react';
import { User, Role, Transaction, DatabaseConfig, Project } from './types';
import { 
  getTransactions, getUsers, addTransaction, updateTransaction, 
  deleteTransaction, getDatabaseConfig, fetchWithTimeout
} from './utils/db';
import { addActivityLog } from './utils/activityLogger';
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import TransactionView from './components/TransactionView';
import ReportsView from './components/ReportsView';
import FinancialAnalysis from './components/FinancialAnalysis';
import AdminUsersView from './components/AdminUsersView';
import AdminAccountsView from './components/AdminAccountsView';
import AdminProjectsView from './components/AdminProjectsView';
import ChangePasswordView from './components/ChangePasswordView';
import AdminLogsView from './components/AdminLogsView';
import SystemSettingsView from './components/SystemSettingsView';
import ReconciliationView from './components/ReconciliationView';
import BalanceSheetView from './components/BalanceSheetView';
import { 
  Sprout, LogOut, LayoutDashboard, ScrollText, FileBarChart2, 
  BrainCircuit, Users2, Database, Shield, KeyRound, Menu, X, ArrowUpRight, CheckCircle, RefreshCw, Key, Layers,
  Eye, EyeOff, AlertTriangle, Settings, CheckSquare, Scale
} from 'lucide-react';

const GOOGLE_APPS_SCRIPT_CODE = `// GOOGLE APPS SCRIPT DATABASE CONNECTOR (Code.gs)
// Salin seluruh skrip ini dan tempelkan di Extensions -> Apps Script dalam Google Sheet Anda

function doGet(e) {
  try {
    var action = e.parameter.action;
    var ssId = e.parameter.spreadsheetId || e.parameter.sheetId;
    var ss = ssId ? SpreadsheetApp.openById(ssId) : SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'getTransactions') {
      return jsonResponse({ status: 'success', data: readSheetData(ss, 'Transactions') });
    } else if (action === 'getUsers') {
      var users = readSheetData(ss, 'Users');
      if (users.length === 0) {
        // Inisialisasi default akun jika kosong
        users = [
          { role: 'Admin', username: 'admin', password: 'adminpassword123' },
          { role: 'Pengelola', username: 'pengelola', password: 'pengelolapassword123' },
          { role: 'Finance', username: 'finance', password: 'financepassword123' },
          { role: 'Accounting', username: 'accounting', password: 'accountingpassword123' }
        ];
        writeSheetData(ss, 'Users', users);
      }
      return jsonResponse({ status: 'success', data: users });
    } else if (action === 'getAccounts') {
      var accounts = readSheetData(ss, 'Accounts');
      if (accounts.length === 0) {
        accounts = [
          { id: 'acc_1', name: 'Penjualan Melon', type: 'Project' },
          { id: 'acc_2', name: 'Penjualan Cabe', type: 'Project' },
          { id: 'acc_3', name: 'Penjualan Siraman Alat', type: 'Project' },
          { id: 'acc_4', name: 'Kas Kecil Kebun', type: 'All' },
          { id: 'acc_5', name: 'Kas Besar', type: 'All' }
        ];
        writeSheetData(ss, 'Accounts', accounts);
      }
      return jsonResponse({ status: 'success', data: accounts });
    } else if (action === 'getProjects') {
      var projects = readSheetData(ss, 'Projects');
      if (projects.length === 0) {
        projects = [
          { id: 'proj_melon', name: 'Melon' },
          { id: 'proj_cabe', name: 'Cabe' },
          { id: 'proj_perikanan', name: 'Perikanan' },
          { id: 'proj_ternak', name: 'Ternak' }
        ];
        writeSheetData(ss, 'Projects', projects);
      }
      return jsonResponse({ status: 'success', data: projects });
    } else if (action === 'getSettings') {
      return jsonResponse({ status: 'success', data: readSheetData(ss, 'Settings') });
    } else if (action === 'getActivityLogs') {
      return jsonResponse({ status: 'success', data: readSheetData(ss, 'ActivityLogs') });
    }
    
    return jsonResponse({ status: 'error', message: 'Action not found: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    var ssId = postData.spreadsheetId || postData.sheetId;
    var ss = ssId ? SpreadsheetApp.openById(ssId) : SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'addTransaction') {
      appendRowData(ss, 'Transactions', postData.transaction);
      return jsonResponse({ status: 'success' });
    } else if (action === 'updateTransaction') {
      updateRowData(ss, 'Transactions', 'id', postData.transaction.id, postData.transaction);
      return jsonResponse({ status: 'success' });
    } else if (action === 'deleteTransaction') {
      deleteRowData(ss, 'Transactions', 'id', postData.id);
      return jsonResponse({ status: 'success' });
    }
    
    else if (action === 'addUser') {
      appendRowData(ss, 'Users', postData.user);
      return jsonResponse({ status: 'success' });
    } else if (action === 'updateUser') {
      updateRowData(ss, 'Users', 'username', postData.user.username, postData.user);
      return jsonResponse({ status: 'success' });
    } else if (action === 'deleteUser') {
      deleteRowData(ss, 'Users', 'username', postData.username);
      return jsonResponse({ status: 'success' });
    }
    
    else if (action === 'addAccount') {
      appendRowData(ss, 'Accounts', postData.account);
      return jsonResponse({ status: 'success' });
    } else if (action === 'updateAccount') {
      updateRowData(ss, 'Accounts', 'id', postData.account.id, postData.account);
      return jsonResponse({ status: 'success' });
    } else if (action === 'deleteAccount') {
      deleteRowData(ss, 'Accounts', 'id', postData.id);
      return jsonResponse({ status: 'success' });
    }
    
    else if (action === 'addProject') {
      appendRowData(ss, 'Projects', postData.project);
      return jsonResponse({ status: 'success' });
    } else if (action === 'updateProject') {
      updateRowData(ss, 'Projects', 'id', postData.project.id, postData.project);
      return jsonResponse({ status: 'success' });
    } else if (action === 'deleteProject') {
      deleteRowData(ss, 'Projects', 'id', postData.id);
      return jsonResponse({ status: 'success' });
    }
    
    else if (action === 'updateSettings') {
      var item = { key: postData.key, value: JSON.stringify(postData.value) };
      updateRowData(ss, 'Settings', 'key', postData.key, item, true);
      return jsonResponse({ status: 'success' });
    }
    
    else if (action === 'addActivityLog') {
      appendRowData(ss, 'ActivityLogs', postData.log);
      return jsonResponse({ status: 'success' });
    } else if (action === 'clearActivityLogs') {
      clearSheet(ss, 'ActivityLogs');
      return jsonResponse({ status: 'success' });
    }
    
    return jsonResponse({ status: 'error', message: 'Unknown post action: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

// Fungsi Bantu Global
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrAddSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function readSheetData(ss, name) {
  var sheet = getOrAddSheet(ss, name);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  
  var data = [];
  for (var r = 0; r < values.length; r++) {
    var obj = {};
    var empty = true;
    for (var c = 0; c < headers.length; c++) {
      if (headers[c]) {
        var cellVal = values[r][c];
        if (cellVal instanceof Date) {
          cellVal = cellVal.toISOString();
        }
        obj[headers[c]] = cellVal;
        if (cellVal !== '') empty = false;
      }
    }
    if (!empty) data.push(obj);
  }
  return data;
}

function writeSheetData(ss, name, arrayList) {
  var sheet = getOrAddSheet(ss, name);
  sheet.clear();
  if (arrayList.length === 0) return;
  
  var headers = Object.keys(arrayList[0]);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  var matrix = [];
  for (var i = 0; i < arrayList.length; i++) {
    var row = [];
    for (var j = 0; j < headers.length; j++) {
      var val = arrayList[i][headers[j]];
      row.push(val === undefined || val === null ? '' : val);
    }
    matrix.push(row);
  }
  sheet.getRange(2, 1, matrix.length, headers.length).setValues(matrix);
}

function appendRowData(ss, name, obj) {
  var sheet = getOrAddSheet(ss, name);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  
  var headers = [];
  if (lastRow === 0 || lastCol === 0) {
    headers = Object.keys(obj);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var objKeys = Object.keys(obj);
    var added = false;
    for (var i = 0; i < objKeys.length; i++) {
      if (headers.indexOf(objKeys[i]) === -1) {
        headers.push(objKeys[i]);
        added = true;
      }
    }
    if (added) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  
  var row = [];
  for (var j = 0; j < headers.length; j++) {
    var val = obj[headers[j]];
    row.push(val === undefined || val === null ? '' : val);
  }
  sheet.appendRow(row);
}

function updateRowData(ss, name, keyName, keyValue, obj, insertIfNotFound) {
  var sheet = getOrAddSheet(ss, name);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) {
    if (insertIfNotFound) appendRowData(ss, name, obj);
    return;
  }
  
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var colIdx = headers.indexOf(keyName);
  if (colIdx === -1) {
    if (insertIfNotFound) appendRowData(ss, name, obj);
    return;
  }
  
  var values = sheet.getRange(2, colIdx + 1, lastRow - 1, 1).getValues();
  var foundRowIdx = -1;
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase() === String(keyValue).toLowerCase()) {
      foundRowIdx = i + 2;
      break;
    }
  }
  
  if (foundRowIdx !== -1) {
    for (var key in obj) {
      var cIdx = headers.indexOf(key);
      if (cIdx !== -1) {
        var cellVal = obj[key];
        sheet.getRange(foundRowIdx, cIdx + 1).setValue(cellVal === undefined || cellVal === null ? '' : cellVal);
      } else {
        headers.push(key);
        sheet.getRange(1, headers.length).setValue(key);
        sheet.getRange(foundRowIdx, headers.length).setValue(obj[key] === undefined || obj[key] === null ? '' : obj[key]);
      }
    }
  } else if (insertIfNotFound) {
    appendRowData(ss, name, obj);
  }
}

function deleteRowData(ss, name, keyName, keyValue) {
  var sheet = getOrAddSheet(ss, name);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return;
  
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var colIdx = headers.indexOf(keyName);
  if (colIdx === -1) return;
  
  var values = sheet.getRange(2, colIdx + 1, lastRow - 1, 1).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    if (String(values[i][0]).toLowerCase() === String(keyValue).toLowerCase()) {
      sheet.deleteRow(i + 2);
    }
  }
}

function clearSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (sheet) {
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow > 1 && lastCol > 0) {
      sheet.getRange(2, 1, lastRow - 1, lastCol).clear();
    }
  }
}
`;

const getMetroColor = (id: string) => {
  switch (id) {
    case 'dashboard': return 'bg-sky-600 hover:bg-sky-500 text-white';
    case 'keuangan': return 'bg-emerald-600 hover:bg-emerald-500 text-white';
    case 'rekonsiliasi': return 'bg-indigo-600 hover:bg-indigo-500 text-white';
    case 'laporan': return 'bg-rose-600 hover:bg-rose-500 text-white';
    case 'proyek': return 'bg-amber-600 hover:bg-amber-500 text-white';
    case 'akun': return 'bg-teal-600 hover:bg-teal-500 text-white';
    case 'settings': return 'bg-slate-600 hover:bg-slate-500 text-white';
    case 'analisis': return 'bg-purple-600 hover:bg-purple-500 text-white';
    case 'pengguna': return 'bg-violet-700 hover:bg-violet-600 text-white';
    case 'logs': return 'bg-zinc-650 hover:bg-zinc-600 text-white';
    case 'ubah-password': return 'bg-cyan-600 hover:bg-cyan-500 text-white';
    default: return 'bg-slate-700 hover:bg-slate-600 text-white';
  }
};

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loginError, setLoginError] = useState('');

  // App data state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>(getDatabaseConfig());
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [connectionError, setConnectionError] = useState<'cookie_blocked' | 'not_configured' | 'offline_or_failed' | ''>('');
  const [connectionDebugInfo, setConnectionDebugInfo] = useState<string>('');
  const [appLoading, setAppLoading] = useState(false);
  const [txInitialFilters, setTxInitialFilters] = useState<{ project?: Project; type?: 'Inflow' | 'Outflow' } | undefined>(undefined);

  // Navigation state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Desktop Sidebar auto-hide / collapse states
  const [sidebarPinned, setSidebarPinned] = useState<boolean>(() => {
    const saved = localStorage.getItem('greenhouse_sidebar_pinned');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [sidebarHovered, setSidebarHovered] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarPinned(prev => {
      const newVal = !prev;
      localStorage.setItem('greenhouse_sidebar_pinned', JSON.stringify(newVal));
      return newVal;
    });
  };

  // Spacing and Typography accessibility styles
  const [textFontSize, setTextFontSize] = useState<'normal' | 'large' | 'xl'>(() => {
    return (localStorage.getItem('greenhouse_font_size') as any) || 'normal';
  });
  const [textSpacing, setTextSpacing] = useState<'normal' | 'narrow' | 'compact'>(() => {
    return (localStorage.getItem('greenhouse_spacing') as any) || 'normal';
  });

  // Dynamic Theme Templates & Dark Mode State
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('greenhouse_theme_mode') as 'light' | 'dark') || 'light';
  });
  const [selectedTemplate, setSelectedTemplate] = useState<'emerald' | 'gold' | 'purple'>(() => {
    return (localStorage.getItem('greenhouse_selected_template') as 'emerald' | 'gold' | 'purple') || 'emerald';
  });
  const [layoutTemplate, setLayoutTemplate] = useState<'sidebar' | 'topnav' | 'compact'>(() => {
    return (localStorage.getItem('greenhouse_layout_template') as 'sidebar' | 'topnav' | 'compact') || 'sidebar';
  });

  const [fontFamilyStyle, setFontFamilyStyle] = useState<'sans' | 'serif' | 'mono'>(() => {
    return (localStorage.getItem('greenhouse_font_style') as 'sans' | 'serif' | 'mono') || 'sans';
  });

  const [aiModel, setAiModel] = useState<string>(() => {
    return localStorage.getItem('greenhouse_ai_model') || 'gemini-3.5-flash';
  });

  const [aiTemperature, setAiTemperature] = useState<number>(() => {
    return parseFloat(localStorage.getItem('greenhouse_ai_temperature') || '0.7');
  });

  const [systemInstructions, setSystemInstructions] = useState<string>(() => {
    return localStorage.getItem('greenhouse_system_instructions') || 
      "Gunakan kebijakan audit ketat. Pastikan saldo kas proyek real-time sinkron sebelum menyetujui kuitansi pengeluaran operasional baru.";
  });

  const handleFontSizeChange = (size: 'normal' | 'large' | 'xl') => {
    setTextFontSize(size);
    localStorage.setItem('greenhouse_font_size', size);
  };

  const handleSpacingChange = (spacing: 'normal' | 'narrow' | 'compact') => {
    setTextSpacing(spacing);
    localStorage.setItem('greenhouse_spacing', spacing);
  };

  const handleThemeModeChange = (mode: 'light' | 'dark') => {
    setThemeMode(mode);
    localStorage.setItem('greenhouse_theme_mode', mode);
  };

  const handleTemplateChange = (template: 'emerald' | 'gold' | 'purple') => {
    setSelectedTemplate(template);
    localStorage.setItem('greenhouse_selected_template', template);
  };

  const handleLayoutTemplateChange = (layout: 'sidebar' | 'topnav' | 'compact') => {
    setLayoutTemplate(layout);
    localStorage.setItem('greenhouse_layout_template', layout);
  };

  const handleFontStyleChange = (font: 'sans' | 'serif' | 'mono') => {
    setFontFamilyStyle(font);
    localStorage.setItem('greenhouse_font_style', font);
  };

  // Sync index classes on load & changes
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeMode]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-emerald', 'theme-teal', 'theme-purple', 'theme-gold');
    root.classList.add(`theme-${selectedTemplate}`);
  }, [selectedTemplate]);

  useEffect(() => {
    loadAppData();
    
    // Auto-login helper check
    const savedUser = localStorage.getItem('greenhouse_active_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const testGoogleSheetsConnection = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 12000); // 12s timeout for stability
      
      const response = await fetchWithTimeout('/api/sheets-proxy?action=getSettings&_t=' + Date.now(), {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(id);
      
      if (!response.ok) {
        try {
          const errJson = await response.json();
          if (errJson && errJson.status === 'error') {
            if (errJson.html) {
              const htmlStr = errJson.html;
              if (htmlStr.includes('Script function not found') || htmlStr.includes('doGet')) {
                setConnectionError('warning');
                setConnectionDebugInfo('Fungsi doGet tidak ditemukan di Google Apps Script Anda. Pastikan kode Apps Script telah diletakkan dan dipublikasikan dengan benar.');
              } else if (htmlStr.includes('shortcut icon') || htmlStr.includes('docs/script') || htmlStr.includes('SpreadsheetApp')) {
                setConnectionError('warning');
                setConnectionDebugInfo('Akun Google tidak diizinkan mengakses Spreadsheet, atau ID Spreadsheet atau URL Web App salah.');
              } else {
                setConnectionError('warning');
                const match = htmlStr.match(/<title>([\s\S]*?)<\/title>/i);
                const titleStr = match ? match[1].trim() : '';
                setConnectionDebugInfo(`Google Apps Script mengembalikan halaman HTML Error: "${titleStr || 'Kesalahan Server Google'}" (Masalah otorisasi atau Spreadsheet ID tidak sesuai).`);
              }
            } else {
              setConnectionError('offline_or_failed');
              setConnectionDebugInfo(errJson.message || 'Error yang dikembalikan dari penyedia data tidak dikenal.');
            }
            return false;
          }
        } catch (je) {
          // ignore parsing error
        }
        setConnectionDebugInfo(`Server returned HTTP ${response.status}: ${response.statusText}`);
        return false;
      }
      
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        const text = await response.text();
        if (text.includes('Script function not found') || text.includes('doGet') || text.includes('Error')) {
          setConnectionError('warning');
          setConnectionDebugInfo('Script function not found: doGet');
        } else {
          setConnectionError('cookie_blocked');
          setConnectionDebugInfo(`Expected JSON response, but received HTML data. This typically indicates that background cookies/session authorization are blocked or intercepted by a gateway.`);
        }
        return false;
      }

      const resJson = await response.json();
      if (resJson && resJson.status === 'success') {
        return true;
      } else {
        setConnectionDebugInfo(`Google Sheets API error details: ${resJson ? JSON.stringify(resJson) : 'empty response'}`);
        return false;
      }
    } catch (err: any) {
      console.warn('Google Sheets connection test failed through server proxy:', err);
      setConnectionDebugInfo(`Network Connection Error: ${err.message || String(err)}`);
      return false;
    }
  };

  const loadAppData = async () => {
    setConnectionStatus('checking');
    setConnectionError('');
    setConnectionDebugInfo('');
    setAppLoading(true);
    
    // First run connection check to verify if remote spreadsheet is successfully accessible
    const isSuccess = await testGoogleSheetsConnection();
    
    if (!isSuccess) {
      setConnectionStatus('offline');
      setAppLoading(false);
      return;
    }
    
    // Fetch data directly from Google Sheets using our secure direct backend connection
    try {
      const txs = await getTransactions();
      const users = await getUsers();
      setTransactions(txs);
      setUsersList(users);
      
      setConnectionStatus('online');
      setConnectionError('');
    } catch (err: any) {
      console.error('Error fetching data directly from Google Sheets:', err);
      setConnectionStatus('offline');
      setConnectionError('offline_or_failed');
      setConnectionDebugInfo(err.message || String(err));
    }
    
    setAppLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setAppLoading(true);
    
    try {
      // Reload up-to-date users from database connector (could be Sheets API)
      const users = await getUsers();
      setUsersList(users);
      
      const foundUser = users.find(
        u => u.username.toLowerCase() === loginUsername.trim().toLowerCase() && 
             u.password === loginPassword.trim()
      );

      if (foundUser) {
        setConnectionStatus('online');
        setConnectionError('');
        setConnectionDebugInfo('');
        setCurrentUser(foundUser);
        localStorage.setItem('greenhouse_active_user', JSON.stringify(foundUser));
        addActivityLog('LOGIN', `Berhasil melakukan login sistem dengan tingkat hak akses: ${foundUser.role}`);
        // Reset login inputs
        setLoginUsername('');
        setLoginPassword('');
        // Sync app data upon login
        const txs = await getTransactions();
        setTransactions(txs);
      } else {
        setLoginError('Username atau Password salah. Gunakan panduan login di bawah.');
      }
    } catch (err: any) {
      console.error('Manual login connection error:', err);
      setLoginError(`Gagal menghubungi Google Sheets. Pesan kesalahan: ${err.message || String(err)}`);
    } finally {
      setAppLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('greenhouse_active_user');
    setActiveTab('dashboard');
  };

  const handleAddTx = async (tx: Transaction): Promise<boolean> => {
    const ok = await addTransaction(tx);
    if (ok) {
      // Reload state directly
      const updated = await getTransactions();
      setTransactions(updated);
    }
    return ok;
  };

  const handleUpdateTx = async (tx: Transaction): Promise<boolean> => {
    const ok = await updateTransaction(tx);
    if (ok) {
      const updated = await getTransactions();
      setTransactions(updated);
    }
    return ok;
  };

  const handleDeleteTx = async (id: string): Promise<boolean> => {
    const ok = await deleteTransaction(id);
    if (ok) {
      const updated = await getTransactions();
      setTransactions(updated);
    }
    return ok;
  };

  const handleNavigateToRecords = (filters?: { project?: Project; type?: 'Inflow' | 'Outflow' }) => {
    setTxInitialFilters(filters);
    setActiveTab('keuangan');
  };

  // Nav item list based on roles
  const getNavItems = () => {
    if (!currentUser) return [];
    
    const role = currentUser.role;
    const items = [
      { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
      { id: 'keuangan', name: 'Transaksi', icon: ScrollText }
    ];

    if (role === 'Finance' || role === 'Admin') {
      items.push({ id: 'rekonsiliasi', name: 'Rekonsiliasi Uang Masuk', icon: CheckSquare });
    }

    if (role === 'Admin' || role === 'Finance' || role === 'Accounting') {
      items.push({ id: 'laporan', name: 'Laporan Laba Rugi', icon: FileBarChart2 });
      items.push({ id: 'proyek', name: 'Kelola Proyek', icon: Sprout });
      items.push({ id: 'akun', name: 'Kelola Akun', icon: Layers });
      items.push({ id: 'settings', name: 'Aturan Lampiran', icon: Settings });
    }

    if (role === 'Admin' || role === 'Accounting') {
      items.push({ id: 'neraca', name: 'Neraca Keuangan', icon: Scale });
      items.push({ id: 'analisis', name: 'Asisten Analisis AI', icon: BrainCircuit });
    }

    if (role === 'Admin') {
      items.push({ id: 'pengguna', name: 'Kelola Hak Akses', icon: Users2 });
    }

    if (role === 'Admin' || role === 'Accounting') {
      items.push({ id: 'logs', name: 'Log Aktivitas', icon: Shield });
    }

    items.push({ id: 'ubah-password', name: 'Ganti Password', icon: KeyRound });

    return items;
  };

  const navItems = getNavItems();

  const handlePasswordChanged = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('greenhouse_active_user', JSON.stringify(updatedUser));
    setUsersList(prev => prev.map(u => u.role === updatedUser.role ? updatedUser : u));
  };

  // Login view container
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full mx-auto space-y-6">
          
          {/* Brand header */}
          <div className="text-center">
            <div className="inline-flex p-3 bg-slate-900 text-white rounded-2xl shadow-sm mb-4">
              <Sprout className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-slate-800 tracking-tight leading-none">
              Keuangan Greenhouse
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1">Portal Pencatatan Keuangan</p>
            
            {/* Google Sheets Connection Status Badge */}
            {connectionStatus === 'checking' && (
              <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-100 text-[10px] bg-blue-50 text-blue-700 font-extrabold tracking-wide uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>Memeriksa Sinkronisasi Cloud...</span>
              </div>
            )}
            {connectionStatus === 'online' && connectionError === '' && (
              <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-100 text-[10px] bg-emerald-50 text-emerald-700 font-extrabold tracking-wide uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Sistem Cloud Terhubung</span>
              </div>
            )}
            {(connectionStatus === 'offline' || connectionError !== '') && (
              <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-rose-100 text-[10px] bg-rose-50 text-rose-700 font-extrabold tracking-wide uppercase max-w-full">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span className="truncate">Sistem Terputus / Periksa Konfigurasi</span>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="bg-white py-8 px-6 sm:px-10 border border-slate-200 rounded-3xl shadow-sm space-y-5">
            <h3 className="text-sm font-semibold text-slate-800 font-display">Masuk ke Portal Keuangan</h3>

            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <Shield className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {connectionStatus === 'offline' && connectionDebugInfo && (
              <div className="p-3.5 bg-rose-50/60 border border-rose-100 text-rose-800 rounded-2xl text-[11px] leading-relaxed">
                <div className="font-bold text-rose-900 mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Detail Diagnosis Masalah:</span>
                </div>
                <div className="font-mono text-[10px] bg-rose-100/50 p-2 rounded-xl border border-rose-150 break-words select-all whitespace-pre-wrap leading-normal text-rose-950 font-bold max-h-32 overflow-y-auto">
                  {connectionDebugInfo}
                </div>
                <p className="mt-1.5 text-[10.5px] text-rose-700">
                  Sistem tidak dapat memuat data transaksi. Silakan periksa kembali konfigurasi integrasi Google Sheets Anda atau hubungi admin jika masalah terus berlanjut.
                </p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-xs font-semibold text-slate-600">
              <div>
                <label className="block text-slate-500 mb-1">USERNAME LOGIN</label>
                <input
                  type="text"
                  required
                  disabled={appLoading}
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Masukkan username..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-0.5">PASSWORD</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={appLoading}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Masukkan password..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white pr-10 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    disabled={appLoading}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none disabled:opacity-50"
                    title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={appLoading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer active:scale-99 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                {appLoading ? "Mengecek & Menghubungkan..." : "Log In Sekarang"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const spacingClass = textSpacing === 'narrow' 
    ? 'view-spacing-narrow' 
    : textSpacing === 'compact' 
      ? 'view-spacing-compact' 
      : '';

  const fontSizeClass = textFontSize === 'large' 
    ? 'view-scaled-large' 
    : textFontSize === 'xl' 
      ? 'view-scaled-xl' 
      : '';

  const fontStyleClass = fontFamilyStyle === 'serif' 
    ? 'font-serif' 
    : fontFamilyStyle === 'mono' 
      ? 'font-mono' 
      : 'font-sans';

  const layoutClass = `layout-${layoutTemplate}`;

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col ${fontStyleClass} ${spacingClass} ${fontSizeClass} ${layoutClass}`}>
      
      {/* Custom accessibility style overrides for global font adjustment and tighter container padding/spacing */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Font size scale overrides */
        .view-scaled-large .text-\\[8px\\], 
        .view-scaled-large .text-\\[9px\\], 
        .view-scaled-large .text-\\[10px\\], 
        .view-scaled-large .text-\\[11px\\] { 
          font-size: 13.5px !important; 
        }
        .view-scaled-large .text-xs { font-size: 14.5px !important; }
        .view-scaled-large .text-sm { font-size: 16.5px !important; }
        .view-scaled-large .text-base { font-size: 18.5px !important; }
        .view-scaled-large .text-lg { font-size: 21.5px !important; }
        .view-scaled-large .text-xl { font-size: 24.5px !important; }
        .view-scaled-large .text-2xl { font-size: 28.5px !important; }
        .view-scaled-large .text-3xl { font-size: 34.5px !important; }

        .view-scaled-xl .text-\\[8px\\], 
        .view-scaled-xl .text-\\[9px\\], 
        .view-scaled-xl .text-\\[10px\\], 
        .view-scaled-xl .text-\\[11px\\] { 
          font-size: 15.5px !important; 
        }
        .view-scaled-xl .text-xs { font-size: 16.5px !important; }
        .view-scaled-xl .text-sm { font-size: 18.5px !important; }
        .view-scaled-xl .text-base { font-size: 21.5px !important; }
        .view-scaled-xl .text-lg { font-size: 24.5px !important; }
        .view-scaled-xl .text-xl { font-size: 28.5px !important; }
        .view-scaled-xl .text-2xl { font-size: 33.5px !important; }
        .view-scaled-xl .text-3xl { font-size: 41.5px !important; }

        /* Spacing & element density overrides (mempersempit jarak) */
        .view-spacing-narrow .p-4, .view-spacing-narrow .py-4, .view-spacing-narrow .px-4 { padding-top: 0.75rem !important; padding-bottom: 0.75rem !important; }
        .view-spacing-narrow .p-5, .view-spacing-narrow .py-5, .view-spacing-narrow .px-5 { padding-top: 0.9rem !important; padding-bottom: 0.9rem !important; }
        .view-spacing-narrow .p-6, .view-spacing-narrow .py-6, .view-spacing-narrow .px-6 { padding: 1.1rem !important; }
        .view-spacing-narrow .p-8, .view-spacing-narrow .py-8, .view-spacing-narrow .px-8 { padding: 1.4rem !important; }
        .view-spacing-narrow .gap-4 { gap: 0.75rem !important; }
        .view-spacing-narrow .gap-6 { gap: 1rem !important; }
        .view-spacing-narrow .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.75rem !important; }
        .view-spacing-narrow .space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 1rem !important; }
        .view-spacing-narrow .mb-6 { margin-bottom: 1rem !important; }
        .view-spacing-narrow .leading-relaxed { line-height: 1.35 !important; }
        .view-spacing-narrow .leading-normal { line-height: 1.25 !important; }
        .view-spacing-narrow td, .view-spacing-narrow th { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }

        .view-spacing-compact .p-4, .view-spacing-compact .py-4, .view-spacing-compact .px-4 { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
        .view-spacing-compact .p-5, .view-spacing-compact .py-5, .view-spacing-compact .px-5 { padding-top: 0.6rem !important; padding-bottom: 0.6rem !important; }
        .view-spacing-compact .p-6, .view-spacing-compact .py-6, .view-spacing-compact .px-6 { padding: 0.75rem !important; }
        .view-spacing-compact .p-8, .view-spacing-compact .py-8, .view-spacing-compact .px-8 { padding: 0.9rem !important; }
        .view-spacing-compact .gap-4 { gap: 0.5rem !important; }
        .view-spacing-compact .gap-6 { gap: 0.6rem !important; }
        .view-spacing-compact .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.5rem !important; }
        .view-spacing-compact .space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.6rem !important; }
        .view-spacing-compact .mb-6 { margin-bottom: 0.6rem !important; }
        .view-spacing-compact .leading-relaxed { line-height: 1.2 !important; }
        .view-spacing-compact .leading-normal { line-height: 1.15 !important; }
        .view-spacing-compact td, .view-spacing-compact th { padding-top: 0.35rem !important; padding-bottom: 0.35rem !important; }

        /* RADICAL LAYOUT STYLING DIFFERENCES */

        /* 1. Bento Eksekutif Layout overrides */
        .layout-topnav {
          background-color: var(--bg-main) !important;
        }
        .layout-topnav .bg-white {
          background-color: var(--bg-card) !important;
          border-radius: 24px !important;
          border: 1px solid var(--border-color) !important;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05) !important;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .layout-topnav .bg-white:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.08) !important;
        }

        /* 2. Konsol Data (High-Density / Tech style) Layout overrides */
        .layout-compact {
          background-color: var(--bg-main) !important;
          background-image: radial-gradient(var(--border-color) 0.5px, transparent 0.5px) !important;
          background-size: 16px 16px !important;
        }
        .layout-compact .bg-white {
          background-color: var(--bg-card) !important;
          border-radius: 5px !important;
          box-shadow: none !important;
          border: 1.5px solid var(--border-color) !important;
        }
        /* Make numeric data terminal-like */
        .layout-compact th, 
        .layout-compact td, 
        .layout-compact .text-2xl, 
        .layout-compact .text-3xl, 
        .layout-compact .text-xl,
        .layout-compact .font-bold,
        .layout-compact .font-semibold {
          font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace !important;
        }
        /* Extra visual density for Console View */
        .layout-compact td, .layout-compact th {
          padding-top: 0.3rem !important;
          padding-bottom: 0.3rem !important;
          padding-left: 0.5rem !important;
          padding-right: 0.5rem !important;
          font-size: 11px !important;
        }
        .layout-compact .p-6 {
          padding: 0.75rem !important;
        }
        .layout-compact .p-8 {
          padding: 1rem !important;
        }
        .layout-compact .gap-6 {
          gap: 0.75rem !important;
        }
        .layout-compact .mb-6 {
          margin-bottom: 0.75rem !important;
        }
      ` }} />

      {/* Top Header navbar control panel */}
      <Navbar 
        currentUser={currentUser.username}
        currentRole={currentUser.role}
        onLogout={handleLogout}
        config={dbConfig}
        textFontSize={textFontSize}
        textSpacing={textSpacing}
        onFontSizeChange={handleFontSizeChange}
        onSpacingChange={handleSpacingChange}
        connectionStatus={connectionStatus}
        sidebarPinned={sidebarPinned}
        onToggleSidebar={handleToggleSidebar}
        themeMode={themeMode}
        selectedTemplate={selectedTemplate}
        onThemeModeChange={handleThemeModeChange}
        onTemplateChange={handleTemplateChange}
        layoutTemplate={layoutTemplate}
        onLayoutTemplateChange={handleLayoutTemplateChange}
        fontFamilyStyle={fontFamilyStyle}
        onFontStyleChange={handleFontStyleChange}
      />

      {/* Render top horizontal navigation if layoutTemplate is topnav */}
      {layoutTemplate === 'topnav' && (
        <div className="bg-white border-b border-slate-200 shadow-xs sticky top-[61px] z-20 no-print hidden md:block">
          <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between">
            <nav className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (item.id !== 'keuangan') {
                        setTxInitialFilters(undefined);
                      }
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold select-none transition-all cursor-pointer whitespace-nowrap ${
                      isActive 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Akses: {currentUser.role}</span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive AI Studio Model parameter bar (Bento Eksekutif Layout) */}
      {layoutTemplate === 'topnav' && (
        <div className="bg-slate-900 border-b border-slate-800 text-slate-100 px-6 py-3 shadow-md no-print animate-in duration-200 slide-in-from-top-4 relative z-20">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* AI Model Parameter controllers */}
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-yellow-500 font-bold tracking-wider uppercase">
                <BrainCircuit className="w-4 h-4 animate-bounce" />
                <span>AI SYSTEM MODEL</span>
              </div>
              <div className="h-4 w-[1px] bg-slate-800 hidden sm:block"></div>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Model</span>
                <select 
                  value={aiModel} 
                  onChange={(e) => {
                    setAiModel(e.target.value);
                    localStorage.setItem('greenhouse_ai_model', e.target.value);
                  }}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1 focus:outline-none focus:border-yellow-500 font-mono transition-all"
                >
                  <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                  <option value="gemini-3.5-pro">gemini-3.5-pro</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Temp</span>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={aiTemperature} 
                  onChange={(e) => {
                    setAiTemperature(parseFloat(e.target.value));
                    localStorage.setItem('greenhouse_ai_temperature', e.target.value);
                  }}
                  className="w-20 accent-yellow-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-ew-resize"
                />
                <span className="text-xs text-slate-300 font-mono font-bold">{aiTemperature}</span>
              </div>
            </div>

            {/* Quick Prompt/Guidance context info */}
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
              Active Session Token: <span className="text-yellow-500 font-semibold uppercase font-mono">[{currentUser.role}]</span>
            </div>
          </div>
        </div>
      )}

      {/* Main responsive grid containing drawer and views */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* Mobile Navigation Bar */}
        <div className="md:hidden bg-white text-slate-800 px-6 py-3.5 flex justify-between items-center sticky top-[61px] z-30 border-b border-slate-200 shadow-xs no-print">
          <div className="flex items-center gap-2">
            <Menu className="w-5 h-5 text-slate-600 cursor-pointer" onClick={() => setMobileMenuOpen(true)} />
            <span className="text-xs font-semibold font-display tracking-wide uppercase text-slate-700">Menu Navigasi</span>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded uppercase font-bold">
            {currentUser.role}
          </span>
        </div>

        {/* Mobile Side Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 md:hidden transition-all">
            <div className="w-72 bg-white h-full p-6 flex flex-col justify-between text-slate-800 border-r border-slate-200 animate-in slide-in-from-left duration-200 shadow-xl">
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-xs">
                      <Sprout className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-display font-bold text-sm tracking-tight text-slate-900">Keuangan Greenhoue</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold font-display uppercase">
                    {currentUser.username[0]}
                  </div>
                  <div>
                    <span className="text-xs block capitalize font-bold leading-none text-slate-900">{currentUser.username}</span>
                    <span className="text-[9px] block text-emerald-700 font-bold uppercase mt-1 tracking-wider leading-none">Role: {currentUser.role}</span>
                  </div>
                </div>

                {/* Mobile Tab Items */}
                <nav className="space-y-1">
                  {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-xs font-medium transition-colors ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-700 font-semibold' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                        {item.name}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0 text-slate-400" />
                Sign Out / Logout
              </button>
            </div>
          </div>
        )}

        {/* Spacer Desktop Sidebar to keep layout stable while minimized are active */}
        {layoutTemplate === 'sidebar' && (
          <div 
            className={`hidden md:block shrink-0 transition-all duration-300 no-print ${
              sidebarPinned ? 'w-0' : 'w-16'
            }`}
          />
        )}

        {/* Stable Sidebar - Desktop View (Classical Panel) */}
        {layoutTemplate === 'sidebar' && (
          <aside 
            onMouseEnter={() => !sidebarPinned && setSidebarHovered(true)}
            onMouseLeave={() => !sidebarPinned && setSidebarHovered(false)}
            className={`bg-white text-slate-700 border-r border-slate-200 hidden md:flex flex-col justify-between shrink-0 no-print transition-all duration-300 ease-in-out z-30 ${
              sidebarPinned 
                ? 'md:sticky md:top-[61.5px] md:h-[calc(100vh-61.5px)] w-64' 
                : `fixed left-0 top-[61.5px] h-[calc(100vh-61.5px)] ${(sidebarPinned || sidebarHovered) ? 'w-64 shadow-xl bg-white' : 'w-16'}`
            }`}
          >
            {(() => {
              const isSidebarExpanded = sidebarPinned || sidebarHovered;
              return (
                <>
                  <div className={`space-y-6 transition-all duration-300 ${isSidebarExpanded ? 'p-6' : 'p-3'}`}>
                    <div className="pb-4 border-b border-slate-100">
                      <div className={`flex items-center gap-2.5 bg-slate-50 border border-slate-200 transition-all duration-300 ${
                        isSidebarExpanded ? 'p-2.5 rounded-xl' : 'p-1.5 rounded-lg justify-center'
                      }`}>
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow-xs shrink-0" title={`${currentUser.role} Access`}>
                          {currentUser.role[0]}
                        </div>
                        {isSidebarExpanded && (
                          <div className="leading-tight transition-opacity duration-300 animate-in fade-in">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wide">AKSES PANEL</span>
                            <span className="text-xs text-slate-800 font-bold block mt-0.5">{currentUser.role} Access</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Desktop Nav Items */}
                    <nav className="space-y-1">
                      {navItems.map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id);
                              // Reset initial filters if switching away from Keuangan
                              if (item.id !== 'keuangan') {
                                setTxInitialFilters(undefined);
                              }
                            }}
                            className={`w-full flex items-center justify-between transition-all duration-300 ${
                              isSidebarExpanded ? 'px-3 py-2 rounded-lg' : 'p-2 rounded-lg justify-center'
                            } text-left text-xs font-semibold tracking-wide transition-colors ${
                              isActive 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                            title={!isSidebarExpanded ? item.name : undefined}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                              {isSidebarExpanded && (
                                <span className="animate-in fade-in duration-300 whitespace-nowrap">{item.name}</span>
                              )}
                            </div>
                            {isActive && isSidebarExpanded && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></div>}
                          </button>
                        );
                      })}
                    </nav>
                  </div>

                  <div className={`border-t border-slate-100 transition-all duration-300 text-center text-[10px] text-slate-500 italic ${isSidebarExpanded ? 'p-6 space-y-2' : 'p-3 space-y-1'}`}>
                    {isSidebarExpanded && (
                      <div className="animate-in fade-in duration-200">Pencatatan Keuangan Greenhouse 2026</div>
                    )}
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-1.5 py-2 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-800 transition-colors border border-slate-200 mt-2 font-semibold text-[11px]"
                      title="Keluar Sistem"
                    >
                      <LogOut className="w-3.5 h-3.5 text-slate-400 shrink-0" /> 
                      {isSidebarExpanded && <span className="animate-in fade-in">Keluar Sistem</span>}
                    </button>
                  </div>
                </>
              );
            })()}
          </aside>
        )}

        {/* Dynamic Soft Bento Compact Navigation Sidebar (Konsol Sederhana) */}
        {layoutTemplate === 'compact' && (
          <aside className="bg-slate-50/90 dark:bg-slate-900/90 border-r border-slate-200/80 dark:border-slate-800/80 hidden md:flex flex-col shrink-0 no-print sticky top-[61.5px] h-[calc(100vh-61.5px)] w-[235px] select-none p-4 overflow-hidden">
            {/* Scrollable menu part with dedicated inner container */}
            <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 space-y-4">
              {/* Heading resembling modern SaaS dashboard */}
              <div className="pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold tracking-widest uppercase block mb-1 font-mono">
                  &bull; CONSOLE NAVIGATOR
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 tracking-tight font-sans uppercase">
                    KONSOL SEDERHANA
                  </span>
                </div>
              </div>

              {/* Elegant Bento List (1 Column of Rounded Rectangular Cards) */}
              <div className="flex flex-col gap-2 pt-1">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        if (item.id !== 'keuangan') {
                          setTxInitialFilters(undefined);
                        }
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 relative select-none text-left cursor-pointer group transform hover:-translate-y-0.5 hover:shadow-xs active:scale-95 ${
                        isActive 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 shadow-xs' 
                          : 'bg-white text-slate-600 border-slate-200/70 hover:bg-emerald-50/55 hover:text-emerald-700 hover:border-emerald-250/70 dark:bg-slate-950/20 dark:text-slate-400 dark:border-slate-800/50 dark:hover:bg-slate-900/40 dark:hover:text-slate-200 dark:hover:border-slate-800'
                      }`}
                    >
                      <div className={`p-2 rounded-xl transition-colors shrink-0 ${
                        isActive 
                          ? 'bg-emerald-200/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300' 
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-450 group-hover:bg-emerald-100/50 group-hover:text-emerald-700'
                      }`}>
                        <Icon className="w-4 h-4 shrink-0" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-bold tracking-tight leading-snug uppercase font-sans block break-words whitespace-normal">
                          {item.name}
                        </span>
                      </div>

                      {isActive && (
                        <div className="relative flex h-2 w-2 mr-1 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Logout Soft Rounded Button */}
            <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-3.5 mt-4 shrink-0">
              <button 
                onClick={handleLogout}
                className="w-full h-11 bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-200/45 dark:bg-rose-950/15 dark:hover:bg-rose-950/25 dark:text-rose-400 dark:border-rose-900/30 font-bold text-[10.5px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 rounded-2xl hover:shadow-xs active:scale-95 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>KELUAR SISTEM</span>
              </button>
            </div>
          </aside>
        )}

        {/* Dynamic View Main Panel */}
        <main className={`flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto print-p-0 ${layoutTemplate === 'topnav' ? 'max-w-7xl mx-auto w-full' : ''}`}>
          
          {/* Bento Eksekutif Layout: Google AI Studio Instructions Workspace */}
          {layoutTemplate === 'topnav' && (
            <div className="mb-6 bg-slate-900 border border-slate-800 text-slate-300 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between no-print animate-in duration-300 zoom-in-95">
              <div className="space-y-1 flex-1 w-full">
                <span className="text-[10px] text-yellow-500 font-extrabold tracking-widest uppercase block mb-1 font-mono">
                  &bull; SYSTEM INSTRUCTIONS
                </span>
                <textarea
                  value={systemInstructions}
                  onChange={(e) => {
                    setSystemInstructions(e.target.value);
                    localStorage.setItem('greenhouse_system_instructions', e.target.value);
                  }}
                  placeholder="Masukkan aturan operasional atau panduan audit AI untuk greenhouse ini..."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-yellow-500 max-h-24 leading-relaxed outline-none"
                  rows={2}
                />
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 shrink-0 flex flex-col gap-1 text-[11px] font-mono select-none w-full md:w-auto">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Rules Parser: AKTIF
                </span>
                <span className="text-slate-450 text-[9px] uppercase font-sans font-semibold mt-1">Sistem menyaring transaksi secara otomatis</span>
              </div>
            </div>
          )}



          {/* Sync indicator warning */}
          {appLoading && (
            <div className="p-3 mb-6 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-center text-xs text-blue-700 font-medium gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
              <span>Menyelaraskan data real-time dengan database Google Sheets cloud...</span>
            </div>
          )}

          {/* Render Views based on tab */}
          {activeTab === 'dashboard' && (
            <DashboardView 
              transactions={transactions} 
              onNavigateToRecords={handleNavigateToRecords}
              config={dbConfig}
              currentRole={currentUser.role}
            />
          )}

          {activeTab === 'keuangan' && (
            <TransactionView 
              transactions={transactions}
              currentRole={currentUser.role}
              currentUser={currentUser.username}
              onAddTransaction={handleAddTx}
              onUpdateTransaction={handleUpdateTx}
              onDeleteTransaction={handleDeleteTx}
              initialFilter={txInitialFilters}
              usersList={usersList}
            />
          )}

          {activeTab === 'rekonsiliasi' && (currentUser.role === 'Admin' || currentUser.role === 'Finance') && (
            <ReconciliationView 
              transactions={transactions}
              usersList={usersList}
              onUpdateTransaction={handleUpdateTx}
              currentRole={currentUser.role}
              currentUser={currentUser.username}
            />
          )}

          {activeTab === 'laporan' && (
            <ReportsView transactions={transactions} />
          )}

          {activeTab === 'neraca' && (currentUser.role === 'Admin' || currentUser.role === 'Accounting') && (
            <BalanceSheetView transactions={transactions} />
          )}

          {activeTab === 'analisis' && (
            <FinancialAnalysis transactions={transactions} />
          )}

          {activeTab === 'pengguna' && currentUser.role === 'Admin' && (
            <AdminUsersView />
          )}

          {activeTab === 'logs' && (currentUser.role === 'Admin' || currentUser.role === 'Accounting') && (
            <AdminLogsView currentRole={currentUser.role} />
          )}

          {activeTab === 'akun' && (currentUser.role === 'Admin' || currentUser.role === 'Finance' || currentUser.role === 'Accounting') && (
            <AdminAccountsView />
          )}

          {activeTab === 'proyek' && (currentUser.role === 'Admin' || currentUser.role === 'Finance' || currentUser.role === 'Accounting') && (
            <AdminProjectsView />
          )}

          {activeTab === 'ubah-password' && (
            <ChangePasswordView currentUser={currentUser} onPasswordChanged={handlePasswordChanged} />
          )}

          {activeTab === 'settings' && (currentUser.role === 'Admin' || currentUser.role === 'Finance' || currentUser.role === 'Accounting') && (
            <SystemSettingsView currentUsername={currentUser.username} currentRole={currentUser.role} />
          )}

        </main>

      </div>
    </div>
  );
}
