import React, { useState, useEffect } from 'react';
import { Role } from '../types';
import { addActivityLog } from '../utils/activityLogger';
import { 
  Sliders, Layout, Eye, EyeOff, Save, CheckCircle, RotateCcw, 
  TrendingUp, TrendingDown, Landmark, Percent, PieChart, BarChart3, 
  Layers, CheckSquare, Clock, ArrowRight, ShieldAlert
} from 'lucide-react';

export interface DashboardRoleConfig {
  showTotalInflow: boolean;
  showTotalOutflow: boolean;
  showNetProfit: boolean;
  showNetProfitMargin: boolean;
  showPieCharts: boolean;
  showBarCharts: boolean;
  showOpsSplit: boolean;
  showRecentActivity: boolean;
  showReconciliation: boolean;
}

export const DEFAULT_ROLE_CONFIGS: Record<Role, DashboardRoleConfig> = {
  Admin: {
    showTotalInflow: true,
    showTotalOutflow: true,
    showNetProfit: true,
    showNetProfitMargin: true,
    showPieCharts: true,
    showBarCharts: true,
    showOpsSplit: true,
    showRecentActivity: true,
    showReconciliation: true,
  },
  Finance: {
    showTotalInflow: true,
    showTotalOutflow: true,
    showNetProfit: true,
    showNetProfitMargin: true,
    showPieCharts: true,
    showBarCharts: true,
    showOpsSplit: true,
    showRecentActivity: true,
    showReconciliation: true,
  },
  Accounting: {
    showTotalInflow: true,
    showTotalOutflow: true,
    showNetProfit: true,
    showNetProfitMargin: true,
    showPieCharts: true,
    showBarCharts: true,
    showOpsSplit: true,
    showRecentActivity: true,
    showReconciliation: false,
  },
  Pengelola: {
    showTotalInflow: true,
    showTotalOutflow: true,
    showNetProfit: false,
    showNetProfitMargin: false,
    showPieCharts: true,
    showBarCharts: true,
    showOpsSplit: false,
    showRecentActivity: true,
    showReconciliation: false,
  }
};

export default function DashboardConfigView() {
  const [configs, setConfigs] = useState<Record<Role, DashboardRoleConfig>>(DEFAULT_ROLE_CONFIGS);
  const [activeRoleTab, setActiveRoleTab] = useState<Role>('Admin');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load configs on mount
  useEffect(() => {
    const saved = localStorage.getItem('greenhouse_dashboard_roles_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) {
          // Merge to avoid missing fields if any
          const mergedConfigs = { ...DEFAULT_ROLE_CONFIGS };
          (Object.keys(DEFAULT_ROLE_CONFIGS) as Role[]).forEach((role) => {
            if (parsed[role]) {
              mergedConfigs[role] = { ...DEFAULT_ROLE_CONFIGS[role], ...parsed[role] };
            }
          });
          setConfigs(mergedConfigs);
        }
      } catch (err) {
        console.error('Failed to parse dashboard role configs:', err);
      }
    }
  }, []);

  const handleToggle = (role: Role, key: keyof DashboardRoleConfig) => {
    setConfigs(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [key]: !prev[role][key]
      }
    }));
  };

  const handleSave = () => {
    setSaving(true);
    try {
      localStorage.setItem('greenhouse_dashboard_roles_config', JSON.stringify(configs));
      
      addActivityLog(
        'UBAH_PENGATURAN_DASHBOARD',
        `Admin mengubah tata letak / visibilitas dashboard untuk role user`
      );
      
      setSuccessMsg(`Konfigurasi Dashboard untuk seluruh role berhasil disimpan ke penyimpanan lokal!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      alert('Gagal menyimpan konfigurasi dashboard.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Apakah Anda yakin ingin memulihkan pengaturan visibilitas dashboard ke standar/default pabrik?')) {
      setConfigs(DEFAULT_ROLE_CONFIGS);
      localStorage.setItem('greenhouse_dashboard_roles_config', JSON.stringify(DEFAULT_ROLE_CONFIGS));
      setSuccessMsg('Pengaturan dashboard berhasil dipulihkan ke default!');
      setTimeout(() => setSuccessMsg(null), 4000);
      addActivityLog(
        'RESET_PENGATURAN_DASHBOARD',
        `Admin memulihkan tata letak / visibilitas dashboard ke setelan standar`
      );
    }
  };

  const displayRoles: { id: Role; label: string; desc: string }[] = [
    { id: 'Admin', label: 'Admin Utama', desc: 'Akses penuh seluruh konfigurasi kebun.' },
    { id: 'Finance', label: 'Finance / Verifikator', desc: 'Verifikasi keuangan & rekonsiliasi kas.' },
    { id: 'Accounting', label: 'Accounting / Akuntan', desc: 'Laporan neraca keuangan & laba rugi.' },
    { id: 'Pengelola', label: 'Pengelola Lapangan', desc: 'Pencatatan real-time di kebun greenhouse.' }
  ];

  const activeConf = configs[activeRoleTab];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Panel */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2.5 bg-indigo-650 text-white rounded-2xl">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Kelola Visibilitas Dashboard per Role
            </h1>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Atur widget, metrik ringkasan laba rugi, grafik bento-grid, dan panel verifikasi yang boleh dilihat oleh masing-masing Role User ketika membuka halaman Dashboard utama.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetToDefaults}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-205 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Set Standar
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4.5 py-2 bg-slate-950 text-white hover:bg-slate-800 disabled:opacity-50 rounded-xl text-xs font-extrabold transition-all shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      {/* Action Indicators */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex gap-3 text-xs leading-relaxed animate-slide-up">
          <CheckCircle className="w-4 h-4 text-emerald-605 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold text-emerald-900">Sukses!</span> {successMsg}
          </div>
        </div>
      )}

      {/* Main Settings Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Hand tab selector for roles */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-4 shadow-3xs space-y-2">
          <span className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase block px-2 mb-2 font-mono">
            PILIH ROLE USER
          </span>
          <div className="flex flex-col gap-1.5">
            {displayRoles.map((role) => {
              const isActive = activeRoleTab === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => setActiveRoleTab(role.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isActive 
                      ? 'bg-slate-950 text-white border-slate-950 shadow-md' 
                      : 'bg-white text-slate-700 border-transparent hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold block">{role.label}</span>
                    <span className={`text-[10px] block font-medium ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>{role.desc}</span>
                  </div>
                  <ArrowRight className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'transform translate-x-1 duration-300 text-emerald-400' : 'text-slate-350'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Hand detail editor */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-3xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">KONFIGURASI PANEL</span>
              <h2 className="text-sm font-bold text-slate-800">
                Fitur Dashboard untuk Role <span className="text-indigo-600">[{activeRoleTab}]</span>
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 border border-slate-150 text-[10px] font-bold text-slate-700 rounded-full">
              <Layout className="w-3.5 h-3.5" />
              Tingkat Akses {activeRoleTab}
            </span>
          </div>

          <div className="space-y-6">
            {/* Group 1: Bento Summary Metrics (Laba Rugi) */}
            <div className="space-y-3">
              <h3 className="text-xs text-slate-400 font-extrabold uppercase tracking-wider font-mono border-l-2 border-indigo-505 pl-2">
                Ringkasan Metrik Keuangan (Bento Grid)
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Total Inflow Switch */}
                <div className="p-3 bg-slate-50 hover:bg-slate-50/70 border border-slate-150 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800 block">Total Inflow</span>
                      <span className="text-[10px] text-slate-450 block">Arus kas masuk / Pendapatan</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeConf.showTotalInflow}
                    onChange={() => handleToggle(activeRoleTab, 'showTotalInflow')}
                    className="w-4 h-4 text-slate-950 border-slate-300 rounded focus:ring-slate-950 cursor-pointer"
                  />
                </div>

                {/* Total Outflow Switch */}
                <div className="p-3 bg-slate-50 hover:bg-slate-50/70 border border-slate-150 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                      <TrendingDown className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800 block">Total Outflow</span>
                      <span className="text-[10px] text-slate-450 block">Arus uang keluar / Belanja</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeConf.showTotalOutflow}
                    onChange={() => handleToggle(activeRoleTab, 'showTotalOutflow')}
                    className="w-4 h-4 text-slate-950 border-slate-300 rounded focus:ring-slate-950 cursor-pointer"
                  />
                </div>

                {/* Net Profit Switch */}
                <div className="p-3 bg-slate-50 hover:bg-slate-50/70 border border-slate-150 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800 block">Laba Bersih</span>
                      <span className="text-[10px] text-slate-450 block">Hasil saring Surplus / Defisit</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeConf.showNetProfit}
                    onChange={() => handleToggle(activeRoleTab, 'showNetProfit')}
                    className="w-4 h-4 text-slate-950 border-slate-300 rounded focus:ring-slate-950 cursor-pointer"
                  />
                </div>

                {/* Net Profit Margin Switch */}
                <div className="p-3 bg-slate-50 hover:bg-slate-50/70 border border-slate-150 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                      <Percent className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800 block">Margin Keuntungan</span>
                      <span className="text-[10px] text-slate-450 block">Rentabilitas perputaran modal</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeConf.showNetProfitMargin}
                    onChange={() => handleToggle(activeRoleTab, 'showNetProfitMargin')}
                    className="w-4 h-4 text-slate-950 border-slate-300 rounded focus:ring-slate-950 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Group 2: Visual Charts & Analytics */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs text-slate-400 font-extrabold uppercase tracking-wider font-mono border-l-2 border-indigo-505 pl-2">
                Grafik & visualisasi analitik (Data visualizers)
              </h3>

              <div className="space-y-3.5">
                {/* Pie Charts Proporsi */}
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-indigo-550" />
                      <h4 className="text-xs font-bold text-slate-800">Proporsi Alokasi Dana per Proyek (Pie Charts)</h4>
                    </div>
                    <p className="text-[10.5px] text-slate-450 leading-relaxed font-sans pr-4">Menampilkan porsi kontribusi (%) pemasukan dan pengeluaran kebun dalam diagram lingkaran konsentris.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeConf.showPieCharts}
                    onChange={() => handleToggle(activeRoleTab, 'showPieCharts')}
                    className="w-4 h-4 text-slate-950 border-slate-300 rounded focus:ring-slate-950 cursor-pointer shrink-0"
                  />
                </div>

                {/* Project Comparison Bar Charts */}
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-550" />
                      <h4 className="text-xs font-bold text-slate-800">Komparasi Arus Kas Proyek (Bar Charts)</h4>
                    </div>
                    <p className="text-[10.5px] text-slate-450 leading-relaxed font-sans pr-4">Menampilkan arus perbandingan langsung (Inflow vs Outflow) per masing-masing proyek greenhouse.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeConf.showBarCharts}
                    onChange={() => handleToggle(activeRoleTab, 'showBarCharts')}
                    className="w-4 h-4 text-slate-950 border-slate-300 rounded focus:ring-slate-950 cursor-pointer shrink-0"
                  />
                </div>

                {/* Operational Cost Split */}
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-550" />
                      <h4 className="text-xs font-bold text-slate-800">Sektor Biaya Operasional / Non-Operasional</h4>
                    </div>
                    <p className="text-[10.5px] text-slate-450 leading-relaxed font-sans pr-4">Menampilkan rincian rasio pembelanjaan operational langsung di kebun greenhouse dibanding biaya eksternal.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeConf.showOpsSplit}
                    onChange={() => handleToggle(activeRoleTab, 'showOpsSplit')}
                    className="w-4 h-4 text-slate-950 border-slate-300 rounded focus:ring-slate-950 cursor-pointer shrink-0"
                  />
                </div>
              </div>
            </div>

            {/* Group 3: Functional Lists & Tables */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs text-slate-400 font-extrabold uppercase tracking-wider font-mono border-l-2 border-indigo-505 pl-2">
                Tabel Aktivitas & Panel Verifikasi Kerja
              </h3>

              <div className="space-y-3.5">
                {/* Pending Inflows Reconciliation Panel - MANDATED BY USER */}
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-indigo-550" />
                      <h4 className="text-xs font-bold text-slate-800">Tabel Rekonsiliasi Uang Masuk Pending</h4>
                    </div>
                    <p className="text-[10.5px] text-slate-450 leading-relaxed font-sans pr-4">Menyajikan daftar setoran inflow dari Pengelola yang belum diverifikasi, lengkap dengan aksi check-off approval.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeConf.showReconciliation}
                    onChange={() => handleToggle(activeRoleTab, 'showReconciliation')}
                    className="w-4 h-4 text-slate-950 border-slate-300 rounded focus:ring-slate-950 cursor-pointer shrink-0"
                  />
                </div>

                {/* Recent Activity Table Preview */}
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-550" />
                      <h4 className="text-xs font-bold text-slate-800">Daftar Transaksi Terkini</h4>
                    </div>
                    <p className="text-[10.5px] text-slate-450 leading-relaxed font-sans pr-4">Daftar tabel 5 pencatatan transaksi keuangan greenhouse terbaru untuk meninjau log aktivitas keuangan.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeConf.showRecentActivity}
                    onChange={() => handleToggle(activeRoleTab, 'showRecentActivity')}
                    className="w-4 h-4 text-slate-950 border-slate-300 rounded focus:ring-slate-950 cursor-pointer shrink-0"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl text-[10.5px] leading-relaxed text-slate-500 font-medium flex gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              Setiap kali Anda menekan tombol <strong className="text-slate-800">"Simpan Perubahan"</strong> di pojok kanan atas, perubahan visibilitas akan segera memengaruhi tampilan Dasbor utama bagi pengguna dengan peran tersebut demi keamanan data rahasia kebun.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
