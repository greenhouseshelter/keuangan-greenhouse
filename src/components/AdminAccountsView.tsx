import React, { useState, useEffect } from 'react';
import { Account } from '../types';
import { getAccounts, addAccount, updateAccount, deleteAccount } from '../utils/db';
import { Plus, Edit2, Trash2, CheckCircle, AlertCircle, RefreshCw, FolderHeart, Layers } from 'lucide-react';

export default function AdminAccountsView() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'Project' | 'All'>('Project');
  
  const [notif, setNotif] = useState<{ type: 'success' | 'err'; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (e) {
      console.error('Failed to load accounts:', e);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'err', message: string) => {
    setNotif({ type, message });
    setTimeout(() => setNotif(null), 3500);
  };

  const handleStartAdd = () => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setType('Project');
  };

  const handleStartEdit = (account: Account) => {
    setIsEditing(true);
    setEditingId(account.id);
    setName(account.name);
    setType(account.type);
    
    // Scroll form into view gently
    const formElement = document.getElementById('account-form-card');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showNotification('err', 'Nama akun tidak boleh kosong.');
      return;
    }

    setActionLoading(true);
    try {
      if (isEditing && editingId) {
        // Update
        const updated: Account = {
          id: editingId,
          name: name.trim(),
          type,
        };
        const ok = await updateAccount(updated);
        if (ok) {
          showNotification('success', `Akun "${updated.name}" berhasil diperbarui.`);
          setIsEditing(false);
          setEditingId(null);
          setName('');
        } else {
          throw new Error('Gagal memperbarui database.');
        }
      } else {
        // Create
        const newAcc: Account = {
          id: `acc-${Date.now()}`,
          name: name.trim(),
          type,
        };
        const ok = await addAccount(newAcc);
        if (ok) {
          showNotification('success', `Akun "${newAcc.name}" berhasil ditambahkan.`);
          setName('');
        } else {
          throw new Error('Gagal menambah ke database.');
        }
      }
      await loadAccounts();
    } catch (err: any) {
      showNotification('err', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string, accountName: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus akun "${accountName}"?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const ok = await deleteAccount(id);
      if (ok) {
        showNotification('success', `Akun "${accountName}" berhasil dihapus.`);
        await loadAccounts();
      } else {
        throw new Error('Gagal menghapus dari database.');
      }
    } catch (err: any) {
      showNotification('err', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div id="admin-accounts-view" className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Kelola Akun Keuangan (COA/Accounts)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Definisikan akun-akun transaksi pengeluaran (outflow) dan laba kotor untuk ketepatan posting alur kas per proyek.
          </p>
        </div>
        <button 
          onClick={loadAccounts}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-semibold text-xs transition duration-200 cursor-pointer self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </button>
      </div>

      {notif && (
        <div className={`p-4 border rounded-2xl text-xs flex items-center gap-3 animate-in fade-in duration-200 ${
          notif.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          {notif.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold">{notif.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor / Form (1 Col) */}
        <div id="account-form-card" className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm self-start">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 font-display">
            <FolderHeart className="w-4 h-4 text-indigo-500" />
            {isEditing ? 'Ubah Akun Terpilih' : 'Tambah Akun Transaksi Baru'}
          </h3>
          <p className="text-[11px] text-slate-400">
            {isEditing 
              ? 'Silakan sesuaikan nama dan pembatasan role akses akun keuangan ini.' 
              : 'Akun baru akan otomatis tersedia pada form input transaksi sesuai kriteria.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-600">
            <div>
              <label className="block text-slate-500 mb-1">NAMA AKUN KEUANGAN</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Misal: Beban Pupuk, Biaya Listrik, dll"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">TIPE / PEMBATASAN AKSES</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'Project' | 'All')}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white font-medium text-slate-700"
              >
                <option value="Project">Project (Hanya Proyek - Dapat Diakses Seluruh Role)</option>
                <option value="All">All (Umum/Non-Proyek - Hanya Admin/Finance/Accounting)</option>
              </select>
            </div>

            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold rounded-xl text-xs shadow-xs transition duration-200 cursor-pointer"
              >
                {actionLoading ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambahkan Akun'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition duration-200 cursor-pointer"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List of Accounts (2 Cols) */}
        <div className="lg:col-span-2 space-y-3.5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-slate-400 tracking-wider">DAFTAR SELURUH AKUN AKTIF</h4>
              <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] text-slate-500 font-mono font-bold">
                {accounts.length} Akun
              </span>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                <p className="text-xs">Memproses data COA dari memori...</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <p className="text-xs font-semibold">Belum ada akun keuangan terdaftar.</p>
                <p className="text-[10px] mt-1">Gunakan panel di samping untuk menambahkan akun COA pertama Anda.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {accounts.map((acc) => (
                  <div key={acc.id} className="py-3 flex items-center justify-between gap-4 group">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-800 block">{acc.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          acc.type === 'Project' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        }`}>
                          {acc.type === 'Project' ? 'Project' : 'All (Non-Project)'}
                        </span>
                        
                        <span className="text-[9.5px] text-slate-450 font-medium">
                          {acc.type === 'Project' 
                            ? 'Akses: Pengelola, Admin, Finance, Accounting' 
                            : 'Akses: Admin, Finance, Accounting'}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartEdit(acc)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-850 transition duration-150 cursor-pointer"
                        title="Edit Akun"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      
                      {/* Prevent initial standard list form being deleted unless confirmed */}
                      <button
                        onClick={() => handleDelete(acc.id, acc.name)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition duration-150 cursor-pointer"
                        title="Hapus Akun"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
