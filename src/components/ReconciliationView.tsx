import React, { useState } from 'react';
import { Transaction, Project, Role, User } from '../types';
import { isTxApproved } from '../utils/approvalHelper';
import { addActivityLog } from '../utils/activityLogger';
import { getProjectBadgeClass } from './DashboardView';
import { 
  CheckSquare, Search, SlidersHorizontal, Sliders, AlertCircle, 
  HelpCircle, Image, Check, Clock, ShieldAlert, Lock, Unlock, RefreshCw 
} from 'lucide-react';

interface ReconciliationViewProps {
  transactions: Transaction[];
  usersList: User[];
  onUpdateTransaction: (tx: Transaction) => Promise<boolean>;
  currentRole: Role;
}

export default function ReconciliationView({ 
  transactions, 
  usersList, 
  onUpdateTransaction,
  currentRole
}: ReconciliationViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState<Project | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Helper to check if a user is Pengelola
  const isFromPengelola = (tx: Transaction) => {
    const recLower = (tx.recordedBy || '').toLowerCase();
    if (recLower === 'pengelola') return true;
    
    // Check in usersList
    const matchUser = usersList.find(u => u.username.toLowerCase() === recLower);
    return matchUser?.role === 'Pengelola';
  };

  // Get only Inflow transactions added by Pengelola
  const pengelolaInflows = transactions.filter(t => t.type === 'Inflow' && isFromPengelola(t));

  // Handlers
  const handleToggleApprove = async (tx: Transaction) => {
    if (currentRole !== 'Finance' && currentRole !== 'Admin') {
      alert('Hanya role Finance dan Admin yang berwenang melakukan rekonsiliasi data.');
      return;
    }

    const isCurrentlyApproved = isTxApproved(tx);
    const isLocked = tx.isLocked === true || tx.isLocked === 'TRUE' || tx.isLocked === 'true';

    // Restriction: "Jika transaksi sudah di-lock, maka checkbox tidak bisa di-uncheck."
    if (isLocked && isCurrentlyApproved) {
      alert('Transaksi ini telah TERKUNCI (locked). Pengesahan (Approval) tidak dapat dibatalkan.');
      return;
    }

    setUpdatingId(tx.id);
    const nextApprovedState = !isCurrentlyApproved;
    const updatedTx: Transaction = {
      ...tx,
      isApproved: nextApprovedState
    };

    try {
      const success = await onUpdateTransaction(updatedTx);
      if (success) {
        addActivityLog(
          nextApprovedState ? 'REKONSILIASI_SETUJU' : 'REKONSILIASI_BATAL_SETUJU',
          `${currentRole} melakukan rekonsiliasi Uang Masuk (Inflow) transaksi ${tx.id} senilai Rp ${tx.amount.toLocaleString('id-ID')} (Proyek ${tx.project}): Status -> ${nextApprovedState ? 'DISETUJUI' : 'DIBATALKAN'}`
        );
      } else {
        alert('Gagal memperbarui status rekonsiliasi transaksi.');
      }
    } catch (err: any) {
      alert(`Error saat memperbarui: ${err.message || String(err)}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Unique projects represented in Pengelola's inflows
  const uniqueProjects = Array.from(new Set(pengelolaInflows.map(t => t.project))).filter(Boolean);

  // Filters logic
  const filteredItems = pengelolaInflows.filter(t => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      t.id.toLowerCase().includes(searchLower) ||
      (t.description || '').toLowerCase().includes(searchLower) ||
      (t.recordedBy || '').toLowerCase().includes(searchLower) ||
      (t.account || '').toLowerCase().includes(searchLower) ||
      String(t.amount || '').includes(searchLower);

    // Project filter
    const matchesProject = projectFilter === 'All' || t.project === projectFilter;

    // Status filter
    const isApproved = isTxApproved(t);
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'approved' && isApproved) || 
      (statusFilter === 'pending' && !isApproved);

    return matchesSearch && matchesProject && matchesStatus;
  });

  // Highlight figures
  const totalAmount = pengelolaInflows.reduce((sum, t) => sum + t.amount, 0);
  const approvedInflows = pengelolaInflows.filter(isTxApproved);
  const approvedAmount = approvedInflows.reduce((sum, t) => sum + t.amount, 0);
  const pendingInflows = pengelolaInflows.filter(t => !isTxApproved(t));
  const pendingAmount = pendingInflows.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div id="reconciliation-view" className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl">
              <CheckSquare className="w-5 h-5 animate-pulse" />
            </div>
            <h1 className="text-xl font-display font-semibold text-slate-800">Rekonsiliasi Uang Masuk</h1>
          </div>
          <p className="text-xs text-slate-500">
            Seluruh pendapatan/arus kas masuk (Inflow) yang di-input oleh role <span className="font-extrabold text-slate-700">Pengelola Lapangan</span>. Data ini harus disetujui untuk dimasukkan dalam hitungan pendapatan.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-150 px-3 py-2 rounded-xl text-slate-600 font-medium">
          <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Wewenang Verifikasi: <strong className="text-emerald-700 font-bold">Admin / Finance</strong></span>
        </div>
      </div>

      {/* METRIC BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Inflows */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between gap-4 shadow-3xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase font-display">Total Setoran Pengelola</span>
            <p className="text-2xl font-bold text-slate-800 font-mono">
              Rp {totalAmount.toLocaleString('id-ID')}
            </p>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <strong>{pengelolaInflows.length}</strong> total transaksi Inflow
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-100 text-slate-600 rounded-2xl">
            <Sliders className="w-5 h-5 text-slate-600" />
          </div>
        </div>

        {/* Approved Amount */}
        <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex items-center justify-between gap-4 shadow-3xs">
          <div className="space-y-1">
            <span className="text-[10px] text-emerald-600 font-bold tracking-wider uppercase font-display">Telah Disetujui (Approved)</span>
            <p className="text-2xl font-bold text-emerald-800 font-mono">
              Rp {approvedAmount.toLocaleString('id-ID')}
            </p>
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <strong>{approvedInflows.length}</strong> disetujui (berdampak ke laba-rugi)
            </span>
          </div>
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
            <Check className="w-5 h-5 text-emerald-700" />
          </div>
        </div>

        {/* Pending Amount */}
        <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 flex items-center justify-between gap-4 shadow-3xs">
          <div className="space-y-1">
            <span className="text-[10px] text-amber-600 font-bold tracking-wider uppercase font-display">Menunggu Verifikasi (Pending)</span>
            <p className="text-2xl font-bold text-amber-800 font-mono">
              Rp {pendingAmount.toLocaleString('id-ID')}
            </p>
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <strong>{pendingInflows.length}</strong> pending (belum dihitung pendapatan)
            </span>
          </div>
          <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl animate-pulse">
            <Clock className="w-5 h-5 text-amber-700" />
          </div>
        </div>
      </div>

      {/* FILTER & ADVANCED CONTROLS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-sm font-bold text-slate-800">Daftar Setoran Transaksi Inflow Pengelola</h2>
          <div className="text-xs text-slate-500 font-medium">
            Menampilkan <strong className="text-slate-800">{filteredItems.length}</strong> dari <strong className="text-slate-800">{pengelolaInflows.length}</strong> setoran
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search bar */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari ID, keterangan, nominal, dicatat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-205 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs rounded-xl text-slate-700 font-medium placeholder-slate-400 transition-colors"
            />
          </div>

          {/* Project Filter */}
          <div className="md:col-span-3">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value as Project | 'All')}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-205 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs rounded-xl text-slate-700 font-medium transition-colors cursor-pointer"
            >
              <option value="All">Semua Proyek ({uniqueProjects.length})</option>
              {uniqueProjects.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'approved' | 'pending')}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-205 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs rounded-xl text-slate-700 font-medium transition-colors cursor-pointer"
            >
              <option value="all">Semua Status Pengesahan</option>
              <option value="approved">Hanya Disetujui (Approved)</option>
              <option value="pending">Hanya Menunggu (Pending)</option>
            </select>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-3xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                <th className="py-4 px-4 text-center w-20">Approve</th>
                <th className="py-4 px-4 w-32">Tanggal</th>
                <th className="py-4 px-4 w-32">Proyek</th>
                <th className="py-4 px-4">Akun COA</th>
                <th className="py-4 px-4 text-right w-44">Nominal</th>
                <th className="py-4 px-4">Keterangan</th>
                <th className="py-4 px-4 w-32">Dicatat</th>
                <th className="py-4 px-4 text-center w-20">Bukti</th>
                <th className="py-4 px-4 text-center w-16">Kunci</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-semibold">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <SlidersHorizontal className="w-8 h-8 text-slate-300" />
                      <span>Tidak ada data setoran yang cocok dengan filter Anda.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((tx) => {
                  const isApproved = isTxApproved(tx);
                  const isLocked = tx.isLocked === true || tx.isLocked === 'TRUE' || tx.isLocked === 'true';
                  const isDisableCheckbox = isLocked && isApproved;

                  return (
                    <tr 
                      key={tx.id} 
                      className={`transition-colors hover:bg-slate-50/50 ${
                        isApproved ? 'bg-emerald-50/10' : 'bg-amber-50/5'
                      }`}
                    >
                      {/* APPROVE ACTION (CHECKBOX) */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center">
                          {updatingId === tx.id ? (
                            <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                          ) : (
                            <input
                              type="checkbox"
                              checked={isApproved}
                              onChange={() => handleToggleApprove(tx)}
                              disabled={isDisableCheckbox}
                              className={`w-4 h-4 rounded border-slate-305 text-emerald-650 focus:ring-emerald-505 transition-all text-center ${
                                isDisableCheckbox 
                                  ? 'opacity-60 cursor-not-allowed bg-slate-150 border-slate-200' 
                                  : 'cursor-pointer hover:scale-110'
                              }`}
                              title={
                                isDisableCheckbox 
                                  ? "Transaksi dikunci. Pengesahan tidak bisa dibatalkan." 
                                  : "Togel status persetujuan Cash Inflow dari Pengelola"
                              }
                            />
                          )}
                        </div>
                      </td>

                      {/* DATE */}
                      <td className="py-4 px-4 font-normal text-slate-500 font-mono truncate">
                        {tx.date}
                      </td>

                      {/* PROJECT */}
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${getProjectBadgeClass(tx.project)}`}>
                          {tx.project}
                        </span>
                      </td>

                      {/* COA ACCOUNT */}
                      <td className="py-4 px-4 font-mono font-medium text-slate-600 truncate max-w-[120px]">
                        {tx.account || '-'}
                      </td>

                      {/* AMOUNT */}
                      <td className="py-4 px-4 text-right font-mono text-slate-805 font-bold">
                        Rp {tx.amount.toLocaleString('id-ID')}
                      </td>

                      {/* DESCRIPTION */}
                      <td className="py-4 px-4 font-normal text-slate-600 truncate max-w-[160px]" title={tx.description}>
                        {tx.description || '-'}
                      </td>

                      {/* RECORDED BY */}
                      <td className="py-4 px-4 font-normal text-slate-500 truncate">
                        {tx.recordedBy}
                      </td>

                      {/* EVIDENCE IMAGE */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center">
                          {tx.image ? (
                            <button
                              onClick={() => setSelectedImage(tx.image || null)}
                              className="p-1.5 bg-slate-50 border border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 rounded-lg transition-all"
                              title="Tampilkan Berkas Bukti"
                            >
                              <Image className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-slate-300 text-[10px] font-normal italic">-</span>
                          )}
                        </div>
                      </td>

                      {/* LOCK STATUS */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center">
                          {isLocked ? (
                            <Lock className="w-3.5 h-3.5 text-amber-500" title="Terkunci secara data" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5 text-slate-300" title="Terbuka secara data" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NOTIFICATION TO EXPLAIN PROCESS */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-3 text-xs text-blue-700 leading-relaxed font-semibold">
        <HelpCircle className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" />
        <div className="space-y-1">
          <p className="font-extrabold text-blue-800">Bagaimana Cara Kerja Rekonsiliasi?</p>
          <p className="font-normal text-blue-700">
            Agar operasional peternakan/perkebunan berjalan tertib, pemasukan yang dikirim tim Pengelola lapangan berstatus <strong>Pending</strong>. Pengelola hanya bisa mencatat ke sistem, sedangkan verifikasi nominal riil kas dilakukan oleh <strong>Finance</strong>. Selama transaksi belum disetujui (belum dicentang di sini), nominalnya tidak akan dimasukkan ke hitungan omzet, laporan laba-rugi, ataupun visualisasi grafik analitik.
          </p>
        </div>
      </div>

      {/* IMAGE ATTACHMENT MODAL SCREEN */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 transition-all animate-fade-in">
          <div className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Lampiran Bukti Transaksi Inflow</h3>
              <button 
                onClick={() => setSelectedImage(null)}
                className="p-1 px-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 hover:text-slate-700 transition"
              >
                Tutup✕
              </button>
            </div>
            <div className="p-6 flex items-center justify-center max-h-[70vh] bg-slate-50 overflow-y-auto">
              {selectedImage.startsWith('data:') || selectedImage.startsWith('http') ? (
                <img 
                  src={selectedImage} 
                  alt="Bukti Setoran" 
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full rounded-2xl object-contain border shadow-sm"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 p-8 text-slate-400 font-semibold text-center">
                  <ShieldAlert className="w-10 h-10 text-amber-500 animate-pulse" />
                  <p className="text-slate-650 truncate max-w-md">{selectedImage}</p>
                  <p className="text-[11px] font-normal text-slate-400">Gunakan tautan eksternal untuk mengakses file diluar server.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
