import React, { useState, useEffect } from 'react';
import { Transaction, Project, Role, FinancialCategory, TransactionType, Account, ProjectItem } from '../types';
import { getAccounts, getProjects } from '../utils/db';
import { addActivityLog } from '../utils/activityLogger';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportHelper';
import { 
  Plus, Search, Trash2, Edit, X, Save, 
  Printer, ChevronLeft, ChevronRight, Check, AlertTriangle
} from 'lucide-react';

interface TransactionViewProps {
  transactions: Transaction[];
  currentRole: Role;
  currentUser: string;
  onAddTransaction: (tx: Transaction) => Promise<boolean>;
  onUpdateTransaction: (tx: Transaction) => Promise<boolean>;
  onDeleteTransaction: (id: string) => Promise<boolean>;
  initialFilter?: { project?: Project; type?: 'Inflow' | 'Outflow' };
}

export default function TransactionView({ 
  transactions, 
  currentRole, 
  currentUser,
  onAddTransaction, 
  onUpdateTransaction, 
  onDeleteTransaction,
  initialFilter
}: TransactionViewProps) {
  
  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState<Project | 'All'>(initialFilter?.project || 'All');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'All'>(initialFilter?.type || 'All');
  const [categoryFilter, setCategoryFilter] = useState<FinancialCategory | 'All'>('All');
  const [accountFilter, setAccountFilter] = useState<string | 'All'>('All');
  
  // Date range download states
  const [downloadStartDate, setDownloadStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [downloadEndDate, setDownloadEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [txDownloadFormat, setTxDownloadFormat] = useState<'xlsx' | 'pdf' | 'csv'>('xlsx');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState('');
  
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formProject, setFormProject] = useState<Project>('');
  const [formType, setFormType] = useState<TransactionType>('Outflow');
  const [formCategory, setFormCategory] = useState<FinancialCategory>('Operational');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDescription, setFormDescription] = useState('');
  const [formAccount, setFormAccount] = useState('');

  const [accountsList, setAccountsList] = useState<Account[]>([]);
  const [projectsList, setProjectsList] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRequiredData = async () => {
      try {
        const [accs, projs] = await Promise.all([getAccounts(), getProjects()]);
        setAccountsList(accs);
        setProjectsList(projs);
        
        if (projs.length > 0) {
          setFormProject(projs[0].name);
        }
        
        // Auto-select standard default based on role
        const allowed = accs.filter(a => {
          if (currentRole === 'Pengelola') return a.type === 'Project';
          return true;
        });
        if (allowed.length > 0) {
          setFormAccount(allowed[0].name);
        }
      } catch (err) {
        console.error('Failed to load required data in TransactionView:', err);
      } finally {
        setLoading(false);
      }
    };
    loadRequiredData();
  }, [currentRole]);

  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset form
  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    if (projectsList.length > 0) {
      setFormProject(projectsList[0].name);
    } else {
      setFormProject('');
    }
    setFormType('Outflow');
    setFormCategory('Operational');
    setFormAmount('');
    setFormDescription('');
    setFormError('');
    setIsEditing(false);
    setEditingId('');
    
    const allowed = accountsList.filter(a => {
      if (currentRole === 'Pengelola') return a.type === 'Project';
      return true;
    });
    if (allowed.length > 0) {
      setFormAccount(allowed[0].name);
    } else {
      setFormAccount('');
    }
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    resetForm();
  };

  // Enforce role permission limits
  const canModifyOrDelete = (tx: Transaction) => {
    if (currentRole === 'Admin' || currentRole === 'Accounting') {
      return true;
    }
    if (currentRole === 'Finance') {
      return true;
    }
    if (currentRole === 'Pengelola') {
      return tx.category === 'Operational' && tx.recordedBy === currentUser;
    }
    return false;
  };

  const canAdd = () => true;

  // Editing transaction
  const handleEditClick = (tx: Transaction) => {
    if (!canModifyOrDelete(tx)) {
      alert('Anda tidak memiliki akses untuk mengubah transaksi ini.');
      return;
    }
    setIsEditing(true);
    setEditingId(tx.id);
    setFormDate(tx.date);
    setFormProject(tx.project);
    setFormType(tx.type);
    setFormCategory(tx.category);
    setFormAmount(tx.amount);
    setFormDescription(tx.description);
    setFormAccount(tx.account || '');
    setShowForm(true);
  };

  // Submitting form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!formAmount || Number(formAmount) <= 0) {
      setFormError('Nominal transaksi harus berupa angka positif.');
      return;
    }
    if (!formDescription.trim()) {
      setFormError('Deskripsi transaksi wajib diisi.');
      return;
    }
    if (!formAccount) {
      setFormError('Silakan pilih salah satu akun keuangan.');
      return;
    }

    const txId = isEditing ? editingId : `tx-${Math.floor(Date.now() + Math.random() * 1000)}`;
    
    let finalCategory = formCategory;
    if (currentRole === 'Pengelola') {
      finalCategory = 'Operational';
    }

    const txData: Transaction = {
      id: txId,
      date: formDate,
      project: formProject,
      type: formType,
      category: finalCategory,
      amount: Number(formAmount),
      description: formDescription.trim(),
      recordedBy: isEditing ? (transactions.find(t => t.id === editingId)?.recordedBy || currentUser) : currentUser,
      createdAt: isEditing ? (transactions.find(t => t.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      account: formAccount,
      image: ''
    };

    let success = false;
    try {
      if (isEditing) {
        success = await onUpdateTransaction(txData);
      } else {
        success = await onAddTransaction(txData);
      }
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan transaksi. Koneksi sistem bermasalah.');
      return;
    }

    if (success) {
      if (isEditing) {
        addActivityLog('EDIT_TRANSAKSI', `Mengubah Transaksi ${txId} senilai Rp ${Number(formAmount).toLocaleString('id-ID')} (Proyek ${formProject} - Akun ${formAccount})`);
      } else {
        addActivityLog('TAMBAH_TRANSAKSI', `Menambahkan Transaksi ${txId} senilai Rp ${Number(formAmount).toLocaleString('id-ID')} (Proyek ${formProject} - Akun ${formAccount})`);
      }
      setSuccessMsg(isEditing ? 'Berhasil mengupdate transaksi!' : 'Berhasil menambahkan transaksi baru!');
      setTimeout(() => {
        setupFilteredPageCountAndReset();
        setShowForm(false);
        resetForm();
      }, 1000);
    } else {
      setFormError('Terjadi kesalahan koneksi saat menginput data ke database.');
    }
  };

  // Deleting transaction
  const handleDeleteClick = async (tx: Transaction) => {
    if (!canModifyOrDelete(tx)) {
      alert('Anda tidak memiliki izin untuk menghapus transaksi ini.');
      return;
    }

    const conf = window.confirm(
      `Hapus pencatatan transaksi:\nProyek: ${tx.project}\nJumlah: Rp ${tx.amount.toLocaleString('id-ID')}\nKeterangan: "${tx.description}"?\n\nTindakan ini tidak bisa dibatalkan.`
    );
    if (!conf) return;

    try {
      const success = await onDeleteTransaction(tx.id);
      if (success) {
        addActivityLog('HAPUS_TRANSAKSI', `Menghapus Transaksi ${tx.id} senilai Rp ${tx.amount.toLocaleString('id-ID')} (Proyek ${tx.project})`);
        setupFilteredPageCountAndReset();
      } else {
        alert('Gagal menghapus dari database. Periksa koneksi Google Sheets Anda.');
      }
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message || String(err)}`);
    }
  };

  const handleDownloadTransactions = (format: 'xlsx' | 'pdf' | 'csv') => {
    let listToExport = [...transactions];
    if (downloadStartDate) {
      listToExport = listToExport.filter(t => t.date >= downloadStartDate);
    }
    if (downloadEndDate) {
      listToExport = listToExport.filter(t => t.date <= downloadEndDate);
    }

    listToExport.sort((a, b) => a.date.localeCompare(b.date));

    const headers = ['ID Transaksi', 'Tanggal', 'Proyek', 'Kategori', 'Jenis Kas', 'Akun (COA)', 'Nominal (Rp)', 'Keterangan', 'Dicatat Oleh', 'Dibuat Pada'];
    const rows = listToExport.map(t => [
      t.id,
      t.date,
      t.project,
      t.category === 'Operational' ? 'Operasional' : 'Non-Operasional',
      t.type === 'Inflow' ? 'Uang Masuk (Inflow)' : 'Uang Keluar (Outflow)',
      t.account || '-',
      t.amount.toString(),
      t.description,
      t.recordedBy,
      t.createdAt
    ]);

    const rangeStr = (downloadStartDate || 'Mulai') + '_s_d_' + (downloadEndDate || 'Sekarang');
    const fileName = `laporan_arus_kas_${rangeStr}`;

    if (format === 'csv') {
      exportToCSV(headers, rows, fileName);
    } else if (format === 'xlsx') {
      exportToExcel(headers, rows, 'Laporan Kas', fileName);
    } else if (format === 'pdf') {
      exportToPDF(
        'LAPORAN ARUS KAS GREENHOUSE',
        headers,
        rows,
        fileName,
        'landscape',
        `Periode Laporan: ${downloadStartDate || 'Awal'} s/d ${downloadEndDate || 'Akhir'} | Total: ${listToExport.length} transaksi.`
      );
    }

    addActivityLog('DOWNLOAD_TRANSAKSI', `Mengunduh ${listToExport.length} data transaksi format ${format.toUpperCase()} periode ${downloadStartDate || 'Awal'} s/d ${downloadEndDate || 'Akhir'}`);
  };

  const setupFilteredPageCountAndReset = () => {
    setCurrentPage(1);
  };

  // Process filter logic
  const getFilteredList = () => {
    let list = [...transactions];

    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      list = list.filter(t => 
        t.description.toLowerCase().includes(s) || 
        t.recordedBy.toLowerCase().includes(s) || 
        t.amount.toString().includes(s)
      );
    }

    if (projectFilter !== 'All') {
      list = list.filter(t => t.project === projectFilter);
    }

    if (typeFilter !== 'All') {
      list = list.filter(t => t.type === typeFilter);
    }

    if (categoryFilter !== 'All') {
      list = list.filter(t => t.category === categoryFilter);
    }

    if (accountFilter !== 'All') {
      list = list.filter(t => t.account === accountFilter);
    }
    
    return list;
  };

  const filteredList = getFilteredList();
  const sortedList = filteredList.sort((a, b) => b.date.localeCompare(a.date));

  const totalPages = Math.ceil(sortedList.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedList.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div id="transaction-view" className="space-y-6">
      
      {/* Header section with add button and roles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800">
            Pencatatan Arus Kas Keuangan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar lengkap uang masuk & keluar untuk 4 entitas operasional maupun administratif.
          </p>
        </div>

        {canAdd() && (
          <button
            onClick={handleOpenAdd}
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 border border-transparent hover:bg-emerald-700 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Transaksi Baru
          </button>
        )}
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
          {/* Search bar */}
          <div className="relative lg:col-span-2">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text" 
              placeholder="Cari deskripsi, nominal, pencacat..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setupFilteredPageCountAndReset(); }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 focus:bg-white"
            />
          </div>

          {/* Project select */}
          <div>
            <select
              value={projectFilter}
              onChange={(e) => { setProjectFilter(e.target.value as Project | 'All'); setupFilteredPageCountAndReset(); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:bg-white"
            >
              <option value="All">Semua Proyek</option>
              {projectsList.map(proj => (
                <option key={proj.id} value={proj.name}>Proyek {proj.name}</option>
              ))}
            </select>
          </div>

          {/* Type Inflow/Outflow */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as TransactionType | 'All'); setupFilteredPageCountAndReset(); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:bg-white"
            >
              <option value="All">Semua Jenis Kas</option>
              <option value="Inflow">Uang Masuk (Inflow)</option>
              <option value="Outflow">Uang Keluar (Outflow)</option>
            </select>
          </div>

          {/* Category split */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value as FinancialCategory | 'All'); setupFilteredPageCountAndReset(); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:bg-white"
            >
              <option value="All">Semua Kategori</option>
              <option value="Operational">Operasional Kebun</option>
              <option value="Non-Operational">Non-Operational</option>
            </select>
          </div>

          {/* Account Filter dropdown */}
          <div>
            <select
              value={accountFilter}
              onChange={(e) => { setAccountFilter(e.target.value); setupFilteredPageCountAndReset(); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:bg-white"
            >
              <option value="All">Semua COA</option>
              {accountsList.map(acc => (
                <option key={acc.id} value={acc.name}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Export Section */}
        <div className="border-t border-slate-150 pt-4 mt-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 w-full md:w-auto text-xs text-slate-600">
            <span className="font-bold uppercase tracking-wide text-slate-750 flex items-center gap-1.5 shrink-0 font-display">
              <Printer className="w-4 h-4 text-emerald-600" />
              <span>Unduh Laporan Kas:</span>
            </span>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-405 font-bold uppercase">Mulai</span>
                <input 
                  type="date"
                  value={downloadStartDate}
                  onChange={(e) => setDownloadStartDate(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1 font-mono text-[11px] bg-slate-50 focus:outline-none focus:bg-white text-slate-700 font-semibold"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-405 font-bold uppercase">Sampai</span>
                <input 
                  type="date"
                  value={downloadEndDate}
                  onChange={(e) => setDownloadEndDate(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1 font-mono text-[11px] bg-slate-50 focus:outline-none focus:bg-white text-slate-700 font-semibold"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={txDownloadFormat}
              onChange={(e) => setTxDownloadFormat(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-200 text-slate-650 font-semibold text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-950 transition-all cursor-pointer shadow-3xs"
            >
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="pdf">PDF (.pdf)</option>
              <option value="csv">CSV (.csv)</option>
            </select>
            <button
              onClick={() => handleDownloadTransactions(txDownloadFormat)}
              className="flex-1 md:flex-initial px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs shrink-0 cursor-pointer active:scale-99"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Unduh Laporan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table view */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-display">
                <th className="py-3 px-4">ID Transaksi</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Proyek</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Akun (COA)</th>
                <th className="py-3 px-4 text-right">Uang Masuk</th>
                <th className="py-3 px-4 text-right">Uang Keluar</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-4">Dicatat Oleh</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-600 divide-y divide-slate-100">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                    Tidak ditemukan pencatatan transaksi yang cocok dengan pencarian Anda.
                  </td>
                </tr>
              ) : (
                currentItems.map(t => {
                  const allowedToEdit = canModifyOrDelete(t);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 font-mono font-medium text-slate-400 text-[10px]">{t.id}</td>
                      <td className="py-4 px-4 font-mono font-medium text-slate-700">{t.date}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide ${
                          t.project === 'Melon' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          t.project === 'Cabe' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          t.project === 'Perikanan' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          'bg-purple-50 text-purple-700 border border-purple-100'
                        }`}>
                          {t.project}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium leading-normal ${
                          t.category === 'Operational' ? 'bg-slate-100 text-slate-600' : 'bg-orange-50 text-orange-700 border border-orange-100'
                        }`}>
                          {t.category === 'Operational' ? 'Operasional' : 'Non-Operasional'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {t.account ? (
                          <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-[10.5px] font-semibold border border-slate-200">
                            {t.account}
                          </span>
                        ) : (
                          <span className="text-slate-350 italic text-[10.5px]">Tanpa Akun</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-emerald-600">
                        {t.type === 'Inflow' ? `+ Rp ${t.amount.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-rose-600">
                        {t.type === 'Outflow' ? `- Rp ${t.amount.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="py-4 px-4 text-slate-600" title={t.description}>
                        <span className="line-clamp-1 max-w-xs">{t.description}</span>
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-500 text-[11px]">
                        <span className="px-2 py-0.5 bg-slate-50 rounded-full border border-slate-105 text-slate-600 font-mono capitalize">
                          {t.recordedBy}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-semibold">
                          <button
                            onClick={() => handleEditClick(t)}
                            disabled={!allowedToEdit}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              allowedToEdit 
                                ? 'bg-white border-slate-200 text-slate-655 hover:bg-slate-50 hover:text-indigo-600' 
                                : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                            }`}
                            title={allowedToEdit ? 'Edit Transaksi' : 'Anda tidak punya akses mengubah ini'}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(t)}
                            disabled={!allowedToEdit}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              allowedToEdit 
                                ? 'bg-white border-slate-200 text-slate-655 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100' 
                                : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                            }`}
                            title={allowedToEdit ? 'Hapus Transaksi' : 'Anda tidak punya akses menghapus ini'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer Pagination controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium font-sans">
            <span>
              Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, sortedList.length)} dari {sortedList.length} transaksi
            </span>
            <div className="flex gap-2.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-655 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5 inline mr-0.5" /> Sebelumnya
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-655 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Selanjutnya <ChevronRight className="w-3.5 h-3.5 inline ml-0.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Insert / Editing Transaction Modal Overlay */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-100 w-full max-w-lg shadow-xl flex flex-col my-auto max-h-[92vh] sm:max-h-[90vh] animate-in fade-in zoom-in duration-200 relative overflow-hidden text-slate-600 font-sans text-xs">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 px-5 py-4 bg-slate-50/50">
              <h3 className="font-display font-extrabold text-slate-800 text-sm sm:text-base">
                {isEditing ? 'Ubah Record Transaksi' : 'Masukkan Transaksi Baru'}
              </h3>
              <button 
                type="button"
                onClick={handleCloseForm} 
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all border border-slate-150"
                title="Tutup lembar masukan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden text-xs">
              
              {/* Scrollable Form Area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-semibold">{formError}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3.5">
                  {/* Date Picker */}
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold uppercase text-[10px]">TANGGAL TRANSAKSI</label>
                    <input 
                      type="date" 
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white text-xs font-medium"
                    />
                  </div>

                  {/* Project selector */}
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold uppercase text-[10px]">PROYEK TERKAIT</label>
                    <select
                      value={formProject}
                      onChange={(e) => setFormProject(e.target.value as Project)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white text-xs font-bold text-slate-800"
                    >
                      {projectsList.map(proj => (
                        <option key={proj.id} value={proj.name}>{proj.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {/* Transaction Type */}
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold uppercase text-[10px]">JENIS KREDIT/KAS</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as TransactionType)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white text-xs font-bold text-slate-700"
                    >
                      <option value="Outflow">Keluar (Pembelanjaan / Outflow)</option>
                      <option value="Inflow">Masuk (Pendapatan / Inflow)</option>
                    </select>
                  </div>

                  {/* Category Selection (Restricted if Pengelola) */}
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold uppercase text-[10px]">KATEGORI TRANSAKSI</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as FinancialCategory)}
                      disabled={currentRole === 'Pengelola'}
                      className={`w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white text-xs font-medium ${
                        currentRole === 'Pengelola' ? 'opacity-85 cursor-not-allowed bg-slate-100' : ''
                      }`}
                    >
                      <option value="Operational">Operasional Kebun</option>
                      <option value="Non-Operational">Non-Operasional</option>
                    </select>
                    {currentRole === 'Pengelola' && (
                      <span className="text-[10px] text-amber-600 block mt-1 font-semibold">
                        *Role Pengelola terkunci hanya pada Operasional.
                      </span>
                    )}
                  </div>
                </div>

                {/* Account / COA */}
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold uppercase text-[10px]">AKUN KEUANGAN (COA)</label>
                  <select
                    value={formAccount}
                    onChange={(e) => setFormAccount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white text-xs font-bold text-slate-800"
                    required
                  >
                    <option value="" disabled>-- Pilih Akun Keuangan --</option>
                    {accountsList
                      .filter(acc => {
                        if (currentRole === 'Pengelola') {
                          return acc.type === 'Project';
                        }
                        return true;
                      })
                      .map(acc => (
                        <option key={acc.id} value={acc.name}>
                          {acc.name} ({acc.type === 'Project' ? 'Project / Operasional' : 'All / Non-Project'})
                        </option>
                      ))
                    }
                  </select>
                  {currentRole === 'Pengelola' && (
                    <span className="text-[10px] text-amber-650 block mt-1">
                      *Sebagai Pengelola, Anda hanya diizinkan mengakses Akun tipe Project.
                    </span>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold uppercase text-[10px]">NOMINAL (RUPIAH)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center font-bold text-slate-400">Rp</span>
                    <input 
                      type="text" 
                      placeholder="Masukkan nominal angka (cth: 15.000.000)..." 
                      value={formAmount !== '' ? formAmount.toLocaleString('id-ID') : ''}
                      onChange={(e) => {
                        const cleanStr = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                        setFormAmount(cleanStr !== '' ? parseInt(cleanStr, 10) : '');
                      }}
                      required
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white font-mono font-bold text-xs"
                    />
                  </div>
                  {formAmount !== '' && (
                    <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
                      Terbilang: Rp {formAmount.toLocaleString('id-ID')}
                    </span>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold uppercase text-[10px]">KETERANGAN & DESKRIPSI</label>
                  <textarea
                    rows={3}
                    placeholder="Contoh: Pembelian pupuk AB Mix, Penjualan kelinci hias, dll..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white text-xs font-medium"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="flex gap-2.5 justify-end p-4 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 border border-slate-250 bg-white rounded-xl text-slate-655 hover:bg-slate-50 transition-colors font-semibold shadow-3xs text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-950 hover:bg-slate-800 text-white font-semibold rounded-xl flex items-center gap-1 transition-colors text-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isEditing ? 'Perbarui Data' : 'Simpan Transaksi'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
