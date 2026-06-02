import React, { useState, useEffect } from 'react';
import { Transaction, Project, DatabaseConfig, Role, User } from '../types';
import { getProjects } from '../utils/db';
import { formatIndonesianDate } from '../utils/date';
import { isTxApproved } from '../utils/approvalHelper';
import { addActivityLog } from '../utils/activityLogger';
import { 
  TrendingUp, TrendingDown, Landmark, Percent, ArrowUpRight, 
  ArrowDownRight, CircleDollarSign, Calendar, SlidersHorizontal, CheckSquare,
  Image, Check, Clock, ShieldAlert, Loader2, RefreshCw, Lock, Unlock, Eye, EyeOff, HelpCircle
} from 'lucide-react';
import { DashboardRoleConfig } from './DashboardConfigView';

interface DashboardViewProps {
  transactions: Transaction[];
  onNavigateToRecords: (filters?: { project?: Project; type?: 'Inflow' | 'Outflow' }) => void;
  config: DatabaseConfig;
  currentRole?: Role;
  usersList?: User[];
  onUpdateTransaction?: (tx: Transaction) => Promise<boolean>;
  currentUser?: string;
}

export function getProjectHexColor(name: string): string {
  const norm = name.trim().toLowerCase();
  if (norm.includes('melon')) return '#10b981';       // Emerald green
  if (norm.includes('cabe') || norm.includes('cabai')) return '#f59e0b';        // Amber / Orange
  if (norm.includes('perikanan') || norm.includes('ikan')) return '#3b82f6';   // Blue
  if (norm.includes('ternak') || norm.includes('sapi') || norm.includes('kambing') || norm.includes('ayam') || norm.includes('hewan')) return '#a855f7';      // Purple
  if (
    norm.includes('greenhouse') || 
    norm.includes('green house') || 
    norm.includes('green-house') ||
    norm.includes('green') ||
    norm.includes('house')
  ) {
    return '#ef4444'; // Chili Red for Greenhouse variations
  }
  return '#ec4899'; // Pink/Magenta for any other dynamic project
}

export function getProjectBadgeClass(name: string): string {
  const norm = name.trim().toLowerCase();
  if (norm.includes('melon')) return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
  if (norm.includes('cabe') || norm.includes('cabai')) return 'bg-amber-50 text-amber-700 border border-amber-100';
  if (norm.includes('perikanan') || norm.includes('ikan')) return 'bg-blue-50 text-blue-700 border border-blue-105';
  if (norm.includes('ternak') || norm.includes('sapi') || norm.includes('kambing') || norm.includes('ayam') || norm.includes('hewan')) return 'bg-purple-50 text-purple-700 border border-purple-100';
  if (
    norm.includes('greenhouse') || 
    norm.includes('green house') || 
    norm.includes('green-house') ||
    norm.includes('green') ||
    norm.includes('house')
  ) {
    return 'bg-red-50 text-red-700 border border-red-100';
  }
  return 'bg-pink-50 text-pink-700 border border-pink-100';
}

interface PieSlice {
  name: string;
  amount: number;
  color: string;
}

function ProjectPieChart({ 
  title, 
  data, 
  totalAmount, 
  type 
}: { 
  title: string; 
  data: PieSlice[]; 
  totalAmount: number;
  type: 'Inflow' | 'Outflow';
}) {
  const activeData = data.filter(d => d.amount > 0);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  
  const chartTotal = activeData.reduce((sum, d) => sum + d.amount, 0);
  
  if (chartTotal === 0 || activeData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 h-52">
        <span className="text-xs text-slate-400 font-semibold tracking-wide">
          Tidak ada data {type === 'Inflow' ? 'pemasukan' : 'pengeluaran'}
        </span>
      </div>
    );
  }

  const baseRadius = 42;
  const numRings = activeData.length;
  const spacing = numRings > 1 ? Math.min(7.5, 18 / (numRings - 1)) : 0;
  const strokeWidth = numRings > 4 ? 3.5 : 4.5;

  const segments = activeData.map((slice, i) => {
    const percentage = chartTotal > 0 ? (slice.amount / chartTotal) : 0;
    const ringRadius = baseRadius - (i * spacing);
    const circumference = 2 * Math.PI * ringRadius;
    const strokeLength = percentage * circumference;
    const strokeOffset = circumference - strokeLength;
    return {
      ...slice,
      percentage,
      ringRadius,
      circumference,
      strokeLength,
      strokeOffset,
    };
  });

  const activeHoveredSlice = hoveredName ? activeData.find(d => d.name === hoveredName) : null;
  const activeHoveredPercent = activeHoveredSlice ? (activeHoveredSlice.amount / chartTotal) * 100 : 0;

  return (
    <div className="bg-slate-50/30 hover:bg-slate-50/70 p-5 rounded-2xl border border-slate-150 transition-all duration-300 flex flex-col md:flex-row items-center gap-6 justify-center w-full shadow-xs">
      {/* SVG Concentric Donut Container with Hover Dynamics */}
      <div className="relative w-36 h-36 flex-shrink-0 select-none">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {segments.map((slice) => {
            const isHovered = hoveredName === slice.name;
            const isAnyHovered = hoveredName !== null;
            return (
              <g key={slice.name}>
                {/* Background Track Circle */}
                <circle
                  cx="50"
                  cy="50"
                  r={slice.ringRadius}
                  fill="transparent"
                  stroke="#e2e8f0"
                  strokeWidth={strokeWidth}
                  className="opacity-40 transition-opacity duration-300"
                  style={{
                    opacity: isAnyHovered ? (isHovered ? 0.6 : 0.2) : 0.4
                  }}
                />
                {/* Concentric Progress Circle */}
                <circle
                  cx="50"
                  cy="50"
                  r={slice.ringRadius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                  strokeDasharray={`${slice.circumference}`}
                  strokeDashoffset={slice.strokeOffset}
                  strokeLinecap="round"
                  onMouseEnter={() => setHoveredName(slice.name)}
                  onMouseLeave={() => setHoveredName(null)}
                  className="cursor-pointer transition-all duration-300 origin-center"
                  style={{ 
                    transformOrigin: '50% 50%',
                    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                    opacity: isAnyHovered ? (isHovered ? 1 : 0.45) : 0.95,
                    filter: isHovered ? `drop-shadow(0px 0px 3px ${slice.color}44)` : 'none'
                  }}
                />
              </g>
            );
          })}
        </svg>
        
        {/* Absolute Centered Legend Text - Dynamic based on hovering */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2.5 pointer-events-none">
          {activeHoveredSlice ? (
            <div className="animate-fade-in flex flex-col items-center justify-center">
              <span 
                className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full mb-0.5 inline-block text-white font-sans max-w-[85px] truncate" 
                style={{ backgroundColor: activeHoveredSlice.color }}
                title={activeHoveredSlice.name}
              >
                {activeHoveredSlice.name}
              </span>
              <span className="text-[14px] font-black text-slate-800 font-mono leading-none my-0.5">
                {activeHoveredPercent.toFixed(1)}%
              </span>
              <span className="text-[9.5px] text-slate-500 font-bold font-mono leading-none">
                {activeHoveredSlice.amount >= 1000000 
                  ? `Rp ${(activeHoveredSlice.amount / 1000000).toFixed(1)}Jt` 
                  : `Rp ${(activeHoveredSlice.amount / 1000).toFixed(0)}rb`}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-widest leading-none">TOTAL</span>
              <span className="text-[13px] font-black text-slate-700 font-mono mt-1" title={`Rp ${chartTotal.toLocaleString('id-ID')}`}>
                {chartTotal >= 1000000 
                  ? `Rp ${(chartTotal / 1000000).toFixed(1)}Jt` 
                  : `Rp ${(chartTotal / 1000).toFixed(0)}rb`}
              </span>
              <span className="text-[7.5px] text-slate-400 font-semibold uppercase mt-0.5 tracking-wider">
                {type === 'Inflow' ? 'Pemasukan' : 'Pengeluaran'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Legend / Stats with Compact Interactive Cards */}
      <div className="flex-1 space-y-2.5 w-full">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">
          {title}
        </p>
        <div className="space-y-1.5">
          {data.map((item) => {
            const isHovered = hoveredName === item.name;
            const isAnyHovered = hoveredName !== null;
            const percentage = chartTotal > 0 ? (item.amount / chartTotal) * 100 : 0;
            return (
              <div 
                key={item.name} 
                onMouseEnter={() => setHoveredName(item.name)}
                onMouseLeave={() => setHoveredName(null)}
                className={`group px-2 py-1.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                  isHovered 
                    ? 'bg-slate-100/50 border-slate-200/80 shadow-xs scale-[1.01]' 
                    : 'bg-transparent border-transparent'
                }`}
                style={{
                  opacity: isAnyHovered ? (isHovered ? 1 : 0.5) : 1
                }}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className="w-2.5 h-1 rounded-full shrink-0 shadow-xs group-hover:scale-y-125 transition-transform" 
                      style={{ backgroundColor: item.color }} 
                    />
                    <span className="text-slate-600 font-bold truncate text-[11px] group-hover:text-slate-900 transition-colors">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-right font-mono flex items-center gap-1.5">
                    <span className="text-slate-400 text-[10px] font-medium">({percentage.toFixed(0)}%)</span>
                    <span className="font-bold text-slate-700 text-[11px] group-hover:text-slate-900 transition-colors">
                      Rp {item.amount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Micro Gauge Line */}
                <div className="w-full h-1 bg-slate-100/80 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500 ease-out" 
                    style={{ 
                      width: `${percentage}%`, 
                      backgroundColor: item.color,
                      opacity: isHovered ? 1 : 0.65
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const DEFAULT_ROLE_CONFIGS: Record<Role, DashboardRoleConfig> = {
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

export default function DashboardView({ 
  transactions, 
  onNavigateToRecords, 
  config, 
  currentRole,
  usersList = [],
  onUpdateTransaction,
  currentUser = 'System'
}: DashboardViewProps) {
  const [selectedTimeline, setSelectedTimeline] = useState<'all' | '30days' | '7days'>('all');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<Project | 'All'>('All');
  const [projectsList, setProjectsList] = useState<string[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Load custom dashboard config for the current role
  const [dashboardConfig, setDashboardConfig] = useState<DashboardRoleConfig>(() => {
    const saved = localStorage.getItem('greenhouse_dashboard_roles_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && currentRole && parsed[currentRole]) {
          return parsed[currentRole];
        }
      } catch (err) {}
    }
    return DEFAULT_ROLE_CONFIGS[currentRole || 'Pengelola'] || DEFAULT_ROLE_CONFIGS['Pengelola'];
  });

  // Re-load configurations if current role changes, or on mount
  useEffect(() => {
    const saved = localStorage.getItem('greenhouse_dashboard_roles_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && currentRole && parsed[currentRole]) {
          setDashboardConfig(parsed[currentRole]);
          return;
        }
      } catch (err) {}
    }
    setDashboardConfig(DEFAULT_ROLE_CONFIGS[currentRole || 'Pengelola'] || DEFAULT_ROLE_CONFIGS['Pengelola']);
  }, [currentRole]);

  useEffect(() => {
    const loadProjs = async () => {
      try {
        const list = await getProjects();
        setProjectsList(list.map(p => p.name));
      } catch (e) {
        console.error('Failed to load projects on dashboard:', e);
      }
    };
    loadProjs();
  }, []);

  // Helper to check if transaction is from Pengelola
  const isFromPengelola = (tx: Transaction) => {
    const recLower = (tx.recordedBy || '').toLowerCase();
    if (recLower === 'pengelola') return true;
    const matchUser = usersList.find(u => u.username.toLowerCase() === recLower);
    return matchUser?.role === 'Pengelola';
  };

  // List of all inflows submitted by a Pengelola role but still Pending approval
  const pendingReconciliationInflows = transactions.filter(
    t => t.type === 'Inflow' && !isTxApproved(t) && isFromPengelola(t)
  );

  // Handler for quick-approving reconciliation item directly on the dashboard
  const handleQuickApprove = async (tx: Transaction) => {
    if (currentRole !== 'Finance' && currentRole !== 'Admin') {
      alert('Hanya role Finance dan Admin yang berwenang melakukan rekonsiliasi data.');
      return;
    }

    setUpdatingId(tx.id);

    const newEntry = {
      editedAt: new Date().toISOString(),
      editedBy: `${currentUser} (${currentRole})`,
      changes: `Persetujuan: dari "BELUM DISETUJUI" menjadi "DISETUJUI" (Rekonsiliasi Cepat via Dashboard)`
    };

    let prevHistory = [];
    if (tx.editHistory) {
      try {
        prevHistory = JSON.parse(tx.editHistory);
        if (!Array.isArray(prevHistory)) prevHistory = [];
      } catch (e) {
        prevHistory = [];
      }
    }
    const updatedHistory = [newEntry, ...prevHistory];
    const updatedHistoryString = JSON.stringify(updatedHistory);

    const updatedTx: Transaction = {
      ...tx,
      isApproved: true,
      editHistory: updatedHistoryString
    };

    try {
      if (onUpdateTransaction) {
        const success = await onUpdateTransaction(updatedTx);
        if (success) {
          addActivityLog(
            'REKONSILIASI_SETUJU',
            `${currentRole} melakukan rekonsiliasi cepat Uang Masuk (Inflow) transaksi ${tx.id} senilai Rp ${tx.amount.toLocaleString('id-ID')} (Proyek ${tx.project}) via Dasbor`
          );
        } else {
          alert('Gagal memperbarui status rekonsiliasi.');
        }
      }
    } catch (err: any) {
      alert(`Error: ${err.message || String(err)}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter transactions based on timeline selection
  const now = new Date();
  const getFilteredTransactions = () => {
    let list = [...transactions];
    
    // Time filter
    if (selectedTimeline === '30days') {
      const limit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      list = list.filter(t => new Date(t.date) >= limit);
    } else if (selectedTimeline === '7days') {
      const limit = new Date(now.getTime() - 7 * 24 * 60 * 65 * 1000);
      list = list.filter(t => new Date(t.date) >= limit);
    }

    // Project filter
    if (selectedProjectFilter !== 'All') {
      list = list.filter(t => t.project === selectedProjectFilter);
    }

    return list;
  };

  const filteredTxs = getFilteredTransactions();

  // Basic stats
  const inflows = filteredTxs.filter(t => t.type === 'Inflow' && isTxApproved(t));
  const outflows = filteredTxs.filter(t => t.type === 'Outflow');

  const totalInflow = inflows.reduce((sum, t) => sum + t.amount, 0);
  const totalOutflow = outflows.reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalInflow - totalOutflow;
  const netProfitMargin = totalInflow > 0 ? (netProfit / totalInflow) * 100 : 0;

  // Project breakdown calculations
  const projects: Project[] = projectsList.length > 0 ? projectsList : ['Melon', 'Cabe', 'Perikanan', 'Ternak'];
  const projectStats = projects.map(proj => {
    const pTxs = filteredTxs.filter(t => t.project === proj);
    const pIn = pTxs.filter(t => t.type === 'Inflow' && isTxApproved(t)).reduce((sum, t) => sum + t.amount, 0);
    const pOut = pTxs.filter(t => t.type === 'Outflow').reduce((sum, t) => sum + t.amount, 0);
    const pNet = pIn - pOut;
    const pMargin = pIn > 0 ? (pNet / pIn) * 100 : 0;
    return {
      name: proj,
      inflow: pIn,
      outflow: pOut,
      net: pNet,
      margin: pMargin,
      count: pTxs.length
    };
  });

  // Category breakdown calculations (Operational vs Non-Operational)
  const opsInflow = filteredTxs.filter(t => t.type === 'Inflow' && isTxApproved(t) && t.category === 'Operational').reduce((sum, t) => sum + t.amount, 0);
  const opsOutflow = filteredTxs.filter(t => t.type === 'Outflow' && t.category === 'Operational').reduce((sum, t) => sum + t.amount, 0);
  const nonOpsInflow = filteredTxs.filter(t => t.type === 'Inflow' && isTxApproved(t) && t.category === 'Non-Operational').reduce((sum, t) => sum + t.amount, 0);
  const nonOpsOutflow = filteredTxs.filter(t => t.type === 'Outflow' && t.category === 'Non-Operational').reduce((sum, t) => sum + t.amount, 0);

  // Maximum value for charting scaling
  const maxProjectCashInput = Math.max(...projectStats.map(p => Math.max(p.inflow, p.outflow)), 1);

  // Recent 5 transactions list
  const recentTxs = [...filteredTxs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* Header filter controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter Ringkasan</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Timeline filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setSelectedTimeline('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${selectedTimeline === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Semua Waktu
            </button>
            <button
              onClick={() => setSelectedTimeline('30days')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${selectedTimeline === '30days' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              30 Hari Terakhir
            </button>
            <button
              onClick={() => setSelectedTimeline('7days')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${selectedTimeline === '7days' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              7 Hari Terakhir
            </button>
          </div>

          {/* Project Filters */}
          <select
            value={selectedProjectFilter}
            onChange={(e) => setSelectedProjectFilter(e.target.value as Project | 'All')}
            className="px-3 py-1.5 bg-slate-100 border-none rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-slate-300 pointer-events-auto"
          >
            <option value="All">Semua Proyek</option>
            {projects.map(proj => (
              <option key={proj} value={proj}>Proyek {proj}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Financial Bento Matrix Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-sans">
        
        {/* TOTAL INFLOW */}
        {dashboardConfig.showTotalInflow ? (
          <div 
            onClick={() => onNavigateToRecords({ type: 'Inflow' })}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-emerald-300 hover:shadow-xs transition-all duration-300 animate-fade-in"
          >
            <div className="flex justify-between items-start col-span-1">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                <ArrowUpRight className="w-3" /> INFLOW
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs text-slate-500 font-medium">Uang Masuk / Pendapatan</p>
              <h3 className="text-xl lg:text-2xl font-display font-extrabold text-slate-800 mt-1 font-mono">
                Rp {totalInflow.toLocaleString('id-ID')}
              </h3>
            </div>
            <div className="mt-3 text-[10px] text-slate-400">
              Dari {inflows.length} transaksi pencatatan
            </div>
          </div>
        ) : null}

        {/* TOTAL OUTFLOW */}
        {dashboardConfig.showTotalOutflow ? (
          <div 
            onClick={() => onNavigateToRecords({ type: 'Outflow' })}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-rose-300 hover:shadow-xs transition-all duration-300 animate-fade-in"
          >
            <div className="flex justify-between items-start col-span-1">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <TrendingDown className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                <ArrowDownRight className="w-3" /> OUTFLOW
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs text-slate-500 font-medium">Uang Keluar / Pengeluaran</p>
              <h3 className="text-xl lg:text-2xl font-display font-extrabold text-slate-800 mt-1 font-mono">
                Rp {totalOutflow.toLocaleString('id-ID')}
              </h3>
            </div>
            <div className="mt-3 text-[10px] text-slate-400">
              Terbagi dalam {outflows.length} transaksi pembelanjaan
            </div>
          </div>
        ) : null}

        {/* NET PROFIT */}
        {dashboardConfig.showNetProfit ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs animate-fade-in">
            <div className="flex justify-between items-start col-span-1">
              <div className={`p-3 rounded-xl ${netProfit >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                <Landmark className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                netProfit >= 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {netProfit >= 0 ? 'SURPLUS' : 'DEFISIT'}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs text-slate-500 font-medium font-display">Laba Bersih (Net Profit)</p>
              <h3 className={`text-xl lg:text-2xl font-display font-extrabold mt-1 font-mono ${
                netProfit >= 0 ? 'text-slate-800' : 'text-rose-600'
              }`}>
                Rp {netProfit.toLocaleString('id-ID')}
              </h3>
            </div>
            <div className="mt-3 text-[10px] text-slate-400">
              Selisih arus pendapatan dan biaya
            </div>
          </div>
        ) : null}

        {/* NET PROFIT MARGIN */}
        {dashboardConfig.showNetProfitMargin ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs animate-fade-in">
            <div className="flex justify-between items-start col-span-1">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Percent className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                RENTABILITAS
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs text-slate-500 font-medium font-display">Margin Keuntungan</p>
              <h3 className="text-xl lg:text-2xl font-display font-extrabold text-slate-800 mt-1 font-mono">
                {netProfitMargin.toFixed(1)}%
              </h3>
            </div>
            <div className="mt-3 text-[10px] text-slate-400">
              Rasio laba dibanding total uang masuk
            </div>
          </div>
        ) : null}
      </div>

      {/* Pie Charts Breakdown Section */}
      {dashboardConfig.showPieCharts && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 animate-fade-in">
          <div>
            <h3 className="font-display font-bold text-slate-800 text-[15px]">Proporsi Alokasi Dana per Proyek</h3>
            <p className="text-xs text-slate-500">Persentase kontribusi proyek terhadap total Pemasukan (In-Flow) dan Pengeluaran (Out-Flow).</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProjectPieChart 
              title="Porsi Kontribusi Pemasukan (In-Flow)" 
              data={projectStats.map(p => ({
                name: p.name,
                amount: p.inflow,
                color: getProjectHexColor(p.name)
              }))}
              totalAmount={totalInflow}
              type="Inflow"
            />
            <ProjectPieChart 
              title="Porsi Distribusi Pengeluaran (Out-Flow)" 
              data={projectStats.map(p => ({
                name: p.name,
                amount: p.outflow,
                color: getProjectHexColor(p.name)
              }))}
              totalAmount={totalOutflow}
              type="Outflow"
            />
          </div>
        </div>
      )}

      {/* Visual Analytics Charts Section */}
      {(dashboardConfig.showBarCharts || dashboardConfig.showOpsSplit) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in font-sans">
          
          {/* Project Comparison Chart (SVG Native) */}
          {dashboardConfig.showBarCharts ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 space-y-4">
              <div>
                <h3 className="font-display font-bold text-slate-800 text-[14px]">Arus Pendapatan & Pengeluaran</h3>
                <p className="text-xs text-slate-500">Perbandingan pemasukan vs pengeluaran langsung antar semua unit proyek.</p>
              </div>

              <div className="pt-2 space-y-6">
                {projectStats.map(p => {
                  const inPct = (p.inflow / maxProjectCashInput) * 100;
                  const outPct = (p.outflow / maxProjectCashInput) * 100;
                  const netIsPositive = p.net >= 0;

                  return (
                    <div key={p.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getProjectHexColor(p.name) }}></span>
                          <span className="text-xs font-semibold text-slate-700 font-display">Proyek {p.name}</span>
                          <span className="text-[10px] text-slate-405">({p.count} tx)</span>
                        </div>
                        <span className={`text-[10px] font-bold ${netIsPositive ? 'text-emerald-700' : 'text-rose-600'}`}>
                          Laba Bersih: Rp {p.net.toLocaleString('id-ID')}
                        </span>
                      </div>

                      {/* Horizontal Bar Chart representation */}
                      <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {/* Inflow bar */}
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[9px] text-slate-550 font-mono">
                            <span>Pemasukan: Rp {p.inflow.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="w-full h-2 bg-slate-200/50 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(inPct, 1.5)}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Outflow bar */}
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[9px] text-slate-550 font-mono">
                            <span>Pengeluaran: Rp {p.outflow.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="w-full h-2 bg-slate-200/50 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-rose-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(outPct, 1.5)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Operational Split & Distribution */}
          {dashboardConfig.showOpsSplit ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-800 text-[14px]">Sektor Biaya Operasional</h3>
                <p className="text-xs text-slate-500">Breakdown pembelanjaan operasional kebun vs non-operasional.</p>
              </div>

              {/* Graphical donut comparison representation using custom styled metrics */}
              <div className="py-2 space-y-4 flex-1 flex flex-col justify-center">
                {/* Operational distribution info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Operasional Kebun</span>
                    <div className="mt-2">
                      <span className="text-xs block text-slate-400">Total Biaya:</span>
                      <span className="text-sm font-bold font-mono text-slate-800 block">Rp {opsOutflow.toLocaleString('id-ID')}</span>
                    </div>
                    {/* Ratio percent */}
                    <div className="mt-2 text-[10px] text-slate-500 font-medium">
                      {totalOutflow > 0 ? ((opsOutflow / totalOutflow) * 100).toFixed(0) : 0}% Pengeluaran
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Non-Operasional</span>
                    <div className="mt-2">
                      <span className="text-xs block text-slate-400">Total Biaya:</span>
                      <span className="text-sm font-bold font-mono text-slate-800 block">Rp {nonOpsOutflow.toLocaleString('id-ID')}</span>
                    </div>
                    {/* Ratio percent */}
                    <div className="mt-2 text-[10px] text-slate-500 font-medium">
                      {totalOutflow > 0 ? ((nonOpsOutflow / totalOutflow) * 100).toFixed(0) : 0}% Pengeluaran
                    </div>
                  </div>
                </div>

                {/* Inflow Category split */}
                <div className="space-y-2 mt-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distribusi Pendapatan</h4>
                  <div className="w-full h-3.5 bg-slate-100 rounded-full flex overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-500" 
                      style={{ width: `${totalInflow > 0 ? (opsInflow / totalInflow) * 100 : 50}%` }}
                      title="Operasional"
                    ></div>
                    <div 
                      className="bg-amber-400 h-full transition-all duration-500" 
                      style={{ width: `${totalInflow > 0 ? (nonOpsInflow / totalInflow) * 100 : 50}%` }}
                      title="Non-Operasional"
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                      Op: Rp {opsInflow.toLocaleString('id-ID')}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block"></span>
                      Non-Op: Rp {nonOpsInflow.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 text-[10px] text-slate-450 italic">
                *Pengelola hanya diperbolehkan menginput transaksi operasional kebun directly.
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Rekonsiliasi Uang Masuk Pending (Table Dashboard) - MANDATED BY USER */}
      {dashboardConfig.showReconciliation && (
        <div id="quick-reconciliation-panel" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 animate-fade-in no-print font-sans">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-650" />
                <h3 className="font-display font-bold text-slate-800 text-[15px]">Rekonsiliasi Uang Masuk Pending</h3>
              </div>
              <p className="text-xs text-slate-500">
                Pencatatan kas masuk dari <span className="font-bold text-indigo-605">Pengelola Lapangan</span> yang perlu peninjauan, rekonsiliasi, dan persetujuan.
              </p>
            </div>
            <div className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 border border-amber-100 rounded-xl font-bold font-mono">
              {pendingReconciliationInflows.length} Transaksi Pending
            </div>
          </div>

          {pendingReconciliationInflows.length === 0 ? (
            <div className="text-center py-10 bg-emerald-50/20 border border-dashed border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex flex-col items-center justify-center gap-1.5 p-6 animate-fade-in">
              <Check className="w-7 h-7 text-emerald-600 stroke-[3] bg-emerald-100 p-1 rounded-full shrink-0" />
              <span>Semua setoran uang masuk reguler telah sepenuhnya direkonsiliasi. Kerja bagus!</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold text-slate-405 tracking-wider uppercase">
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Proyek</th>
                    <th className="py-3 px-4">Akun COA</th>
                    <th className="py-3 px-4 text-right">Nominal</th>
                    <th className="py-3 px-4">Keterangan</th>
                    <th className="py-3 px-4">Dicatat Oleh</th>
                    <th className="py-3 px-4 text-center">Bukti Lampiran</th>
                    <th className="py-3 px-4 text-center">Aksi Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-slate-650 divide-y divide-slate-100">
                  {pendingReconciliationInflows.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/40 transition-colors bg-white">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-500 whitespace-nowrap">{t.date}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold ${getProjectBadgeClass(t.project)}`}>
                          {t.project}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">{t.account || 'Inflow'}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 whitespace-nowrap">
                        Rp {t.amount.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-[150px] truncate" title={t.description}>
                        {t.description || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">{t.recordedBy}</td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {t.image && (
                            <button
                              onClick={() => setLightboxImage(t.image || null)}
                              className="p-1 px-1.5 bg-slate-50 border border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 rounded-lg transition-all cursor-pointer"
                              title="Tampilkan Bukti Lampiran Pertama"
                            >
                              <Image className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {t.image2 && (
                            <button
                              onClick={() => setLightboxImage(t.image2 || null)}
                              className="p-1 px-1.5 bg-slate-50 border border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 rounded-lg transition-all cursor-pointer"
                              title="Tampilkan Bukti Lampiran Kedua"
                            >
                              <Image className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!t.image && !t.image2 && <span className="text-slate-350 italic text-[11px]">-</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {currentRole === 'Admin' || currentRole === 'Finance' ? (
                          <button
                            onClick={() => handleQuickApprove(t)}
                            disabled={updatingId === t.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-[10.5px] font-bold transition-all shadow-xs cursor-pointer"
                          >
                            {updatingId === t.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                            )}
                            Setujui
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md font-bold">
                            <Clock className="w-3 h-3" />
                            Menunggu Finance
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Recent Activity Table Preview */}
      {dashboardConfig.showRecentActivity && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 animate-fade-in font-sans">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-display font-bold text-slate-800 text-[15px]">Pencatatan Transaksi Terkini</h3>
              <p className="text-xs text-slate-500">Daftar 5 pencatatan transaksi keuangan greenhouse terbaru.</p>
            </div>
            <button 
              onClick={() => onNavigateToRecords()} 
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              Lihat Semua Transaksi
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {recentTxs.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl text-xs text-slate-400 font-medium">
              Belum ada transaksi terdaftar yang sesuai dengan filter.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Proyek</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4 text-right">Uang Masuk</th>
                    <th className="py-3 px-4 text-right">Uang Keluar</th>
                    <th className="py-3 px-4">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-slate-600 divide-y divide-slate-100">
                  {recentTxs.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-500">{formatIndonesianDate(t.date)}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ${getProjectBadgeClass(t.project)}`}>
                          {t.project}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">{t.category}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                        {t.type === 'Inflow' ? `+ Rp ${t.amount.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                        {t.type === 'Outflow' ? `- Rp ${t.amount.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs break-words whitespace-normal" title={t.description}>
                        <span>{t.description}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Lightbox attachment modal view */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 transition-all animate-fade-in no-print backdrop-blur-xs">
          <div className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Lampiran Bukti Transaksi</h3>
              <button 
                onClick={() => setLightboxImage(null)}
                className="p-1 px-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 hover:text-slate-705 transition font-bold text-xs cursor-pointer"
              >
                Tutup ✕
              </button>
            </div>
            <div className="p-6 flex items-center justify-center max-h-[70vh] bg-slate-50 overflow-y-auto">
              {lightboxImage.startsWith('data:') || lightboxImage.startsWith('http') ? (
                <img 
                  src={lightboxImage} 
                  alt="Bukti Lampiran" 
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full rounded-2xl object-contain border shadow-sm"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 p-8 text-slate-400 font-semibold text-center">
                  <ShieldAlert className="w-10 h-10 text-amber-500 animate-pulse" />
                  <p className="text-slate-650 truncate max-w-md">{lightboxImage}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
