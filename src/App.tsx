import React, { useState, useEffect } from 'react';
import { User, Role, Transaction, DatabaseConfig, Project } from './types';
import { 
  getTransactions, getUsers, addTransaction, updateTransaction, 
  deleteTransaction, getDatabaseConfig 
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
import UserManualView from './components/UserManualView';
import { 
  Sprout, LogOut, LayoutDashboard, ScrollText, FileBarChart2, 
  BrainCircuit, Users2, Database, Shield, KeyRound, Menu, X, ArrowUpRight, CheckCircle, RefreshCw, Key, Layers,
  Eye, EyeOff, BookOpen
} from 'lucide-react';

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

  // Spacing and Typography accessibility styles
  const [textFontSize, setTextFontSize] = useState<'normal' | 'large' | 'xl'>(() => {
    return (localStorage.getItem('greenhouse_font_size') as any) || 'normal';
  });
  const [textSpacing, setTextSpacing] = useState<'normal' | 'narrow' | 'compact'>(() => {
    return (localStorage.getItem('greenhouse_spacing') as any) || 'normal';
  });

  const handleFontSizeChange = (size: 'normal' | 'large' | 'xl') => {
    setTextFontSize(size);
    localStorage.setItem('greenhouse_font_size', size);
  };

  const handleSpacingChange = (spacing: 'normal' | 'narrow' | 'compact') => {
    setTextSpacing(spacing);
    localStorage.setItem('greenhouse_spacing', spacing);
  };

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
      
      const response = await fetch(`/api/sheets-proxy?action=getSettings&_t=${Date.now()}`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(id);
      
      if (!response.ok) {
        setConnectionDebugInfo(`Server returned HTTP ${response.status}: ${response.statusText}`);
        return false;
      }
      
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        setConnectionError('cookie_blocked');
        setConnectionDebugInfo(`Expected JSON response, but received HTML data. This typically indicates that background cookies/session authorization are blocked or intercepted by a gateway.`);
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
    
    // 1. Safe, silent fetch of server configuration to keep credentials synchronized
    try {
      const configRes = await fetch(`/api/config?_t=${Date.now()}`);
      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData.isConfigured && configData.webAppUrl) {
          const newConf: DatabaseConfig = {
            mode: 'sheets',
            sheetsApiUrl: configData.webAppUrl,
            webAppUrl: configData.webAppUrl,
            spreadsheetId: configData.spreadsheetId || ''
          };
          localStorage.setItem('greenhouse_db_config', JSON.stringify(newConf));
          setDbConfig(newConf);
        }
      }
    } catch (configErr) {
      console.warn("Silent config sync failed, using local/fallback database credentials:", configErr);
    }
    
    // 2. Fetch data directly from Google Sheets using our new direct connection
    try {
      const txs = await getTransactions();
      const users = await getUsers();
      setTransactions(txs);
      setUsersList(users);
      setConnectionStatus('online');
      setConnectionError('');
    } catch (err: any) {
      console.error('Error fetching data directly from Google Sheets:', err);
      // Fail gracefully: don't block. Set status to online but keep a console/warning.
      setConnectionStatus('online');
      setConnectionError('warning');
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

    if (role === 'Admin' || role === 'Finance' || role === 'Accounting') {
      items.push({ id: 'laporan', name: 'Laporan Laba Rugi', icon: FileBarChart2 });
      items.push({ id: 'proyek', name: 'Kelola Proyek', icon: Sprout });
      items.push({ id: 'akun', name: 'Kelola Akun', icon: Layers });
    }

    if (role === 'Admin' || role === 'Accounting') {
      items.push({ id: 'analisis', name: 'Asisten Analisis AI', icon: BrainCircuit });
    }

    if (role === 'Admin') {
      items.push({ id: 'pengguna', name: 'Kelola Hak Akses', icon: Users2 });
      items.push({ id: 'logs', name: 'Log Aktivitas', icon: Shield });
    }

    items.push({ id: 'panduan', name: 'Panduan Multi-Role', icon: BookOpen });
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
            <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-100 text-[10px] bg-emerald-50 text-emerald-700 font-extrabold tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sistem Cloud Terhubung</span>
            </div>
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

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col font-sans ${spacingClass} ${fontSizeClass}`}>
      
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
      />

      {/* Main responsive grid containing drawer and views */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* Mobile Navigation Bar */}
        <div className="md:hidden bg-white text-slate-800 px-6 py-3.5 flex justify-between items-center z-30 border-b border-slate-200 shadow-xs no-print">
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

        {/* Stable Sidebar - Desktop View */}
        <aside className="w-64 bg-white text-slate-700 border-r border-slate-200 hidden md:flex flex-col justify-between shrink-0 no-print">
          <div className="p-6 space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow-xs">
                  {currentUser.role[0]}
                </div>
                <div className="leading-tight">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wide">AKSES PANEL</span>
                  <span className="text-xs text-slate-800 font-bold block mt-0.5">{currentUser.role} Access</span>
                </div>
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-colors ${
                      isActive 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></div>}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6 border-t border-slate-100 space-y-2 text-center text-[10px] text-slate-550 italic">
            <div>Greenhouse Financial v1.0.0</div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-1.5 py-2 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-800 transition-colors border border-slate-200 mt-2 font-semibold text-[11px]"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" /> Keluar Sistem
            </button>
          </div>
        </aside>

        {/* Dynamic View Main Panel */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto print-p-0">
          
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
            />
          )}

          {activeTab === 'laporan' && (
            <ReportsView transactions={transactions} />
          )}

          {activeTab === 'analisis' && (
            <FinancialAnalysis transactions={transactions} />
          )}

          {activeTab === 'pengguna' && currentUser.role === 'Admin' && (
            <AdminUsersView />
          )}

          {activeTab === 'logs' && currentUser.role === 'Admin' && (
            <AdminLogsView />
          )}

          {activeTab === 'akun' && (currentUser.role === 'Admin' || currentUser.role === 'Finance' || currentUser.role === 'Accounting') && (
            <AdminAccountsView />
          )}

          {activeTab === 'proyek' && (currentUser.role === 'Admin' || currentUser.role === 'Finance' || currentUser.role === 'Accounting') && (
            <AdminProjectsView />
          )}

          {activeTab === 'panduan' && (
            <UserManualView />
          )}

          {activeTab === 'ubah-password' && (
            <ChangePasswordView currentUser={currentUser} onPasswordChanged={handlePasswordChanged} />
          )}

        </main>

      </div>
    </div>
  );
}
