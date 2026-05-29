import React, { useState, useRef, useEffect } from 'react';
import { Transaction, Project } from '../types';
import { getProjects } from '../utils/db';
import { addActivityLog } from '../utils/activityLogger';
import { FileText, Printer, Calendar, ArrowUpRight, ArrowDownRight, TrendingUp, CheckCircle, ShieldCheck } from 'lucide-react';

interface ReportsViewProps {
  transactions: Transaction[];
}

export default function ReportsView({ transactions }: ReportsViewProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // YYYY-MM
  const printRef = useRef<HTMLDivElement>(null);
  const [projectsList, setProjectsList] = useState<string[]>([]);

  useEffect(() => {
    const loadProjs = async () => {
      try {
        const list = await getProjects();
        setProjectsList(list.map(p => p.name));
      } catch (e) {
        console.error('Failed to load projects in ReportsView:', e);
      }
    };
    loadProjs();
  }, []);

  // Get distinct months recorded in transactions for the month filter dropdown
  const getAvailableMonths = () => {
    const monthsSet = new Set<string>();
    transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        monthsSet.add(t.date.substring(0, 7)); // Extract YYYY-MM
      }
    });
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  };

  const availableMonths = getAvailableMonths();

  // Filter transactions by selected month
  const getFilteredTransactions = () => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  };

  const filteredTxs = getFilteredTransactions();

  // Financial aggregates
  const getAggregates = (projectList?: Project[]) => {
    let list = [...filteredTxs];
    if (projectList) {
      list = list.filter(t => projectList.includes(t.project));
    }

    const inflow = list.filter(t => t.type === 'Inflow').reduce((sum, t) => sum + t.amount, 0);
    const outflow = list.filter(t => t.type === 'Outflow').reduce((sum, t) => sum + t.amount, 0);
    
    // Split operational costs
    const opInflow = list.filter(t => t.type === 'Inflow' && t.category === 'Operational').reduce((sum, t) => sum + t.amount, 0);
    const opOutflow = list.filter(t => t.type === 'Outflow' && t.category === 'Operational').reduce((sum, t) => sum + t.amount, 0);
    
    // Split non-operational costs
    const nonOpInflow = list.filter(t => t.type === 'Inflow' && t.category === 'Non-Operational').reduce((sum, t) => sum + t.amount, 0);
    const nonOpOutflow = list.filter(t => t.type === 'Outflow' && t.category === 'Non-Operational').reduce((sum, t) => sum + t.amount, 0);

    const net = inflow - outflow;
    const margin = inflow > 0 ? (net / inflow) * 100 : 0;

    return { inflow, outflow, opInflow, opOutflow, nonOpInflow, nonOpOutflow, net, margin };
  };

  const totalReport = getAggregates();

  const getMonthNameIndo = (monthStr: string) => {
    if (monthStr === 'all') return 'Semua Periode';
    const [year, month] = monthStr.split('-');
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${months[parseInt(month, 10) - 1]} ${year}`;
  };

  const handlePrint = () => {
    addActivityLog('CETAK_LAPORAN', `Mencetak laporan laba rugi konsolidasi untuk periode "${getMonthNameIndo(selectedMonth)}"`);
    window.print();
  };

  const projects: Project[] = projectsList.length > 0 ? projectsList : ['Melon', 'Cabe', 'Perikanan', 'Ternak'];

  return (
    <div id="reports-view" className="space-y-6 max-w-5xl mx-auto mb-10">
      
      {/* Control panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs no-print">
        <div className="space-y-0.5">
          <h2 className="font-display font-bold text-slate-800 text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Laporan & Pernyataan Keuangan
          </h2>
          <p className="text-xs text-slate-500">
            Kompilasi Laporan Laba Rugi terpadu untuk semua proyek greenhouse secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Month selector filter */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-44 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold outline-none focus:bg-white"
            >
              <option value="all">Semua Periode</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{getMonthNameIndo(m)}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 border border-transparent text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            Cetak Laporan
          </button>
        </div>
      </div>

      {/* Main Print Layout Card */}
      <div 
        ref={printRef} 
        className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-8 print-no-border print-p-0"
      >
        {/* Print Header */}
        <div className="border-b border-slate-100 pb-5 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[9px] font-bold border border-emerald-100 tracking-wide uppercase mb-1.5">
              GREENHOUSE INTEGRATED AGRIBUSINESS
            </span>
            <h1 className="font-display font-extrabold text-2xl text-slate-800 leading-tight">
              LAPORAN LABA RUGI KONSOLIDASI
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Periode Laporan: <span className="font-semibold text-slate-700">{getMonthNameIndo(selectedMonth)}</span>
            </p>
          </div>
          <div className="text-center sm:text-right text-xs shrink-0 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Status Audit</span>
            <span className="font-semibold text-emerald-700 flex items-center justify-center sm:justify-end gap-1.5 mt-1 font-display">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              SINKRONISASI AKTIF
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Sistem Pencatatan Greenhouse</span>
          </div>
        </div>

        {/* Console Summary Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-emerald-50/40 border border-emerald-100/50 p-5 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider font-display">Total Pendapatan Tergabung</span>
            <h3 className="text-xl font-display font-extrabold text-slate-800 mt-2 font-mono">
              Rp {totalReport.inflow.toLocaleString('id-ID')}
            </h3>
            <span className="text-[10px] text-emerald-600 font-medium block mt-1 flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5" /> Pendapatan kotor dari operasional
            </span>
          </div>

          <div className="bg-rose-50/40 border border-rose-100/50 p-5 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-rose-700 tracking-wider font-display">Total Pengeluaran Tergabung</span>
            <h3 className="text-xl font-display font-extrabold text-slate-800 mt-2 font-mono">
              Rp {totalReport.outflow.toLocaleString('id-ID')}
            </h3>
            <span className="text-[10px] text-rose-600 font-medium block mt-1 flex items-center gap-0.5">
              <ArrowDownRight className="w-3.5" /> Ongkos pokok dan administrasi
            </span>
          </div>

          <div className={`p-5 rounded-2xl border ${totalReport.net >= 0 ? 'bg-indigo-50/40 border-indigo-100' : 'bg-red-50/40 border-red-100'}`}>
            <span className={`text-[10px] uppercase font-bold tracking-wider font-display ${totalReport.net >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>
              Laba Bersih Konsolidasi
            </span>
            <h3 className="text-xl font-display font-extrabold text-slate-800 mt-2 font-mono">
              Rp {totalReport.net.toLocaleString('id-ID')}
            </h3>
            <span className="text-[10px] text-indigo-600 font-medium block mt-0.5">
              Margin Profitabilitas Rata-Rata: <span className="font-bold">{totalReport.margin.toFixed(1)}%</span>
            </span>
          </div>
        </div>

        {/* Detailed Breakdown ledger */}
        <div className="space-y-4">
          <h3 className="font-display font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
            Rincian Pos Pendapatan & Beban Pengeluaran
          </h3>

          <div className="space-y-2.5 text-xs">
            {/* INFLOW SECTION */}
            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-slate-50 flex justify-between p-3.5 font-bold text-slate-800 font-display">
                <span className="uppercase tracking-wider text-[10px]">1. PENDAPATAN OPERASIONAL & PENJUALAN</span>
                <span className="font-mono text-emerald-700">Rp {totalReport.inflow.toLocaleString('id-ID')}</span>
              </div>
              <div className="divide-y divide-slate-100/60 p-1 bg-white">
                <div className="flex justify-between py-2 px-4 text-slate-600">
                  <span>Pendapatan Operasional Langsung (Panen, Kontrak supply)</span>
                  <span className="font-mono text-slate-700 font-medium">Rp {totalReport.opInflow.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between py-2 px-4 text-slate-600">
                  <span>Pendapatan Luar Operasional (Hibah, Insentif, Sponsor)</span>
                  <span className="font-mono text-slate-700 font-medium">Rp {totalReport.nonOpInflow.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            {/* OUTFLOW SECTION */}
            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-slate-50 flex justify-between p-3.5 font-bold text-slate-800 font-display">
                <span className="uppercase tracking-wider text-[10px]">2. BEBAN OPERASIONAL & BIAYA POKOK</span>
                <span className="font-mono text-rose-700">Rp {totalReport.outflow.toLocaleString('id-ID')}</span>
              </div>
              <div className="divide-y divide-slate-100/60 p-1 bg-white">
                <div className="flex justify-between py-2 px-4 text-slate-600">
                  <span>Beban Operasional Greenhouse (Bibit, Pupuk, Pakan instan, Pekerja harian)</span>
                  <span className="font-mono text-slate-700 font-medium">Rp {totalReport.opOutflow.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between py-2 px-4 text-slate-600">
                  <span>Beban Umum, Admi & Pemasaran (Promosi, Sewa alat, ATK administrasi)</span>
                  <span className="font-mono text-slate-700 font-medium">Rp {totalReport.nonOpOutflow.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Project profitability index sheets */}
        <div className="space-y-4">
          <h3 className="font-display font-medium text-slate-800 text-sm border-b border-slate-100 pb-2">
            Performa Margin Laba Bersih Per Unit Proyek
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Nama Unit Proyek</th>
                  <th className="py-3 px-4 text-right">Pendapatan (Inflow)</th>
                  <th className="py-3 px-4 text-right">Sektor Pengeluaran (Outflow)</th>
                  <th className="py-3 px-4 text-right">Laba/Rugi Bersih</th>
                  <th className="py-3 px-4 text-right">Margin Laba</th>
                  <th className="py-3 px-4 text-center">Status Keuntungan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {projects.map(proj => {
                  const stats = getAggregates([proj]);
                  return (
                    <tr key={proj} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-bold font-display text-slate-750">Proyek {proj}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-800">Rp {stats.inflow.toLocaleString('id-ID')}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-500">Rp {stats.outflow.toLocaleString('id-ID')}</td>
                      <td className={`py-3.5 px-4 text-right font-mono font-bold ${stats.net >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                        Rp {stats.net.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700">{stats.margin.toFixed(1)}%</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          stats.net > 0 ? 'bg-emerald-50 text-emerald-700' :
                          stats.net === 0 ? 'bg-slate-100 text-slate-600' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          {stats.net > 0 ? 'PROFIT' : stats.net === 0 ? 'BREAKEVEN' : 'LOSS'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signature panel for official financial records */}
        <div className="pt-8 border-t border-slate-100 flex justify-between items-end gap-6 text-xs text-slate-500">
          <div>
            <p className="italic font-medium">Buku Kas Laporan Keuangan Greenhouse terintegrasi ini dihasilkan secara otomatis.</p>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">Dibuat pada: {new Date().toLocaleString('id-ID')}</p>
          </div>
          <div className="text-right w-48 border-t border-slate-200 pt-3">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Disiapkan Oleh</span>
            <span className="font-bold text-slate-700 font-display block mt-1.5">Bagian Accounting</span>
          </div>
        </div>

      </div>
    </div>
  );
}
