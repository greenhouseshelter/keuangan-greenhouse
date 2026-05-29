import React, { useState, useEffect } from 'react';
import { getActivityLogs, clearActivityLogs, ActivityLog } from '../utils/activityLogger';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportHelper';
import { 
  History, Search, Trash2, Printer, ChevronLeft, ChevronRight, AlertCircle, RefreshCw
} from 'lucide-react';

export default function AdminLogsView() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [logFormat, setLogFormat] = useState<'xlsx' | 'pdf' | 'csv'>('xlsx');
  const itemsPerPage = 15;

  useEffect(() => {
    setLogs(getActivityLogs());
  }, []);

  const handleRefresh = () => {
    setLogs(getActivityLogs());
    setCurrentPage(1);
  };

  const handleClearLogs = () => {
    const conf = window.confirm('Apakah Anda yakin ingin menghapus seluruh log aktivitas sistem? Tindakan ini tidak dapat dibatalkan.');
    if (!conf) return;
    clearActivityLogs();
    setLogs([]);
    setCurrentPage(1);
  };

  const handleDownloadLogs = (format: 'xlsx' | 'pdf' | 'csv') => {
    const listToExport = getFilteredLogs();
    if (listToExport.length === 0) {
      alert('Tidak ada log untuk diunduh.');
      return;
    }

    const headers = ['ID Log', 'Waktu (UTC)', 'Tanggal Lokal', 'Pengguna', 'Role', 'Aktivitas', 'Detail Aktivitas'];
    const rows = listToExport.map(l => {
      const localDate = new Date(l.timestamp).toLocaleString('id-ID');
      return [
        l.id,
        l.timestamp,
        localDate,
        l.username,
        l.role,
        l.action,
        l.details
      ];
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `log_aktivitas_greenhouse_${dateStr}`;

    if (format === 'csv') {
      exportToCSV(headers, rows, fileName);
    } else if (format === 'xlsx') {
      exportToExcel(headers, rows, 'Log Aktivitas', fileName);
    } else if (format === 'pdf') {
      exportToPDF(
        'LOG AKTIVITAS SISTEM GREENHOUSE',
        headers,
        rows,
        fileName,
        'landscape',
        `Menampilkan log aktivitas terfilter. Total: ${listToExport.length} entri.`
      );
    }
  };

  const getFilteredLogs = () => {
    if (!searchTerm.trim()) {
      return logs;
    }
    const s = searchTerm.toLowerCase();
    return logs.filter(l => 
      l.username.toLowerCase().includes(s) ||
      l.role.toLowerCase().includes(s) ||
      l.action.toLowerCase().includes(s) ||
      l.details.toLowerCase().includes(s) ||
      new Date(l.timestamp).toLocaleString('id-ID').toLowerCase().includes(s)
    );
  };

  const filteredLogs = getFilteredLogs();

  // Pagination logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  const formatActivityAction = (act: string) => {
    switch (act) {
      case 'LOGIN': return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'TAMBAH_TRANSAKSI': return 'bg-sky-50 text-sky-700 border border-sky-100';
      case 'EDIT_TRANSAKSI': return 'bg-amber-50 text-amber-700 border border-amber-100';
      case 'HAPUS_TRANSAKSI': return 'bg-rose-50 text-rose-700 border border-rose-100';
      case 'UBAH_PASSWORD': return 'bg-indigo-50 text-indigo-700 border border-indigo-100';
      case 'DOWNLOAD_TRANSAKSI': return 'bg-purple-50 text-purple-700 border border-purple-100';
      case 'UBAH_KEBIJAKAN_BUKTI': return 'bg-teal-50 text-teal-700 border border-teal-100';
      case 'TAMBAH_PROYEK': return 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100';
      case 'EDIT_PROYEK': return 'bg-pink-50 text-pink-700 border border-pink-100';
      case 'HAPUS_PROYEK': return 'bg-neutral-100 text-neutral-700 border border-neutral-200';
      case 'TAMBAH_AKUN': return 'bg-blue-50 text-blue-700 border border-blue-100';
      case 'EDIT_AKUN': return 'bg-orange-50 text-orange-700 border border-orange-100';
      case 'HAPUS_AKUN': return 'bg-stone-100 text-stone-700 border border-stone-200';
      default: return 'bg-slate-50 text-slate-600 border border-slate-150';
    }
  };

  return (
    <div id="admin-logs-view" className="space-y-6">
      
      {/* Header section with print & actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
            <History className="w-5.5 h-5.5 text-slate-705" />
            <span>Log Aktivitas Sistem (Admin Only)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekaman jejak aktivitas operasional, penambahan data, pengunduhan kas, dan perubahan konfigurasi sistem.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
          <button
            onClick={handleRefresh}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-xl transition-all shadow-3xs"
            title="Muat Ulang Log"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <select
            value={logFormat}
            onChange={(e) => setLogFormat(e.target.value as any)}
            className="px-3 py-2.5 bg-white border border-slate-200 text-slate-650 font-semibold text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-950 transition-all cursor-pointer shadow-3xs"
          >
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="pdf">PDF (.pdf)</option>
            <option value="csv">CSV (.csv)</option>
          </select>
          
          <button
            onClick={() => handleDownloadLogs(logFormat)}
            disabled={filteredLogs.length === 0}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Unduh Log</span>
          </button>

          <button
            onClick={handleClearLogs}
            disabled={logs.length === 0}
            className="px-4 py-2.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-3xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            <span>Bersihkan All Log</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input 
            type="text" 
            placeholder="Cari log berdasarkan pengguna, jenis aktivitas, waktu, atau detail log..." 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 focus:bg-white"
          />
        </div>
        {searchTerm && (
          <button
            onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
            className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition"
          >
            Reset
          </button>
        )}
      </div>

      {/* Main Table view */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-display">
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Hak Akses</th>
                <th className="py-3 px-4">Aktivitas</th>
                <th className="py-3 px-4">Keterangan Detail</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-600 divide-y divide-slate-100">
              {currentLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center gap-2 justify-center">
                      <AlertCircle className="w-8 h-8 text-slate-300" />
                      <span>Belum ada log aktivitas terdaftar atau tidak ada hasil yang cocok.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                currentLogs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/25 transition-colors">
                    <td className="py-4 px-4 font-mono font-medium text-slate-500 whitespace-nowrap text-[11px]">
                      {new Date(l.timestamp).toLocaleString('id-ID')}
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-700 capitalize">
                      {l.username}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 bg-slate-50 rounded-full border border-slate-150 text-[10px] text-slate-600 font-mono">
                        {l.role}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[9.5px] font-bold tracking-wider uppercase font-mono ${formatActivityAction(l.action)}`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 max-w-md font-medium">
                      {l.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer Pagination controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>
              Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredLogs.length)} dari {filteredLogs.length} log
            </span>
            <div className="flex gap-2.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5 inline mr-0.5" /> Sebelumnya
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Selanjutnya <ChevronRight className="w-3.5 h-3.5 inline ml-0.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
