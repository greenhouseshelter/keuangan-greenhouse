import React, { useState, useEffect } from 'react';
import { Transaction, Project, DatabaseConfig, Role } from '../types';
import { getProjects } from '../utils/db';
import { 
  TrendingUp, TrendingDown, Landmark, Percent, ArrowUpRight, 
  ArrowDownRight, CircleDollarSign, Calendar, SlidersHorizontal, CheckSquare
} from 'lucide-react';

interface DashboardViewProps {
  transactions: Transaction[];
  onNavigateToRecords: (filters?: { project?: Project; type?: 'Inflow' | 'Outflow' }) => void;
  config: DatabaseConfig;
  currentRole?: Role;
}

export default function DashboardView({ transactions, onNavigateToRecords, config, currentRole }: DashboardViewProps) {
  const [selectedTimeline, setSelectedTimeline] = useState<'all' | '30days' | '7days'>('all');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<Project | 'All'>('All');
  const [projectsList, setProjectsList] = useState<string[]>([]);

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

  // Filter transactions based on timeline selection
  const now = new Date();
  const getFilteredTransactions = () => {
    let list = [...transactions];
    
    // Time filter
    if (selectedTimeline === '30days') {
      const limit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      list = list.filter(t => new Date(t.date) >= limit);
    } else if (selectedTimeline === '7days') {
      const limit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
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
  const inflows = filteredTxs.filter(t => t.type === 'Inflow');
  const outflows = filteredTxs.filter(t => t.type === 'Outflow');

  const totalInflow = inflows.reduce((sum, t) => sum + t.amount, 0);
  const totalOutflow = outflows.reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalInflow - totalOutflow;
  const netProfitMargin = totalInflow > 0 ? (netProfit / totalInflow) * 100 : 0;

  // Project breakdown calculations
  const projects: Project[] = projectsList.length > 0 ? projectsList : ['Melon', 'Cabe', 'Perikanan', 'Ternak'];
  const projectStats = projects.map(proj => {
    const pTxs = filteredTxs.filter(t => t.project === proj);
    const pIn = pTxs.filter(t => t.type === 'Inflow').reduce((sum, t) => sum + t.amount, 0);
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
  const opsInflow = filteredTxs.filter(t => t.type === 'Inflow' && t.category === 'Operational').reduce((sum, t) => sum + t.amount, 0);
  const opsOutflow = filteredTxs.filter(t => t.type === 'Outflow' && t.category === 'Operational').reduce((sum, t) => sum + t.amount, 0);
  const nonOpsInflow = filteredTxs.filter(t => t.type === 'Inflow' && t.category === 'Non-Operational').reduce((sum, t) => sum + t.amount, 0);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* TOTAL INFLOW */}
        <div 
          onClick={() => onNavigateToRecords({ type: 'Inflow' })}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-emerald-300 hover:shadow-xs transition-all duration-300"
        >
          <div className="flex justify-between items-start">
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

        {/* TOTAL OUTFLOW */}
        <div 
          onClick={() => onNavigateToRecords({ type: 'Outflow' })}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-rose-300 hover:shadow-xs transition-all duration-300"
        >
          <div className="flex justify-between items-start">
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

        {/* NET PROFIT */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
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

        {/* NET PROFIT MARGIN */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
              <Percent className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">
              RENTABILITAS
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs text-slate-500 font-medium">Margin Keuntungan</p>
            <h3 className="text-xl lg:text-2xl font-display font-extrabold text-slate-800 mt-1 font-mono">
              {netProfitMargin.toFixed(1)}%
            </h3>
          </div>
          <div className="mt-3 text-[10px] text-slate-400">
            Rasio laba dibanding total uang masuk
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Project Comparison Chart (SVG Native) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 space-y-4">
          <div>
            <h3 className="font-display font-bold text-slate-800">Arus Pendapatan & Pengeluaran</h3>
            <p className="text-xs text-slate-500">Perbandingan pemasukan vs pengeluaran langsung antar 4 unit proyek greenhouse.</p>
          </div>

          <div className="pt-4 space-y-6">
            {projectStats.map(p => {
              const inPct = (p.inflow / maxProjectCashInput) * 100;
              const outPct = (p.outflow / maxProjectCashInput) * 100;
              const netIsPositive = p.net >= 0;

              return (
                <div key={p.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        p.name === 'Melon' ? 'bg-emerald-500' :
                        p.name === 'Cabe' ? 'bg-amber-500' :
                        p.name === 'Perikanan' ? 'bg-blue-500' :
                        'bg-purple-500'
                      }`}></span>
                      <span className="text-xs font-semibold text-slate-700 font-display">Proyek {p.name}</span>
                      <span className="text-[10px] text-slate-400">({p.count} tx)</span>
                    </div>
                    <span className={`text-[10px] font-bold ${netIsPositive ? 'text-emerald-700' : 'text-rose-600'}`}>
                      Laba Bersih: Rp {p.net.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Horizontal Bar Chart representation */}
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {/* Inflow bar */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                        <span>Pemasukan: Rp {p.inflow.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(inPct, 1.5)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Outflow bar */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                        <span>Pengeluaran: Rp {p.outflow.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200/50 rounded-full overflow-hidden">
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

        {/* Operational Split & Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-slate-800">Sektor Biaya Operasional</h3>
            <p className="text-xs text-slate-500">Breakdown pembelanjaan operasional langsung di kebun vs non-operasional.</p>
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
                  className="bg-teal-400 h-full transition-all duration-500" 
                  style={{ width: `${totalInflow > 0 ? (nonOpsInflow / totalInflow) * 100 : 50}%` }}
                  title="Non-Operasional"
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 block"></span>
                  Op: Rp {opsInflow.toLocaleString('id-ID')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-teal-400 block"></span>
                  Non-Op: Rp {nonOpsInflow.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 text-[10px] text-slate-400 italic">
            *Pengelola hanya diperbolehkan menginput transaksi operasional kebun directly.
          </div>
        </div>
      </div>

      {/* Recent Activity Table Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-display font-bold text-slate-800">Pencatatan Transaksi Terkini</h3>
            <p className="text-xs text-slate-500">Daftar 5 pencatatan transaksi keuangan greenhouse terbaru.</p>
          </div>
          <button 
            onClick={() => onNavigateToRecords()} 
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
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
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-500">{t.date}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        t.project === 'Melon' ? 'bg-emerald-50 text-emerald-700' :
                        t.project === 'Cabe' ? 'bg-amber-50 text-amber-700' :
                        t.project === 'Perikanan' ? 'bg-blue-50 text-blue-700' :
                        'bg-purple-50 text-purple-700'
                      }`}>
                        {t.project}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-medium text-slate-500">{t.category}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                      {t.type === 'Inflow' ? `+ Rp ${t.amount.toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                      {t.type === 'Outflow' ? `- Rp ${t.amount.toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500" title={t.description}>
                      <span className="line-clamp-1 max-w-xs">{t.description}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
