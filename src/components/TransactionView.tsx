import React, { useState, useEffect, useRef } from 'react';
import { Transaction, Project, Role, FinancialCategory, TransactionType, Account, ProjectItem } from '../types';
import { getAccounts, getProjects, getSettings, saveSettings, uploadFileToDrive } from '../utils/db';
import { addActivityLog } from '../utils/activityLogger';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportHelper';
import { 
  Plus, Search, Filter, Trash2, Edit, X, Save, HelpCircle, 
  ArrowUpRight, ArrowDownRight, Printer, AlertTriangle, Play, ChevronLeft, ChevronRight, Check, Database,
  Camera, Paperclip, Image, Loader2, Settings, KeyRound
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

  // Settings values
  const [imageRequiredIn, setImageRequiredIn] = useState(false);
  const [imageRequiredOut, setImageRequiredOut] = useState(false);
  const [loadingSetting, setLoadingSetting] = useState(true);

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
  const [formImage, setFormImage] = useState(''); // existing image url

  // Upload states
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileMimeType, setFileMimeType] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [accountsList, setAccountsList] = useState<Account[]>([]);
  const [projectsList, setProjectsList] = useState<ProjectItem[]>([]);

  useEffect(() => {
    const loadRequiredData = async () => {
      try {
        const [accs, projs, settings] = await Promise.all([getAccounts(), getProjects(), getSettings()]);
        setAccountsList(accs);
        setProjectsList(projs);
        setImageRequiredIn(settings.imageRequiredIn);
        setImageRequiredOut(settings.imageRequiredOut);
        
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
        setLoadingSetting(false);
      }
    };
    loadRequiredData();
  }, [currentRole]);

  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [drivePermissionError, setDrivePermissionError] = useState(false);

  // Reset form
  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    if (projectsList.length > 0) {
      setFormProject(projectsList[0].name);
    } else {
      setFormProject('');
    }
    setFormType('Outflow');
    // For Pengelola, keep Operational
    setFormCategory('Operational');
    setFormAmount('');
    setFormDescription('');
    setFormImage('');
    setFileBase64(null);
    setFileName('');
    setFileMimeType('');
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
      // Finance can access everything except they shouldn't delete Admin's direct logs if any,
      // but they have access to Pengelola's.
      return true;
    }
    if (currentRole === 'Pengelola') {
      // Pengelola can only edit/delete Operational transactions they themselves recorded
      return tx.category === 'Operational' && tx.recordedBy === currentUser;
    }
    return false;
  };

  // Check if current role can add transactions
  const canAdd = () => {
    // All roles can add, but Pengelola is restricted to Operational only.
    return true;
  };

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
    setFormImage(tx.image || '');
    setShowForm(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File terlalu besar! Batas ukuran maksimal gambar adalah 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFileBase64(reader.result as string);
      setFileName(file.name);
      setFileMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  // Force Save Transaction when DriveApp permission fails (empathy fallback)
  const handleForceSaveWithoutImage = async () => {
    setFormError('');
    setSuccessMsg('');
    setUploadingFile(true);

    const txId = isEditing ? editingId : `tx-${Math.floor(Date.now() + Math.random() * 1000)}`;
    const finalImageUrl = formImage || ''; // Keep manually entered link, or empty, no upload

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
      image: finalImageUrl
    };

    let success = false;
    if (isEditing) {
      success = await onUpdateTransaction(txData);
    } else {
      success = await onAddTransaction(txData);
    }

    setUploadingFile(false);

    if (success) {
      if (isEditing) {
        addActivityLog('EDIT_TRANSAKSI_FORCE', `Mengubah Transaksi ${txId} senilai Rp ${Number(formAmount).toLocaleString('id-ID')} (Pindah Manual / Tanpa Upload Drive)`);
      } else {
        addActivityLog('TAMBAH_TRANSAKSI_FORCE', `Menambahkan Transaksi ${txId} senilai Rp ${Number(formAmount).toLocaleString('id-ID')} (Pindah Manual / Tanpa Upload Drive)`);
      }
      setSuccessMsg(isEditing ? 'Transaksi berhasil diupdate tanpa diunggah ke Google Drive!' : 'Transaksi berhasil ditambahkan tanpa diunggah ke Google Drive!');
      setDrivePermissionError(false);
      setTimeout(() => {
        setupFilteredPageCountAndReset();
        setShowForm(false);
        resetForm();
      }, 1000);
    } else {
      setFormError('Terjadi kesalahan koneksi saat menginput data ke database.');
    }
  };

  // Submitting form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');
    setDrivePermissionError(false);

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

    // Check mandatory image upload rule
    let finalImageUrl = formImage || '';
    const isRequired = formType === 'Inflow' ? imageRequiredIn : imageRequiredOut;
    if (isRequired && !finalImageUrl && !fileBase64) {
      setFormError(`Sesuai Kebijakan Bukti Transaksi, Anda WAJIB mengunggah foto bukti gambar (Nota/Kuitansi) untuk transaksi ${formType === 'Inflow' ? 'Uang Masuk' : 'Uang Keluar'}.`);
      return;
    }

    const txId = isEditing ? editingId : `tx-${Math.floor(Date.now() + Math.random() * 1000)}`;
    
    setUploadingFile(true);
    if (fileBase64) {
      try {
        const ext = fileMimeType.split('/')[1] || 'jpg';
        const rawBase64 = fileBase64.includes(';base64,') ? fileBase64.split(';base64,')[1] : fileBase64;
        const uploadName = `bukti_${txId}_${Date.now()}.${ext}`;
        const returnedUrl = await uploadFileToDrive(uploadName, fileMimeType, rawBase64);
        finalImageUrl = returnedUrl;
      } catch (err: any) {
        const errMsg = err.message || '';
        if (errMsg.includes('DriveApp') || errMsg.includes('permission') || errMsg.includes('Permission')) {
          setDrivePermissionError(true);
        }
        setFormError(`Gagal mengunggah bukti gambar ke Google Drive: ${errMsg}.`);
        setUploadingFile(false);
        return;
      }
    }
    setUploadingFile(false);

    // Role-based Category lock enforcement
    let finalCategory = formCategory;
    if (currentRole === 'Pengelola') {
      // Strict operational lock
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
      image: finalImageUrl
    };

    let success = false;
    if (isEditing) {
      success = await onUpdateTransaction(txData);
    } else {
      success = await onAddTransaction(txData);
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

    const success = await onDeleteTransaction(tx.id);
    if (success) {
      addActivityLog('HAPUS_TRANSAKSI', `Menghapus Transaksi ${tx.id} senilai Rp ${tx.amount.toLocaleString('id-ID')} (Proyek ${tx.project})`);
      setupFilteredPageCountAndReset();
    } else {
      alert('Gagal menghapus dari database. Silakan ganti ke mode lokal atau cek koneksi Google Sheets Anda.');
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

    const headers = ['ID Transaksi', 'Tanggal', 'Proyek', 'Kategori', 'Jenis Kas', 'Akun (COA)', 'Nominal (Rp)', 'Keterangan', 'Dicatat Oleh', 'Tautan Bukti', 'Dibuat Pada'];
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
      t.image || '-',
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

    // Search filter
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      list = list.filter(t => 
        t.description.toLowerCase().includes(s) || 
        t.recordedBy.toLowerCase().includes(s) || 
        t.amount.toString().includes(s)
      );
    }

    // Project Filter
    if (projectFilter !== 'All') {
      list = list.filter(t => t.project === projectFilter);
    }

    // Type Filter
    if (typeFilter !== 'All') {
      list = list.filter(t => t.type === typeFilter);
    }

    // Category Filter
    if (categoryFilter !== 'All') {
      list = list.filter(t => t.category === categoryFilter);
    }

    // Account Filter
    if (accountFilter !== 'All') {
      list = list.filter(t => t.account === accountFilter);
    }

    // Role visible restriction: 
    // Wait! Let's think if any roles should be restricted from seeing certain sheets.
    // The requirement says:
    // "Pengelola (pencatatan uang masuk & keluar di operasional greenhouse)"
    // "Finance (pencatatan uang masuk & keluar selain opersional langsung, punya akses penuh ke pencatatan Pengelola)"
    // This implies Pengelola only writes and operates on Operational greenhouse directly.
    // Let's allow Pengelola to see all transactions but they can only delete or edit their own operational ones. This creates a beautifully transparent environment in the greenhouses while locking editing capabilities to make it audit-complying!
    
    return list;
  };

  const filteredList = getFilteredList();

  // Sort by date newest first
  const sortedList = filteredList.sort((a, b) => b.date.localeCompare(a.date));

  // Pagination logic
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

      {/* Kebijakan Bukti Upload Image (Admin/Finance/Accounting can set, anyone can see) */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-850 uppercase tracking-wider">
              Kebijakan Unggah Lampiran Bukti
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Tentukan apakah pengisian bukti gambar (Nota/Kuitansi) wajib dilampirkan berdasarkan jenis transaksi.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* UANG MASUK (Inflow) CARD */}
          <div className="bg-white border border-slate-150 p-4 rounded-xl flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Uang Masuk (Inflow)</span>
                {imageRequiredIn ? (
                  <span className="bg-rose-100 text-rose-700 text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase animate-pulse">
                    Wajib
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase">
                    Opsional
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                Pencatatan dana masuk dari donasi, deviden, dll.
              </p>
            </div>

            <div className="shrink-0">
              {['Admin', 'Finance', 'Accounting'].includes(currentRole) ? (
                <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-150 shadow-3xs">
                  <button
                    onClick={async () => {
                      setImageRequiredIn(true);
                      await saveSettings('imageRequiredIn', 'true');
                      addActivityLog('UBAH_KEBIJAKAN_BUKTI', 'Mengubah kebijakan bukti kas masuk (Inflow) menjadi Wajib');
                    }}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                      imageRequiredIn 
                        ? 'bg-rose-600 text-white shadow-xs' 
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Wajib
                  </button>
                  <button
                    onClick={async () => {
                      setImageRequiredIn(false);
                      await saveSettings('imageRequiredIn', 'false');
                      addActivityLog('UBAH_KEBIJAKAN_BUKTI', 'Mengubah kebijakan bukti kas masuk (Inflow) menjadi Opsional');
                    }}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                      !imageRequiredIn 
                        ? 'bg-slate-705 text-slate-700 hover:text-slate-800 bg-slate-200' 
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Opsional
                  </button>
                </div>
              ) : (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                  imageRequiredIn ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                }`}>
                  {imageRequiredIn ? 'Wajib Lampirkan' : 'Opsional'}
                </span>
              )}
            </div>
          </div>

          {/* UANG KELUAR (Outflow) CARD */}
          <div className="bg-white border border-slate-150 p-4 rounded-xl flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Uang Keluar (Outflow)</span>
                {imageRequiredOut ? (
                  <span className="bg-rose-100 text-rose-700 text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase animate-pulse">
                    Wajib
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase">
                    Opsional
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                Pencatatan pengeluaran dana operasional bibit, upah, dll.
              </p>
            </div>

            <div className="shrink-0">
              {['Admin', 'Finance', 'Accounting'].includes(currentRole) ? (
                <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-150 shadow-3xs">
                  <button
                    onClick={async () => {
                      setImageRequiredOut(true);
                      await saveSettings('imageRequiredOut', 'true');
                      addActivityLog('UBAH_KEBIJAKAN_BUKTI', 'Mengubah kebijakan bukti kas keluar (Outflow) menjadi Wajib');
                    }}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                      imageRequiredOut 
                        ? 'bg-rose-600 text-white shadow-xs' 
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Wajib
                  </button>
                  <button
                    onClick={async () => {
                      setImageRequiredOut(false);
                      await saveSettings('imageRequiredOut', 'false');
                      addActivityLog('UBAH_KEBIJAKAN_BUKTI', 'Mengubah kebijakan bukti kas keluar (Outflow) menjadi Opsional');
                    }}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                      !imageRequiredOut 
                        ? 'bg-slate-705 text-slate-700 hover:text-slate-800 bg-slate-200' 
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Opsional
                  </button>
                </div>
              ) : (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                  imageRequiredOut ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                }`}>
                  {imageRequiredOut ? 'Wajib Lampirkan' : 'Opsional'}
                </span>
              )}
            </div>
          </div>
        </div>
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
              <option value="All">Semua Akun (COA)</option>
              {accountsList.map(acc => (
                <option key={acc.id} value={acc.name}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Export Section (for rentang waktu tertentu, accessed by all roles) */}
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
                <th className="py-3 px-4 text-center">Bukti</th>
                <th className="py-3 px-4">Dicatat Oleh</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-600 divide-y divide-slate-100">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
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
                      <td className="py-4 px-4 text-center">
                        {t.image ? (
                          <button
                            onClick={() => window.open(t.image, '_blank')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-150 text-emerald-700 hover:text-emerald-800 rounded-lg text-[10px] font-bold transition-all shadow-3xs"
                            title="Buka lampiran bukti foto di Google Drive"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Buka</span>
                          </button>
                        ) : (
                          <span className="text-slate-350 italic text-[10px]">Tanpa Bukti</span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-500 text-[11px]">
                        <span className="px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100 text-slate-600 font-mono capitalize">
                          {t.recordedBy}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditClick(t)}
                            disabled={!allowedToEdit}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              allowedToEdit 
                                ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600' 
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
                                ? 'bg-white border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100' 
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
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>
              Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, sortedList.length)} dari {sortedList.length} transaksi
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

      {/* Insert / Editing Transaction Modal Overlay */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-100 w-full max-w-lg shadow-xl flex flex-col my-auto max-h-[92vh] sm:max-h-[90vh] animate-in fade-in zoom-in duration-200 relative overflow-hidden text-slate-600">
            
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
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="font-semibold">{formError}</span>
                    </div>
                    {drivePermissionError && (
                      <button
                        type="button"
                        onClick={handleForceSaveWithoutImage}
                        className="mt-1 self-start px-3 py-1.5 bg-rose-600 hover:bg-rose-750 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Bypass & Simpan Tanpa Gambar
                      </button>
                    )}
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
                    <label className="block text-slate-500 mb-1">TANGGAL TRANSAKSI</label>
                    <input 
                      type="date" 
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white"
                    />
                  </div>

                  {/* Project selector */}
                  <div>
                    <label className="block text-slate-500 mb-1">PROYEK TERKAIT</label>
                    <select
                      value={formProject}
                      onChange={(e) => setFormProject(e.target.value as Project)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white text-slate-800 font-semibold"
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
                    <label className="block text-slate-500 mb-1">JENIS KREDIT/KAS</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as TransactionType)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white text-slate-700 font-semibold"
                    >
                      <option value="Outflow">Keluar (Pembelanjaan / Outflow)</option>
                      <option value="Inflow">Masuk (Pendapatan / Inflow)</option>
                    </select>
                  </div>

                  {/* Category Selection (Restricted if Pengelola) */}
                  <div>
                    <label className="block text-slate-500 mb-1">KATEGORI TRANSAKSI</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as FinancialCategory)}
                      disabled={currentRole === 'Pengelola'}
                      className={`w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white ${
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

                {/* Account / Akun Keuangan */}
                <div>
                  <label className="block text-slate-500 mb-1">AKUN KEUANGAN (COA)</label>
                  <select
                    value={formAccount}
                    onChange={(e) => setFormAccount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white text-slate-800 font-semibold"
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
                  <label className="block text-slate-500 mb-1">NOMINAL (RUPIAH)</label>
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
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white font-mono font-bold"
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
                  <label className="block text-slate-500 mb-1">KETERANGAN & DESKRIPSI</label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Pembelian pupuk AB Mix, Penjualan kelinci hias, dll..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white"
                  />
                </div>

                {/* Upload Foto / Ambil Gambar dari Kamera & Galeri */}
                <div className="bg-slate-50 border border-slate-205 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Lampiran Bukti Gambar / Nota
                    </label>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      (formType === 'Inflow' ? imageRequiredIn : imageRequiredOut)
                        ? 'bg-rose-100 text-rose-700' 
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {(formType === 'Inflow' ? imageRequiredIn : imageRequiredOut) ? 'WAJIB' : 'OPSIONAL'}
                    </span>
                  </div>

                  {/* Hidden input element triggers */}
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    ref={cameraInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />

                  {/* File preview / State info */}
                  {(() => {
                    const hasAttachment = fileBase64 || formImage;
                    if (!hasAttachment) {
                      return (
                        <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center bg-white flex flex-col items-center justify-center gap-2">
                          <div className="p-2 bg-slate-50 text-slate-400 rounded-full border border-slate-100">
                            <Image className="w-6 h-6" />
                          </div>
                          <p className="text-[10px] text-slate-500 max-w-xs font-medium">
                            Ambil foto fisik kuitansi pengeluaran atau nota langsung dengan Kamera, atau unggah dari Galeri perangkat Anda.
                          </p>
                        </div>
                      );
                    }
                    const isDirectImage = !!fileBase64 || (!!formImage && (formImage.startsWith('data:') || formImage.startsWith('blob:') || !!formImage.match(/\.(jpeg|jpg|gif|png|webp)/i)));
                    return (
                      <div className="relative border border-slate-200 rounded-xl bg-white p-3 flex items-center justify-between gap-3 animate-fadeIn">
                        <div className="flex items-center gap-3">
                          {isDirectImage ? (
                            <img 
                              src={fileBase64 || formImage} 
                              alt="Preview Bukti" 
                              className="w-12 h-12 rounded-lg object-cover border border-slate-200" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-slate-900 border border-slate-800 text-emerald-450 rounded-lg flex items-center justify-center font-bold text-[10px] font-mono shadow-inner select-none shrink-0 text-center">
                              LINK
                            </div>
                          )}
                          <div className="text-left min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate max-w-[160px] sm:max-w-[200px]">
                              {fileName || (!isDirectImage ? 'Tautan Sharing Drive' : 'bukti_terlampir.jpg')}
                            </p>
                            <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="truncate">{!isDirectImage ? 'Tautan disimpan di entri' : 'Siap diunggah / terpasang'}</span>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFileBase64(null);
                            setFileName('');
                            setFileMimeType('');
                            setFormImage('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                            if (cameraInputRef.current) cameraInputRef.current.value = '';
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Hapus lampiran"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })()}

                  {/* Action select buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-slate-550" />
                      <span>Ambil Kamera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-slate-550" />
                      <span>Ambil Galeri</span>
                    </button>
                  </div>
                </div>

                {/* Loader indicator while uploading file to Google Drive */}
                {uploadingFile && (
                  <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-100 text-[11px] font-bold flex items-center gap-2 animate-pulse justify-center">
                    <Loader2 className="w-4.5 h-4.5 animate-spin text-amber-600 shrink-0" />
                    <span>Mengunggah bukti gambar...</span>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="flex gap-2.5 justify-end p-4 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 border border-slate-250 bg-white rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-semibold shadow-3xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-950 hover:bg-slate-800 text-white font-semibold rounded-xl flex items-center gap-1 transition-colors"
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
