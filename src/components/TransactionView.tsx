import React, { useState, useEffect } from 'react';
import { Transaction, Project, Role, FinancialCategory, TransactionType, Account, ProjectItem } from '../types';
import { getAccounts, getProjects, getSettings, SystemSettings } from '../utils/db';
import { addActivityLog } from '../utils/activityLogger';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportHelper';
import { 
  Plus, Search, Trash2, Edit, X, Save, 
  Printer, ChevronLeft, ChevronRight, Check, AlertTriangle, Image, Loader2,
  Camera, VideoOff, RefreshCw, Calendar
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

// Utility: Compress image to Base64 in standard JPEG format under 600px limits
const compressImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const image = new globalThis.Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const max_size = 600;
        let width = image.width;
        let height = image.height;

        if (width > height) {
          if (width > max_size) {
            height *= max_size / width;
            width = max_size;
          }
        } else {
          if (height > max_size) {
            width *= max_size / height;
            height = max_size;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(image, 0, 0, width, height);
        }
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      image.onerror = (err) => {
        reject(err);
      };
      if (readerEvent.target?.result) {
        image.src = readerEvent.target.result as string;
      }
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(file);
  });
};

// Utility: Format YYYY-MM-DD date to Indonesian dd-mmm-yyyy format without time
const formatIndonesianDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  // Split by 'T' or whitespace to strip time portions if present
  const baseDate = dateStr.split(/[T\s]/)[0];
  const parts = baseDate.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parts[2];
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  const monthName = months[monthIdx] || parts[1];
  return `${day}-${monthName}-${year}`;
};

// Helper to format string with Indonesian thousand separator
const formatThousand = (val: string): string => {
  const clean = val.replace(/\./g, '').replace(/[^0-9]/g, '');
  if (!clean) return '';
  return parseInt(clean, 10).toLocaleString('id-ID');
};

// Beautiful native date picker styled with Tailwind for high iframe compatibility
const IndonesianDatePicker = ({ 
  value, 
  onChange, 
  className = '', 
  placeholder = 'Pilih Tanggal',
  inputClassName = 'px-3 py-2 text-xs font-medium'
}: { 
  value: string; 
  onChange: (val: string) => void; 
  className?: string; 
  placeholder?: string;
  inputClassName?: string;
}) => {
  const hasBorder = inputClassName.includes('border');
  const hasBg = inputClassName.includes('bg-');
  const hasRounded = inputClassName.includes('rounded-');

  const baseThemeClasses = `${hasBorder ? '' : 'border border-slate-200'} ${hasBg ? '' : 'bg-slate-50'} ${hasRounded ? '' : 'rounded-xl'} text-slate-800`;

  return (
    <div className={`relative inline-block w-full ${className}`}>
      {/* Dynamic style tag to stretch webkit calendar picker indicator completely, ensuring reliable click targets */}
      <style>{`
        .custom-native-date-input::-webkit-calendar-picker-indicator {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }
      `}</style>

      {/* Visual representation styled in ID format */}
      <div className={`w-full flex items-center justify-between transition-colors pointer-events-none ${baseThemeClasses} ${inputClassName}`}>
        <span className={`${value ? 'text-slate-800 font-semibold' : 'text-slate-400 font-normal'} truncate`}>
          {value ? formatIndonesianDate(value) : placeholder}
        </span>
        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
      </div>

      {/* Hidden native input covering the relative box area entirely with webkit stretching */}
      <input 
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="custom-native-date-input absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
    </div>
  );
};

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
  
  // Multi-column sorting and filtering states
  const [sortCriteria, setSortCriteria] = useState<Array<{ column: string; direction: 'asc' | 'desc' }>>([
    { column: 'date', direction: 'desc' }
  ]);
  const [colFilters, setColFilters] = useState({
    startDate: '',
    endDate: '',
    project: 'All',
    category: 'All',
    account: 'All',
    inflowMin: '',
    inflowMax: '',
    outflowMin: '',
    outflowMax: '',
    description: '',
    recordedBy: 'All'
  });
  
  // Settings & attachment upload states
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({ imageRequiredIn: false, imageRequiredOut: false });
  const [formImage, setFormImage] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Submit progress loading steps states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitProgressStep, setSubmitProgressStep] = useState('');
  
  // Floating Toast Notification states
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error'; txId?: string } | null>(null);

  // Camera capture states and refs
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [activeFacingMode, setActiveFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const startCamera = async (mode: 'user' | 'environment' = 'environment') => {
    setCameraError('');
    setShowCamera(true);
    
    // Clean up any old camera streaming sessions
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn("Interrupted video streaming:", e));
      }
    } catch (err: any) {
      console.error('Gagal membuka kamera:', err);
      setCameraError('Gagal mengakses kamera. Silakan jalankan tautan app di tab baru dan pastikan memberikan izin akses kamera.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setCameraError('');
  };

  const toggleCameraFacing = () => {
    const nextMode = activeFacingMode === 'user' ? 'environment' : 'user';
    setActiveFacingMode(nextMode);
    startCamera(nextMode);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    setCompressing(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const max_size = 600;
      
      let width = video.videoWidth || 640;
      let height = video.videoHeight || 480;

      if (width > height) {
        if (width > max_size) {
          height *= max_size / width;
          width = max_size;
        }
      } else {
        if (height > max_size) {
          width *= max_size / height;
          height = max_size;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
      }

      // High-quality JPEG compression under 200kb
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      setFormImage(dataUrl);
      
      // Stop webcam and cleanup
      stopCamera();
    } catch (err) {
      console.error('Error capture photo:', err);
      alert('Gagal capturing photo dari stream. Silakan coba file upload biasa.');
    } finally {
      setCompressing(false);
    }
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('File yang dipilih harus berupa gambar (JPEG/PNG/JPG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal adalah 5MB.');
      return;
    }
    
    setCompressing(true);
    try {
      const base64 = await compressImageToBase64(file);
      setFormImage(base64);
    } catch (err) {
      console.error('Gagal memproses gambar:', err);
      alert('Gagal memproses file gambar. Silakan coba file gambar lainnya.');
    } finally {
      setCompressing(false);
    }
  };
  
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
        const [accs, projs, settings] = await Promise.all([getAccounts(), getProjects(), getSettings()]);
        setAccountsList(accs);
        setProjectsList(projs);
        if (settings) {
          setSystemSettings(settings);
        }
        
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
    stopCamera();
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
    setFormImage('');
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
    setFormImage(tx.image || '');
    setShowForm(true);
  };

  // Submitting form with professional progressive feedback and brief success notifications
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

    // Required image validation check based on the active role and policy
    const isImageRequired = formType === 'Inflow' 
      ? systemSettings.imageRequiredIn 
      : systemSettings.imageRequiredOut;

    if (isImageRequired && !formImage) {
      setFormError(`Silakan lampirkan gambar/foto bukti transaksi untuk transaksi Uang ${formType === 'Inflow' ? 'Masuk (Inflow)' : 'Keluar (Outflow)'}.`);
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
      image: formImage
    };

    // Begin Submission Progress State Stream (Tampilkan progres input transaksi)
    setIsSubmitting(true);
    setSubmitProgress(15);
    setSubmitProgressStep('Memvalidasi format data input & otorisasi akun...');
    await new Promise(r => setTimeout(r, 450));

    setSubmitProgress(45);
    setSubmitProgressStep('Memproses lampiran gambar & kompresi metadata...');
    await new Promise(r => setTimeout(r, 400));

    setSubmitProgress(75);
    setSubmitProgressStep('Mengunggah & mensinkronisasikan transaksi baru ke Sheets...');

    let success = false;
    try {
      if (isEditing) {
        success = await onUpdateTransaction(txData);
      } else {
        success = await onAddTransaction(txData);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err.message || 'Gagal menyimpan transaksi. Koneksi sistem bermasalah.');
      return;
    }

    if (success) {
      setSubmitProgress(90);
      setSubmitProgressStep('Mencatatkan ke riwayat log aktivitas sistem log...');
      
      if (isEditing) {
        addActivityLog('EDIT_TRANSAKSI', `Mengubah Transaksi ${txId} senilai Rp ${Number(formAmount).toLocaleString('id-ID')} (Proyek ${formProject} - Akun ${formAccount})`);
      } else {
        addActivityLog('TAMBAH_TRANSAKSI', `Menambahkan Transaksi ${txId} senilai Rp ${Number(formAmount).toLocaleString('id-ID')} (Proyek ${formProject} - Akun ${formAccount})`);
      }
      await new Promise(r => setTimeout(r, 350));

      setSubmitProgress(100);
      setSubmitProgressStep('Penyimpanan berhasil!');
      setSuccessMsg(isEditing ? 'Berhasil mengupdate transaksi!' : 'Berhasil menambahkan transaksi baru!');

      // Trigger beautiful floating toast feedback (Notifikasi singkat berhasil)
      setToast({
        show: true,
        message: isEditing ? 'Transaksi berhasil diperbarui!' : 'Transaksi baru berhasil dicatatkan!',
        type: 'success',
        txId: txId
      });

      // Auto dismiss toast after 4000ms
      setTimeout(() => {
        setToast(prev => (prev?.txId === txId ? { ...prev, show: false } : prev));
      }, 4000);

      setTimeout(() => {
        setIsSubmitting(false);
        setupFilteredPageCountAndReset();
        setShowForm(false);
        resetForm();
      }, 750);
    } else {
      setIsSubmitting(false);
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

  const handleToggleSort = (column: string, e: React.MouseEvent) => {
    e.preventDefault();
    const isShift = e.shiftKey;
    setSortCriteria(prev => {
      const existingIdx = prev.findIndex(item => item.column === column);
      if (existingIdx > -1) {
        const item = prev[existingIdx];
        if (item.direction === 'asc') {
          if (isShift) {
            const updated = [...prev];
            updated[existingIdx] = { column, direction: 'desc' };
            return updated;
          } else {
            return [{ column, direction: 'desc' }];
          }
        } else {
          if (isShift) {
            return prev.filter(p => p.column !== column);
          } else {
            return [];
          }
        }
      } else {
        if (isShift) {
          return [...prev, { column, direction: 'asc' }];
        } else {
          return [{ column, direction: 'asc' }];
        }
      }
    });
    setupFilteredPageCountAndReset();
  };

  const handleColFilterChange = (key: keyof typeof colFilters, value: string) => {
    setColFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setupFilteredPageCountAndReset();
  };

  const handleResetFiltersAndSorts = () => {
    setColFilters({
      startDate: '',
      endDate: '',
      project: 'All',
      category: 'All',
      account: 'All',
      inflowMin: '',
      inflowMax: '',
      outflowMin: '',
      outflowMax: '',
      description: '',
      recordedBy: 'All'
    });
    setSortCriteria([
      { column: 'date', direction: 'desc' }
    ]);
    setSearchTerm('');
    setProjectFilter('All');
    setTypeFilter('All');
    setCategoryFilter('All');
    setAccountFilter('All');
    setupFilteredPageCountAndReset();
  };

  // Get unique list of operators who recorded transactions
  const recordedByOptions = Array.from(
    new Set(transactions.map(t => t.recordedBy).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  // Process filter logic & multi-column sorting
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

    // --- Multi-Column Individual Filters ---
    if (colFilters.startDate || colFilters.endDate) {
      list = list.filter(t => {
        if (!t.date) return false;
        const normalizedTxDate = t.date.split(/[T\s]/)[0]; // "YYYY-MM-DD"
        if (colFilters.startDate) {
          if (normalizedTxDate < colFilters.startDate) return false;
        }
        if (colFilters.endDate) {
          if (normalizedTxDate > colFilters.endDate) return false;
        }
        return true;
      });
    }

    if (colFilters.project !== 'All') {
      list = list.filter(t => t.project === colFilters.project);
    }

    if (colFilters.category !== 'All') {
      list = list.filter(t => t.category === colFilters.category);
    }

    if (colFilters.account !== 'All') {
      list = list.filter(t => t.account === colFilters.account);
    }

    if (colFilters.inflowMin.trim() || colFilters.inflowMax.trim()) {
      const minVal = colFilters.inflowMin.trim() ? parseFloat(colFilters.inflowMin.replace(/\./g, '')) : -Infinity;
      const maxVal = colFilters.inflowMax.trim() ? parseFloat(colFilters.inflowMax.replace(/\./g, '')) : Infinity;
      list = list.filter(t => t.type === 'Inflow' && t.amount >= minVal && t.amount <= maxVal);
    }

    if (colFilters.outflowMin.trim() || colFilters.outflowMax.trim()) {
      const minVal = colFilters.outflowMin.trim() ? parseFloat(colFilters.outflowMin.replace(/\./g, '')) : -Infinity;
      const maxVal = colFilters.outflowMax.trim() ? parseFloat(colFilters.outflowMax.replace(/\./g, '')) : Infinity;
      list = list.filter(t => t.type === 'Outflow' && t.amount >= minVal && t.amount <= maxVal);
    }

    if (colFilters.description.trim()) {
      const q = colFilters.description.toLowerCase();
      list = list.filter(t => t.description.toLowerCase().includes(q));
    }

    if (colFilters.recordedBy !== 'All' && colFilters.recordedBy.trim()) {
      list = list.filter(t => t.recordedBy === colFilters.recordedBy);
    }

    // --- Multi-Column Sort logic ---
    if (sortCriteria.length > 0) {
      list.sort((a, b) => {
        for (const crit of sortCriteria) {
          const { column, direction } = crit;
          let valA: any = '';
          let valB: any = '';

          if (column === 'date') {
            valA = a.date || '';
            valB = b.date || '';
          } else if (column === 'project') {
            valA = a.project || '';
            valB = b.project || '';
          } else if (column === 'category') {
            valA = a.category || '';
            valB = b.category || '';
          } else if (column === 'account') {
            valA = a.account || '';
            valB = b.account || '';
          } else if (column === 'inflow') {
            valA = a.type === 'Inflow' ? a.amount : -1;
            valB = b.type === 'Inflow' ? b.amount : -1;
          } else if (column === 'outflow') {
            valA = a.type === 'Outflow' ? a.amount : -1;
            valB = b.type === 'Outflow' ? b.amount : -1;
          } else if (column === 'description') {
            valA = a.description || '';
            valB = b.description || '';
          } else if (column === 'recordedBy') {
            valA = a.recordedBy || '';
            valB = b.recordedBy || '';
          } else {
            valA = (a as any)[column] || '';
            valB = (b as any)[column] || '';
          }

          let cmp = 0;
          if (typeof valA === 'number' && typeof valB === 'number') {
            cmp = valA - valB;
          } else {
            cmp = String(valA).localeCompare(String(valB), 'id', { numeric: true, sensitivity: 'base' });
          }

          if (cmp !== 0) {
            return direction === 'asc' ? cmp : -cmp;
          }
        }
        return 0;
      });
    }

    return list;
  };

  const renderSortableHeader = (column: string, label: string, className = '') => {
    const existingIdx = sortCriteria.findIndex(item => item.column === column);
    const isSorted = existingIdx > -1;
    const item = isSorted ? sortCriteria[existingIdx] : null;

    return (
      <th className={`py-3 px-4 group select-none ${className}`}>
        <div 
          onClick={(e) => handleToggleSort(column, e)}
          className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800 transition-colors"
          title="Klik untuk mengurutkan (Shift + Klik untuk gabungan multi-kolom)"
        >
          <span className="font-semibold text-[10px] tracking-wider uppercase font-display">{label}</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-450">
            {isSorted && (
              <span className="px-1 text-emerald-700 bg-emerald-50 rounded border border-emerald-200 text-[8.5px] font-extrabold font-mono">
                {existingIdx + 1}
              </span>
            )}
            {item ? (
              <span className="font-extrabold text-slate-650 font-sans">{item.direction === 'asc' ? '▲' : '▼'}</span>
            ) : (
              <span className="opacity-0 group-hover:opacity-75 transition-all text-slate-350">▲▼</span>
            )}
          </span>
        </div>
      </th>
    );
  };

  const sortedList = getFilteredList();

  const totalPages = Math.ceil(sortedList.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedList.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div id="transaction-view" className="space-y-6">
      
      {/* Dynamic Keyframe style for toast countdown bar */}
      <style>{`
        @keyframes toastShrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-toast-shrink {
          animation: toastShrink 4s linear forwards;
        }
      `}</style>

      {/* Floating Toast Notification (Notifikasi singkat berhasil) */}
      {toast && toast.show && (
        <div className="fixed top-20 right-6 z-55 max-w-sm w-full bg-white border-l-4 border-emerald-500 rounded-xl shadow-2xl p-4 flex items-start gap-3.5 animate-in fade-in slide-in-from-top-4 duration-300 relative overflow-hidden select-none">
          {/* Animated active countdown bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
            <div className="bg-emerald-500 h-full animate-toast-shrink" style={{ transformOrigin: 'left' }}></div>
          </div>
          
          <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 shrink-0 text-emerald-600">
            <Check className="w-5 h-5" />
          </div>
          <div className="space-y-1 pr-6 flex-1 font-semibold">
            <h5 className="font-sans font-extrabold text-slate-800 text-[10px] uppercase tracking-wider">
              SUKSES MENYIMPAN
            </h5>
            <p className="text-[11.5px] text-slate-500 font-bold leading-relaxed">
              {toast.message}
            </p>
          </div>
          
          <button 
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 absolute top-3 right-3 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            title="Tutup Notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      
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
                <span className="text-[10px] text-slate-405 font-bold uppercase shrink-0">Mulai</span>
                <IndonesianDatePicker 
                  value={downloadStartDate}
                  onChange={setDownloadStartDate}
                  className="w-[125px]"
                  inputClassName="px-2.5 py-1 text-[11px] font-semibold text-slate-700 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-405 font-bold uppercase shrink-0">Sampai</span>
                <IndonesianDatePicker 
                  value={downloadEndDate}
                  onChange={setDownloadEndDate}
                  className="w-[125px]"
                  inputClassName="px-2.5 py-1 text-[11px] font-semibold text-slate-700 rounded-lg"
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
                <th className="py-3 px-4 text-center w-12 text-[10px] uppercase">No.</th>
                {renderSortableHeader('date', 'Tanggal')}
                {renderSortableHeader('project', 'Proyek')}
                {renderSortableHeader('category', 'Kategori')}
                {renderSortableHeader('account', 'Akun (COA)')}
                {renderSortableHeader('inflow', 'Uang Masuk', 'text-right')}
                {renderSortableHeader('outflow', 'Uang Keluar', 'text-right')}
                {renderSortableHeader('description', 'Keterangan')}
                {renderSortableHeader('recordedBy', 'Dicatat Oleh')}
                <th className="py-3 px-4 text-center font-semibold text-[10px] tracking-wider uppercase font-display">Bukti</th>
                <th className="py-3 px-4 text-center text-[10px] tracking-wider uppercase font-display">Aksi</th>
              </tr>
              {/* Row for multi-column individual filtering */}
              <tr className="bg-slate-100/50 border-b border-slate-200">
                <td className="py-2 px-2 text-center">
                  <button
                    type="button"
                    onClick={handleResetFiltersAndSorts}
                    className="p-1 px-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center align-middle"
                    title="Atur Ulang Pengurutan & Filter"
                  >
                    <RefreshCw className="w-3.5 h-3.5 hover:rotate-90 transition-transform duration-300" />
                  </button>
                </td>
                <td className="py-1 px-1.5 min-w-[145px]">
                  <div className="flex flex-col gap-1 py-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[8.5px] text-slate-400 font-extrabold shrink-0 w-8 text-right uppercase">Awal</span>
                      <IndonesianDatePicker 
                        value={colFilters.startDate}
                        onChange={(val) => handleColFilterChange('startDate', val)}
                        className="w-[105px]"
                        inputClassName="px-1.5 py-0.5 text-[9.5px] font-semibold text-slate-700 rounded-md animate-none"
                        placeholder="Mulai..."
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[8.5px] text-slate-400 font-extrabold shrink-0 w-8 text-right uppercase">Akhir</span>
                      <IndonesianDatePicker 
                        value={colFilters.endDate}
                        onChange={(val) => handleColFilterChange('endDate', val)}
                        className="w-[105px]"
                        inputClassName="px-1.5 py-0.5 text-[9.5px] font-semibold text-slate-700 rounded-md animate-none"
                        placeholder="Sampai..."
                      />
                    </div>
                  </div>
                </td>
                <td className="py-1 px-2">
                  <select
                    value={colFilters.project}
                    onChange={(e) => handleColFilterChange('project', e.target.value)}
                    className="w-full px-1 py-1 text-[11.5px] border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-semibold"
                  >
                    <option value="All">Semua</option>
                    {projectsList.map(proj => (
                      <option key={proj.id} value={proj.name}>{proj.name}</option>
                    ))}
                  </select>
                </td>
                <td className="py-1 px-2">
                  <select
                    value={colFilters.category}
                    onChange={(e) => handleColFilterChange('category', e.target.value)}
                    className="w-full px-1 py-1 text-[11.5px] border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="All">Semua</option>
                    <option value="Operational">Operasional</option>
                    <option value="Non-Operational">Non-Ops</option>
                  </select>
                </td>
                <td className="py-1 px-2">
                  <select
                    value={colFilters.account}
                    onChange={(e) => handleColFilterChange('account', e.target.value)}
                    className="w-full px-1 py-1 text-[11.5px] border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                  >
                    <option value="All">Semua</option>
                    {accountsList.map(acc => (
                      <option key={acc.id} value={acc.name}>{acc.name}</option>
                    ))}
                  </select>
                </td>
                <td className="py-1 px-1.5 min-w-[135px]">
                  <div className="flex flex-col gap-1 py-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[8.5px] text-slate-400 font-extrabold shrink-0 w-8 text-right uppercase">Min</span>
                      <input
                        type="text"
                        placeholder="Min rp..."
                        value={colFilters.inflowMin}
                        onChange={(e) => handleColFilterChange('inflowMin', formatThousand(e.target.value))}
                        className="w-full px-1.5 py-0.5 text-[9.5px] border border-slate-200 bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono text-right font-semibold text-slate-700"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[8.5px] text-slate-400 font-extrabold shrink-0 w-8 text-right uppercase">Max</span>
                      <input
                        type="text"
                        placeholder="Max rp..."
                        value={colFilters.inflowMax}
                        onChange={(e) => handleColFilterChange('inflowMax', formatThousand(e.target.value))}
                        className="w-full px-1.5 py-0.5 text-[9.5px] border border-slate-200 bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono text-right font-semibold text-slate-700"
                      />
                    </div>
                  </div>
                </td>
                <td className="py-1 px-1.5 min-w-[135px]">
                  <div className="flex flex-col gap-1 py-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[8.5px] text-slate-400 font-extrabold shrink-0 w-8 text-right uppercase">Min</span>
                      <input
                        type="text"
                        placeholder="Min rp..."
                        value={colFilters.outflowMin}
                        onChange={(e) => handleColFilterChange('outflowMin', formatThousand(e.target.value))}
                        className="w-full px-1.5 py-0.5 text-[9.5px] border border-slate-200 bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono text-right font-semibold text-slate-700"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[8.5px] text-slate-400 font-extrabold shrink-0 w-8 text-right uppercase">Max</span>
                      <input
                        type="text"
                        placeholder="Max rp..."
                        value={colFilters.outflowMax}
                        onChange={(e) => handleColFilterChange('outflowMax', formatThousand(e.target.value))}
                        className="w-full px-1.5 py-0.5 text-[9.5px] border border-slate-200 bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono text-right font-semibold text-slate-700"
                      />
                    </div>
                  </div>
                </td>
                <td className="py-1 px-2">
                  <input
                    type="text"
                    placeholder="Saring keterangan..."
                    value={colFilters.description}
                    onChange={(e) => handleColFilterChange('description', e.target.value)}
                    className="w-full px-2 py-1 text-[11.5px] border border-slate-250 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </td>
                <td className="py-1 px-2">
                  <select
                    value={colFilters.recordedBy}
                    onChange={(e) => handleColFilterChange('recordedBy', e.target.value)}
                    className="w-full px-1 py-1 text-[11.5px] border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="All">Semua</option>
                    {recordedByOptions.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </td>
                <td className="py-1 px-2 text-center text-slate-350 text-[10px] font-bold select-none">-</td>
                <td className="py-1 px-2 text-center text-slate-350 text-[10px] font-bold select-none">-</td>
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
                currentItems.map((t, index) => {
                  const allowedToEdit = canModifyOrDelete(t);
                  const rowNum = indexOfFirstItem + index + 1;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-slate-400 text-center text-[11px]">{rowNum}</td>
                      <td className="py-4 px-4 font-mono font-medium text-slate-700">{formatIndonesianDate(t.date)}</td>
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
                        {t.image ? (
                          <button
                            onClick={() => setLightboxImage(t.image || null)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold transition-all shadow-3xs cursor-pointer active:scale-95"
                            title="Klik untuk melihat bukti transaksi"
                          >
                            <Image className="w-3 h-3 text-emerald-600" />
                            <span>Lihat Bukti</span>
                          </button>
                        ) : (
                          <span className="text-slate-350 italic font-medium font-sans text-[10px]">-</span>
                        )}
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
              
              {isSubmitting ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 text-center bg-white select-none">
                  <div className="relative">
                    {/* Ring loader */}
                    <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-emerald-500 animate-spin"></div>
                    {submitProgress === 100 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white rounded-full">
                        <Check className="w-8 h-8 text-emerald-500 animate-bounce" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 max-w-xs w-full">
                    <h4 className="font-display font-extrabold text-slate-800 text-sm">
                      {isEditing ? 'Memperbarui Record Transaksi...' : 'Menyimpan Transaksi Baru...'}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-semibold animate-pulse">{submitProgressStep}</p>
                    
                    {/* Progress loadbar */}
                    <div className="w-full bg-slate-105 h-2 rounded-full overflow-hidden mt-1 shadow-inner relative">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300 shadow-3xs"
                        style={{ width: `${submitProgress}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-indigo-600 font-mono font-bold text-right pt-0.5">
                      {submitProgress}% Selesai
                    </div>
                  </div>

                  {/* Checklist of steps */}
                  <div className="w-full bg-slate-50 border border-slate-150 rounded-2xl p-4.5 text-left space-y-3 max-w-sm font-semibold">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${submitProgress >= 15 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-105 text-slate-400 border border-slate-205'}`}>
                        {submitProgress > 15 ? '✓' : '1'}
                      </span>
                      <span className={`text-[11px] font-display font-bold ${submitProgress >= 15 ? 'text-slate-800' : 'text-slate-400'}`}>
                        Verifikasi Kelayakan Form & Otorisasi
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${submitProgress >= 45 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-105 text-slate-400 border border-slate-205'}`}>
                        {submitProgress > 45 ? '✓' : '2'}
                      </span>
                      <span className={`text-[11px] font-display font-bold ${submitProgress >= 45 ? 'text-slate-800' : 'text-slate-400'}`}>
                        Enkripsi & Kompresi Bukti Lampiran
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${submitProgress >= 75 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-105 text-slate-400 border border-slate-205'}`}>
                        {submitProgress > 75 ? '✓' : '3'}
                      </span>
                      <span className={`text-[11px] font-display font-bold ${submitProgress >= 75 ? 'text-slate-800' : 'text-slate-400'}`}>
                        Mengirim Selisih Kas ke Sheets Database
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${submitProgress >= 90 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-105 text-slate-400 border border-slate-205'}`}>
                        {submitProgress > 90 ? '✓' : '4'}
                      </span>
                      <span className={`text-[11px] font-display font-bold ${submitProgress >= 90 ? 'text-slate-800' : 'text-slate-400'}`}>
                        Administrasi Log & Kebijakan Kas
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
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
                        <IndonesianDatePicker 
                          value={formDate}
                          onChange={setFormDate}
                          className="w-full font-semibold text-slate-800"
                          inputClassName="px-3 py-2 text-xs font-medium text-slate-800"
                          placeholder="Pilih Tanggal Transaksi"
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
                        <span className="text-[10px] text-amber-655 block mt-1 font-semibold">
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

                    {/* Bukti Transaksi (File upload with drag & drop or direct camera capture) */}
                    <div className="space-y-1.5 pt-1.5">
                      <div className="flex justify-between items-center">
                        <label className="block text-slate-500 font-semibold uppercase text-[10px]">
                          LAMPIRAN BUKTI GAMBAR / NOTA {(formType === 'Inflow' ? systemSettings.imageRequiredIn : systemSettings.imageRequiredOut) && <span className="text-rose-600 font-extrabold">*Wajib</span>}
                        </label>
                        <div className="flex items-center gap-2">
                          {!formImage && !showCamera && (
                            <button
                              type="button"
                              onClick={() => startCamera(activeFacingMode)}
                              className="text-[10px] text-emerald-700 hover:text-emerald-850 bg-emerald-50 hover:bg-emerald-100 border border-emerald-150 px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer shadow-3xs"
                            >
                              <Camera className="w-3 h-3" /> Ambil dari Kamera
                            </button>
                          )}
                          {formImage && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormImage('');
                                stopCamera();
                              }}
                              className="text-[10px] text-rose-600 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" /> Hapus File
                            </button>
                          )}
                        </div>
                      </div>

                      {showCamera ? (
                        <div className="border border-slate-200 rounded-2xl p-3 bg-slate-950 flex flex-col items-center justify-center gap-3 overflow-hidden shadow-xs relative min-h-[220px]">
                          {cameraError ? (
                            <div className="text-center p-4 text-white flex flex-col items-center justify-center gap-2">
                              <VideoOff className="w-8 h-8 text-rose-500" />
                              <span className="text-xs font-semibold">{cameraError}</span>
                              <button
                                type="button"
                                onClick={stopCamera}
                                className="mt-2 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 font-extrabold rounded-lg text-[10px] cursor-pointer"
                              >
                                Gunakan Upload File Biasa
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="relative w-full aspect-video md:max-h-48 bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                                <video
                                  ref={videoRef}
                                  autoPlay
                                  playsInline
                                  muted
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                {/* Viewfinder Target Border Overlay */}
                                <div className="absolute inset-4 border border-white/20 rounded-lg pointer-events-none flex items-center justify-center">
                                  <div className="w-8 h-8 border-t-2 border-l-2 border-emerald-500 absolute top-2 left-2" />
                                  <div className="w-8 h-8 border-t-2 border-r-2 border-emerald-500 absolute top-2 right-2" />
                                  <div className="w-8 h-8 border-b-2 border-l-2 border-emerald-500 absolute bottom-2 left-2" />
                                  <div className="w-8 h-8 border-b-2 border-r-2 border-emerald-500 absolute bottom-2 right-2" />
                                  {/* Scanning line indicator */}
                                  <div className="w-full h-0.5 bg-emerald-500/30 absolute top-1/2 left-0 animate-pulse" />
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 w-full justify-center">
                                <button
                                  type="button"
                                  onClick={capturePhoto}
                                  disabled={compressing}
                                  className="flex items-center justify-center gap-1.5 px-4.5 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-extrabold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                                >
                                  <Camera className="w-4 h-4" />
                                  <span>Ambil Foto</span>
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={toggleCameraFacing}
                                  className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-xl text-[11px] transition-all cursor-pointer"
                                  title="Ganti kamera depan / belakang"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Putar</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={stopCamera}
                                  className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-[11px] transition-all cursor-pointer"
                                >
                                  <span>Batal</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : formImage ? (
                        <div className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 h-32 flex items-center justify-center group shadow-2xs">
                          <img 
                            src={formImage} 
                            alt="Preview Bukti" 
                            className="h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setLightboxImage(formImage)}
                              className="px-3 py-1.5 bg-white font-bold text-slate-900 rounded-lg text-[10px] hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                            >
                              Tinjau Bukti
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleImageFile(file);
                          }}
                          onClick={() => document.getElementById('evidence-file-input')?.click()}
                          className={`border-2 border-dashed rounded-2xl p-5 text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                            isDragging 
                              ? 'border-slate-900 bg-slate-55' 
                              : 'border-slate-200 bg-slate-50/60 hover:bg-slate-55'
                          }`}
                        >
                          <input 
                            type="file" 
                            id="evidence-file-input"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageFile(file);
                            }}
                            className="hidden"
                          />
                          {compressing ? (
                            <Loader2 className="w-5 h-5 text-slate-900 animate-spin" />
                          ) : (
                            <div className="p-2 bg-white border border-slate-100 rounded-xl shadow-3xs text-slate-400 shrink-0">
                              <Plus className="w-4 h-4 text-slate-500" />
                            </div>
                          )}
                          <div className="space-y-0.5 pointer-events-none">
                            <span className="text-xs font-bold text-slate-900 block">
                              {compressing ? 'Menyusutkan & Memproses Gambar...' : 'Unggah foto nota, atau seret file ke sini'}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-medium">
                              File Gambar PNG, JPG, JPEG (Maksimal 5MB)
                            </span>
                          </div>
                        </div>
                      )}

                      {(formType === 'Inflow' ? systemSettings.imageRequiredIn : systemSettings.imageRequiredOut) && !formImage && (
                        <p className="text-[10px] text-rose-600 flex items-center gap-1 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Unggah foto bukti nota wajib untuk jenis transaksi ini.
                        </p>
                      )}
                    </div>

                  </div>

                  {/* Sticky Footer */}
                  <div className="flex gap-2.5 justify-end p-4 bg-slate-50 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleCloseForm}
                      className="px-4 py-2 border border-slate-250 bg-white rounded-xl text-slate-655 hover:bg-slate-50 transition-colors font-semibold shadow-3xs text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={compressing}
                      className="px-5 py-2 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center gap-1 transition-colors text-xs cursor-pointer"
                    >
                      {compressing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      {isEditing ? 'Perbarui Data' : 'Simpan Transaksi'}
                    </button>
                  </div>
                </>
              )}

            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Pratinjau Bukti Image Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in no-print"
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="bg-white max-w-2xl w-full rounded-3xl overflow-hidden shadow-2xl relative animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-850 flex items-center gap-2">
                <Image className="w-4 h-4 text-emerald-600" />
                Detail Lampiran Bukti Transaksi
              </h3>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 bg-slate-50 flex items-center justify-center max-h-[70vh] overflow-auto select-none">
              <img 
                src={lightboxImage} 
                alt="Bukti Nota Transaksi" 
                className="max-w-full max-h-[60vh] object-contain rounded-xl border border-slate-205 shadow-xs"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center text-[10px]">
              <span className="text-slate-400 font-mono">Format: Compressed Base64 JPEG</span>
              <button
                onClick={() => setLightboxImage(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
