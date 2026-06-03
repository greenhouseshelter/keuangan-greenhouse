import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { getProjects } from '../utils/db';
import { addActivityLog } from '../utils/activityLogger';
import { isTxApproved } from '../utils/approvalHelper';
import { 
  Scale, Printer, Info, Sliders, RotateCcw, ShieldCheck, 
  ArrowUpRight, ArrowDownRight, Briefcase, Landmark, Percent, Settings2
} from 'lucide-react';

interface BalanceSheetViewProps {
  transactions: Transaction[];
}

export default function BalanceSheetView({ transactions }: BalanceSheetViewProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // YYYY-MM
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(true);

  // Editable accounting items with local storage persistence
  const [capital, setCapital] = useState<number>(() => {
    const saved = localStorage.getItem('greenhouse_neraca_capital');
    return saved !== null ? Number(saved) : 150000000;
  });
  const [inventory, setInventory] = useState<number>(() => {
    const saved = localStorage.getItem('greenhouse_neraca_inventory');
    return saved !== null ? Number(saved) : 30000000;
  });
  const [greenhouseAsset, setGreenhouseAsset] = useState<number>(() => {
    const saved = localStorage.getItem('greenhouse_neraca_gh_asset');
    return saved !== null ? Number(saved) : 120000000;
  });
  const [iotAsset, setIotAsset] = useState<number>(() => {
    const saved = localStorage.getItem('greenhouse_neraca_iot_asset');
    return saved !== null ? Number(saved) : 30000000;
  });
  const [depreciation, setDepreciation] = useState<number>(() => {
    const saved = localStorage.getItem('greenhouse_neraca_depreciation');
    return saved !== null ? Number(saved) : 15000000;
  });
  const [vendorDebts, setVendorDebts] = useState<number>(() => {
    const saved = localStorage.getItem('greenhouse_neraca_vendor_debts');
    return saved !== null ? Number(saved) : 15000000;
  });
  const [bankLoans, setBankLoans] = useState<number>(() => {
    const saved = localStorage.getItem('greenhouse_neraca_bank_loans');
    return saved !== null ? Number(saved) : 0;
  });
  const [receivables, setReceivables] = useState<number>(() => {
    const saved = localStorage.getItem('greenhouse_neraca_receivables');
    return saved !== null ? Number(saved) : 12000000;
  });

  // Track and log settings changes
  const persistAndLog = (key: string, value: number, setter: React.Dispatch<React.SetStateAction<number>>) => {
    setter(value);
    localStorage.setItem(`greenhouse_neraca_${key}`, String(value));
  };

  const handleResetDefaults = () => {
    if (window.confirm('Apakah Anda yakin ingin memulihkan semua parameter Neraca ke angka standar/default?')) {
      persistAndLog('capital', 150000000, setCapital);
      persistAndLog('inventory', 30000000, setInventory);
      persistAndLog('gh_asset', 120000000, setGreenhouseAsset);
      persistAndLog('iot_asset', 30000000, setIotAsset);
      persistAndLog('depreciation', 15000000, setDepreciation);
      persistAndLog('vendor_debts', 15000000, setVendorDebts);
      persistAndLog('bank_loans', 0, setBankLoans);
      persistAndLog('receivables', 12000000, setReceivables);
      
      addActivityLog('NERACA_RESET', 'Memulihkan semua parameter simulasi Neraca Keuangan ke default.');
    }
  };

  // Get distinct months recorded in transactions
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

  const getMonthNameIndo = (monthStr: string) => {
    if (monthStr === 'all') return 'Hingga Saat Ini (Konsolidasi)';
    const [year, month] = monthStr.split('-');
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `Per 30/31 ${months[parseInt(month, 10) - 1]} ${year}`;
  };

  // Calculate cumulative net income as Retained Earnings
  // For a Balance Sheet, this is the sum of all activities leading up to the given period
  const getRetainedEarnings = () => {
    let list = [...transactions];
    if (selectedMonth !== 'all') {
      // Filter out transactions after the selected month
      list = list.filter(t => t.date.substring(0, 7) <= selectedMonth);
    }

    const inflow = list.filter(t => t.type === 'Inflow' && isTxApproved(t)).reduce((sum, t) => sum + t.amount, 0);
    const outflow = list.filter(t => t.type === 'Outflow').reduce((sum, t) => sum + t.amount, 0);
    
    return inflow - outflow;
  };

  const retainedEarnings = getRetainedEarnings();

  // Calculate Assets = Liabilities + Equity
  // To keep it balanced:
  // Total Pasiva = Liabilities + Capital + Retained Earnings
  // Total Aset   = Kas + Receivables + Inventory + Net Fixed Assets
  // We make Kas the Balancing variable:
  // Kas = Total Pasiva - Receivables - Inventory - Net Fixed Assets
  const totalLiabilities = vendorDebts + bankLoans;
  const totalEquity = capital + retainedEarnings;
  const totalPasiva = totalLiabilities + totalEquity;

  const netFixedAssets = (greenhouseAsset + iotAsset) - depreciation;
  const nonCashCurrentAssets = receivables + inventory;

  // Balancing cash value
  const cashAndEquivalents = totalPasiva - nonCashCurrentAssets - netFixedAssets;

  // Total Assets
  const totalAssets = cashAndEquivalents + nonCashCurrentAssets + netFixedAssets;

  const handlePrint = () => {
    addActivityLog('CETAK_NERACA', `Mencetak Neraca Keuangan Konsolidator untuk periode "${getMonthNameIndo(selectedMonth)}"`);
    window.print();
  };

  return (
    <div id="balance-sheet-view" className="space-y-6 max-w-5xl mx-auto mb-10">
      
      {/* Control panel and filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs no-print">
        <div className="space-y-1">
          <h2 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Neraca Keuangan
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Laporan posisi aset (kekayaan), kewajiban (utang), dan ekuitas (modal) greenhouse secara berkala.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Month selector filter */}
          <div className="relative flex-1 sm:flex-initial min-w-[140px]">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950/40 dark:border-slate-800 rounded-xl text-xs text-slate-750 dark:text-slate-300 font-semibold outline-none focus:bg-white"
            >
              <option value="all">Semua Periode</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{getMonthNameIndo(m)}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-2 border rounded-xl flex items-center gap-1.5 text-xs font-semibold select-none cursor-pointer ${
              showConfig 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' 
                : 'bg-white text-slate-650 border-slate-250 hover:bg-slate-50 dark:bg-slate-950/20 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-900/40'
            }`}
            title="Ubah parameter neraca"
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">Konfigurasi Parameter</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 border border-transparent text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak Neraca
          </button>
        </div>
      </div>

      {/* Settings / Adjustable Parameter Panel */}
      {showConfig && (
        <div className="bg-slate-50/80 dark:bg-slate-900/40 border border-slate-250/75 dark:border-slate-800/80 rounded-2xl p-5 space-y-4 no-print class-sidebar-card">
          <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-mono">
              <Settings2 className="w-4 h-4 text-emerald-500" />
              Sesuaikan Parameter Aset & Liabilitas Neraca
            </h3>
            <button 
              onClick={handleResetDefaults}
              className="text-xs text-slate-505 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-450 flex items-center gap-1 cursor-pointer font-bold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Pulihkan Default
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
            {/* Liquid / Current Assets parameters */}
            <div className="space-y-3 p-3 bg-white dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 rounded-xl">
              <span className="block font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-[10px] font-display">Aset Lancar & Piutang</span>
              
              <div className="space-y-1">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Persediaan Sarana (Seeds, Pupuk)</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rp {inventory.toLocaleString('id-ID')}</span>
                </div>
                <input 
                  type="range" min="0" max="100000000" step="1000000" 
                  value={inventory} 
                  onChange={(e) => persistAndLog('inventory', Number(e.target.value), setInventory)}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Piutang Usaha</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rp {receivables.toLocaleString('id-ID')}</span>
                </div>
                <input 
                  type="range" min="0" max="50000000" step="500000" 
                  value={receivables} 
                  onChange={(e) => persistAndLog('receivables', Number(e.target.value), setReceivables)}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Fixed Assets parameters */}
            <div className="space-y-3 p-3 bg-white dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 rounded-xl">
              <span className="block font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider text-[10px] font-display">Aset Tetap (Capital Assets)</span>
              
              <div className="space-y-1">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Struktur Bangunan GH</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rp {greenhouseAsset.toLocaleString('id-ID')}</span>
                </div>
                <input 
                  type="range" min="20000000" max="300000000" step="5000000" 
                  value={greenhouseAsset} 
                  onChange={(e) => persistAndLog('gh_asset', Number(e.target.value), setGreenhouseAsset)}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Peralatan Smart IoT</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rp {iotAsset.toLocaleString('id-ID')}</span>
                </div>
                <input 
                  type="range" min="5000000" max="100000000" step="1000000" 
                  value={iotAsset} 
                  onChange={(e) => persistAndLog('iot_asset', Number(e.target.value), setIotAsset)}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                  <span>Penyusutan Kumulatif (-)</span>
                  <span className="font-mono font-bold text-rose-600">Rp {depreciation.toLocaleString('id-ID')}</span>
                </div>
                <input 
                  type="range" min="0" max="50000000" step="1000000" 
                  value={depreciation} 
                  onChange={(e) => persistAndLog('depreciation', Number(e.target.value), setDepreciation)}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Liabilities & Equity parameters */}
            <div className="space-y-3 p-3 bg-white dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 rounded-xl md:col-span-2 lg:col-span-1">
              <span className="block font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider text-[10px] font-display">Liabilitas & Modal</span>
              
              <div className="space-y-1">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Utang Vendor Bibit/Pupuk</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rp {vendorDebts.toLocaleString('id-ID')}</span>
                </div>
                <input 
                  type="range" min="0" max="100000000" step="1000000" 
                  value={vendorDebts} 
                  onChange={(e) => persistAndLog('vendor_debts', Number(e.target.value), setVendorDebts)}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Utang Bank Jangka Panjang</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rp {bankLoans.toLocaleString('id-ID')}</span>
                </div>
                <input 
                  type="range" min="0" max="150000000" step="5000000" 
                  value={bankLoans} 
                  onChange={(e) => persistAndLog('bank_loans', Number(e.target.value), setBankLoans)}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-600 dark:text-slate-400 flex-wrap">
                  <span className="truncate">Modal Awal Disetor</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rp {capital.toLocaleString('id-ID')}</span>
                </div>
                <input 
                  type="range" min="50000000" max="500000000" step="10000500" 
                  value={capital} 
                  onChange={(e) => persistAndLog('capital', Number(e.target.value), setCapital)}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none dark:bg-slate-800"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mathematical balancing and educational explanation banner */}
      {showExplanation && (
        <div className="bg-emerald-50/40 dark:bg-teal-950/15 border border-emerald-100/50 dark:border-teal-900/35 p-4 rounded-2xl flex gap-3 text-xs text-slate-650 dark:text-slate-350 select-none relative no-print">
          <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-450 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-slate-800 dark:text-slate-200">Pencocokan Persamaan Akuntansi (Sistem Pasiva-Aktiva Seimbang)</p>
            <p className="leading-relaxed">
              Sistem ini menjamin prinsip <strong>Double-Entry</strong> seimbang sempurna dengan persamaan:
              <code className="bg-slate-100 dark:bg-slate-800/60 px-1 py-0.5 rounded ml-1 font-mono text-emerald-700 dark:text-emerald-300 font-bold">Total Aset = Total Liabilitas + Total Ekuitas</code>. Letak Kas dan Setara Kas dihitung dinamis dari total kewajiban dan modal dikurangi aset tetap dan persediaan saat ini. Saldo Laba ditahan diambil real-time dari kumulatif profit semua transaksi proyek Anda.
            </p>
          </div>
          <button 
            onClick={() => setShowExplanation(false)} 
            className="absolute top-2 right-3 text-slate-400 hover:text-slate-600 font-semibold cursor-pointer text-sm"
            title="Sembunyikan"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Print Layout Card */}
      <div className="bg-white dark:bg-slate-950/30 rounded-3xl border border-slate-200 dark:border-slate-800/80 p-8 shadow-2xs space-y-8 print-no-border print-p-0">
        
        {/* Print Logo and Header */}
        <div className="border-b border-slate-100 dark:border-slate-800 pb-5 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-[9px] font-bold border border-emerald-100 dark:border-emerald-900 tracking-wide uppercase mb-1.5 font-mono">
              GREENHOUSE INTEGRATED AGRIBUSINESS
            </span>
            <h1 className="font-display font-extrabold text-2xl text-slate-800 dark:text-slate-100 leading-tight">
              PERNYATAAN NERACA KONSOLIDASI
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1">
              Tanggal Pelaporan: <span className="font-semibold text-slate-700 dark:text-slate-300">{getMonthNameIndo(selectedMonth)}</span>
            </p>
          </div>
          
          <div className="text-center sm:text-right text-xs shrink-0 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 p-3 rounded-2xl">
            <span className="text-slate-400 block text-[9px] uppercase font-mono font-bold tracking-wider">Status Neraca</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center justify-center sm:justify-end gap-1.5 mt-1 font-display uppercase tracking-tight text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              SINKRONISASI SEIMBANG
            </span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5">Sistem Agribisnis Terpadu</span>
          </div>
        </div>

        {/* Double Column T-Account Structure */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-150 dark:divide-slate-800/80">
          
          {/* LEFT SIDE: AKTIVA (ASSETS) */}
          <div className="space-y-6 pt-6 md:pt-0">
            <div className="flex justify-between items-center text-slate-800 dark:text-slate-200 border-b border-slate-150 dark:border-slate-800 pb-3">
              <h2 className="font-display font-black text-xs uppercase tracking-widest flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                BAGIAN I: AKTIVA (ASET)
              </h2>
              <span className="font-mono text-[9px] text-slate-400">DEBET</span>
            </div>

            {/* Aset Lancar */}
            <div className="space-y-3">
              <h3 className="font-display font-extrabold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                1. Aset Lancar
              </h3>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100/65 dark:border-slate-900 text-slate-650 dark:text-slate-400">
                  <div className="space-y-0.5">
                    <span className="font-medium text-slate-805 dark:text-slate-300 block">Kas dan Setara Kas</span>
                    <span className="text-[10px] text-slate-450 block leading-tight">Uang kas bank, simpanan operasi greenhouse</span>
                  </div>
                  <span className={`font-mono font-bold ${cashAndEquivalents >= 0 ? 'text-slate-800 dark:text-slate-200' : 'text-rose-500'}`}>
                    Rp {cashAndEquivalents.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100/65 dark:border-slate-900 text-slate-650 dark:text-slate-400">
                  <div className="space-y-0.5">
                    <span className="font-medium text-slate-805 dark:text-slate-300 block">Piutang Usaha</span>
                    <span className="text-[10px] text-slate-450 block leading-tight">Penjualan hasil panen belum cair</span>
                  </div>
                  <span className="font-mono text-slate-850 dark:text-slate-200">
                    Rp {receivables.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100/65 dark:border-slate-900 text-slate-650 dark:text-slate-400 font-display">
                  <div className="space-y-0.5">
                    <span className="font-medium text-slate-805 dark:text-slate-300 block">Persediaan Barang</span>
                    <span className="text-[10px] text-slate-450 block leading-tight">Stok bibit melon/cabe, persediaan pupuk</span>
                  </div>
                  <span className="font-mono text-slate-850 dark:text-slate-200">
                    Rp {inventory.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Total Aset Lancar */}
              <div className="flex justify-between items-center bg-slate-50/55 dark:bg-slate-900/35 p-3 rounded-xl border border-slate-100 dark:border-slate-850 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Total Aset Lancar</span>
                <span className="font-mono font-extrabold text-slate-800 dark:text-slate-100">
                  Rp {(cashAndEquivalents + nonCashCurrentAssets).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Aset Tetap */}
            <div className="space-y-3 pt-2">
              <h3 className="font-display font-extrabold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                2. Aset Tetap (Aktiva Tetap)
              </h3>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100/65 dark:border-slate-900 text-slate-650 dark:text-slate-400">
                  <div className="space-y-0.5">
                    <span className="font-medium text-slate-805 dark:text-slate-300 block">Bangunan & Sistem Greenhouse</span>
                    <span className="text-[10px] text-slate-450 block leading-tight">Mutu konstruksi & instalasi blower</span>
                  </div>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    Rp {greenhouseAsset.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100/65 dark:border-slate-900 text-slate-650 dark:text-slate-400">
                  <div className="space-y-0.5">
                    <span className="font-medium text-slate-805 dark:text-slate-300 block">Peralatan Smart Farming & IoT</span>
                    <span className="text-[10px] text-slate-450 block leading-tight">Katup otomatis, pompa nutrisi, sensor suhu</span>
                  </div>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    Rp {iotAsset.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100/65 dark:border-slate-900 text-slate-650 dark:text-slate-400">
                  <div className="space-y-0.5 text-rose-700 dark:text-rose-450">
                    <span className="font-bold block">Akumulasi Penyusutan (-)</span>
                    <span className="text-[10px] text-rose-500/80 block leading-tight">Penyusutan ekonomi tahun berjalan</span>
                  </div>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    -Rp {depreciation.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Total Aset Tetap Net */}
              <div className="flex justify-between items-center bg-indigo-50/20 dark:bg-indigo-950/15 p-3 rounded-xl border border-indigo-100/40 dark:border-indigo-900/40 text-xs">
                <span className="font-bold text-indigo-700 dark:text-indigo-300">Total Aset Tetap Bersih</span>
                <span className="font-mono font-extrabold text-indigo-800 dark:text-indigo-200">
                  Rp {netFixedAssets.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Total Aset Grand Total */}
            <div className="border-t border-slate-300 dark:border-slate-700 pt-4 flex justify-between items-center text-xs">
              <span className="font-display font-black text-slate-800 dark:text-slate-250 uppercase tracking-widest">TOTAL AKTIVA (ASET)</span>
              <span className="font-mono font-black text-slate-900 dark:text-slate-50 text-base border-b-2 border-emerald-500/70 pb-0.5">
                Rp {totalAssets.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* RIGHT SIDE: LIABILITAS & EKUITAS (PASIVA) */}
          <div className="space-y-6 pt-6 md:pt-0 md:pl-8">
            <div className="flex justify-between items-center text-slate-800 dark:text-slate-200 border-b border-slate-150 dark:border-slate-800 pb-3">
              <h2 className="font-display font-black text-xs uppercase tracking-widest flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-orange-600" />
                BAGIAN II: KEWAJIBAN & EKUITAS
              </h2>
              <span className="font-mono text-[9px] text-slate-400">KREDIT</span>
            </div>

            {/* Liabilitas / Utang */}
            <div className="space-y-3">
              <h3 className="font-display font-extrabold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                1. Kewajiban (Liabilitas)
              </h3>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100/65 dark:border-slate-900 text-slate-650 dark:text-slate-400">
                  <div className="space-y-0.5">
                    <span className="font-medium text-slate-805 dark:text-slate-300 block">Utang Usaha</span>
                    <span className="text-[10px] text-slate-450 block leading-tight">Utang sarana pertanian ke vendor pupuk/bibit</span>
                  </div>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">
                    Rp {vendorDebts.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100/65 dark:border-slate-900 text-slate-650 dark:text-slate-400">
                  <div className="space-y-0.5">
                    <span className="font-medium text-slate-805 dark:text-slate-300 block">Kewajiban Jangka Panjang</span>
                    <span className="text-[10px] text-slate-450 block leading-tight">Pinjaman modal bank untuk ekspansi</span>
                  </div>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    Rp {bankLoans.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Total Liabilitas */}
              <div className="flex justify-between items-center bg-slate-50/55 dark:bg-slate-900/35 p-3 rounded-xl border border-slate-100 dark:border-slate-850 text-xs">
                <span className="font-bold text-slate-705 dark:text-slate-300">Total Kewajiban</span>
                <span className="font-mono font-extrabold text-slate-800 dark:text-slate-205">
                  Rp {totalLiabilities.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Ekuitas / Modal */}
            <div className="space-y-3 pt-2">
              <h3 className="font-display font-extrabold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                2. Ekuitas (Kekayaan Bersih)
              </h3>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100/65 dark:border-slate-900 text-slate-650 dark:text-slate-400">
                  <div className="space-y-0.5">
                    <span className="font-medium text-slate-805 dark:text-slate-300 block">Modal Awal Disetor</span>
                    <span className="text-[10px] text-slate-450 block leading-tight">Setoran modal pendiri awal pembangunan greenhouse</span>
                  </div>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    Rp {capital.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100/65 dark:border-slate-900 text-slate-650 dark:text-slate-400">
                  <div className="space-y-0.5">
                    <span className="font-medium text-slate-805 dark:text-slate-300 block flex items-center gap-1">
                      Saldo Laba Ditahan
                      <span className="inline-flex px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold text-[8.5px] uppercase rounded tracking-wider">System</span>
                    </span>
                    <span className="text-[10px] text-slate-450 block leading-tight">Kumulatif laba/rugi bersih dari buku kas transaksi</span>
                  </div>
                  <span className={`font-mono font-bold ${retainedEarnings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                    Rp {retainedEarnings.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Total Ekuitas */}
              <div className="flex justify-between items-center bg-emerald-50/20 dark:bg-emerald-950/15 p-3 rounded-xl border border-emerald-100/40 dark:border-emerald-900/40 text-xs">
                <span className="font-bold text-emerald-700 dark:text-emerald-300">Total Ekuitas</span>
                <span className="font-mono font-extrabold text-emerald-850 dark:text-emerald-350">
                  Rp {totalEquity.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Total Pasiva Grand Total */}
            <div className="border-t border-slate-300 dark:border-slate-700 pt-4 flex justify-between items-center text-xs">
              <span className="font-display font-black text-slate-800 dark:text-slate-250 uppercase tracking-widest">TOTAL LIABILITAS & EKUITAS</span>
              <span className="font-mono font-black text-slate-900 dark:text-slate-50 text-base border-b-2 border-emerald-500/70 pb-0.5">
                Rp {totalPasiva.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

        </div>

        {/* Visual check matching indicator */}
        <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800/80 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 text-xs leading-none">
          <span className="font-mono text-[10px] uppercase font-bold text-slate-400">Verifikator Keseimbangan Ledger:</span>
          <div className="flex items-center gap-4">
            <span className="font-display font-bold text-slate-600 dark:text-slate-400">Aktiva: <span className="font-mono text-slate-800 dark:text-slate-200">Rp {totalAssets.toLocaleString('id-ID')}</span></span>
            <span className="text-slate-300">|</span>
            <span className="font-display font-bold text-slate-600 dark:text-slate-400">Pasiva: <span className="font-mono text-slate-800 dark:text-slate-200">Rp {totalPasiva.toLocaleString('id-ID')}</span></span>
            <span className="text-slate-300">|</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 font-bold text-[10.5px] tracking-wider text-emerald-700 bg-emerald-100/65 dark:text-emerald-350 dark:bg-emerald-950/50 border border-emerald-250/50 uppercase rounded-xl leading-none">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SINKRON SEIMBANG 100%
            </span>
          </div>
        </div>

        {/* Signature panel for official financial records */}
        <div className="pt-8 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-end gap-6 text-xs text-slate-500">
          <div>
            <p className="italic font-medium text-slate-400 dark:text-slate-500">Pernyataan Neraca Agribisnis Terintegrasi Greenhouse dihasilkan otomatis secara real-time.</p>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-mono">Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
          </div>
          <div className="text-right w-48 border-t border-slate-200 dark:border-slate-800/80 pt-3">
            <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">Disahkan Disiapkan Oleh</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 font-display block mt-1.5">Bagian Accounting & Finance</span>
          </div>
        </div>

      </div>
    </div>
  );
}
