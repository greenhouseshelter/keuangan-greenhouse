import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { getUsers, addUser, updateUser, deleteUser } from '../utils/db';
import { addActivityLog } from '../utils/activityLogger';
import { 
  Shield, Eye, EyeOff, Save, CheckCircle, AlertCircle, RefreshCw, 
  KeyRound, Plus, Trash2, Edit, X, Search, Filter, Users2, ShieldAlert
} from 'lucide-react';

export default function AdminUsersView() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('All');

  // Create Mode state
  const [isCreating, setIsCreating] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('Pengelola');

  // Edit Mode state
  const [editingUsername, setEditingUsername] = useState<string | null>(null); // Old username identifies who is being edited
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<Role>('Pengelola');

  // Delete modal/confirm state
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [notif, setNotif] = useState<{ type: 'success' | 'err'; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUsers();
    // Fetch active session user to prevent self-deletion or self-demotion
    try {
      const stored = localStorage.getItem('greenhouse_active_user');
      if (stored) {
        setActiveUser(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  };

  const showNotif = (type: 'success' | 'err', message: string) => {
    setNotif({ type, message });
    setTimeout(() => setNotif(null), 5000);
  };

  const togglePasswordVisibility = (username: string) => {
    setVisiblePasswords(prev => ({ ...prev, [username]: !prev[username] }));
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewUsername('');
    setNewPassword('');
    setNewRole('Pengelola');
    setEditingUsername(null);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewUsername('');
    setNewPassword('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      showNotif('err', 'Username dan Password tidak boleh kosong.');
      return;
    }

    const cleanedUsername = newUsername.trim();
    // Validate duplicates
    const isDuplicate = users.some(u => u.username.toLowerCase() === cleanedUsername.toLowerCase());
    if (isDuplicate) {
      showNotif('err', `Username "${cleanedUsername}" sudah terdaftar dalam sistem.`);
      return;
    }

    setActionLoading(true);
    try {
      const newUser: User = {
        username: cleanedUsername,
        password: newPassword.trim(),
        role: newRole
      };

      const success = await addUser(newUser);
      if (success) {
        addActivityLog('KREASI_PENGGUNA', `Membuat akun user baru "${cleanedUsername}" dengan role ${newRole}`);
        showNotif('success', `Akun "${cleanedUsername}" berhasil ditambahkan.`);
        setIsCreating(false);
        await loadUsers();
      } else {
        throw new Error('Gagal menyimpan ke database.');
      }
    } catch (err: any) {
      showNotif('err', err.message || 'Gagal menambahkan user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartEdit = (user: User) => {
    setEditingUsername(user.username);
    setEditUsername(user.username);
    setEditPassword(user.password);
    setEditRole(user.role);
    setIsCreating(false);
  };

  const handleCancelEdit = () => {
    setEditingUsername(null);
    setEditUsername('');
    setEditPassword('');
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUsername) return;

    const cleanedUsername = editUsername.trim();
    if (!cleanedUsername || !editPassword.trim()) {
      showNotif('err', 'Username dan Password tidak boleh kosong.');
      return;
    }

    // Validate duplicate if username has been changed
    if (editingUsername.toLowerCase() !== cleanedUsername.toLowerCase()) {
      const isDuplicate = users.some(u => u.username.toLowerCase() === cleanedUsername.toLowerCase());
      if (isDuplicate) {
        showNotif('err', `Username "${cleanedUsername}" sudah dipakai oleh pengguna lain.`);
        return;
      }
    }

    setActionLoading(true);
    try {
      const updatedUser: User = {
        username: cleanedUsername,
        password: editPassword.trim(),
        role: editRole
      };

      const success = await updateUser(updatedUser, editingUsername);
      if (success) {
        addActivityLog('UPDATE_PENGGUNA', `Memperbarui info/password akun "${editingUsername}" menjadi "${cleanedUsername}" (${editRole})`);
        
        // If updating currently logged-in account, refresh active user session state in localStorage
        if (activeUser && activeUser.username.toLowerCase() === editingUsername.toLowerCase()) {
          const updatedSession = { ...activeUser, username: cleanedUsername, password: editPassword.trim(), role: editRole };
          localStorage.setItem('greenhouse_active_user', JSON.stringify(updatedSession));
          setActiveUser(updatedSession);
        }

        showNotif('success', `Akun "${cleanedUsername}" berhasil diperbarui.`);
        setEditingUsername(null);
        await loadUsers();
      } else {
        throw new Error('Gagal menyimpan pembaruan.');
      }
    } catch (err: any) {
      showNotif('err', err.message || 'Gagal memperbarui user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = (user: User) => {
    if (activeUser && activeUser.username.toLowerCase() === user.username.toLowerCase()) {
      showNotif('err', 'Anda tidak dapat menghapus akun Anda sendiri saat sedang masuk.');
      return;
    }
    setDeletingUser(user);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setActionLoading(true);
    try {
      const success = await deleteUser(deletingUser.username);
      if (success) {
        addActivityLog('HAPUS_PENGGUNA', `Menghapus akun pengguna "${deletingUser.username}" dengan tingkat akses ${deletingUser.role}`);
        showNotif('success', `Akun "${deletingUser.username}" telah berhasil dihapus dari sistem.`);
        setDeletingUser(null);
        await loadUsers();
      } else {
        throw new Error('Gagal menghapus dari database.');
      }
    } catch (err: any) {
      showNotif('err', err.message || 'Gagal menghapus user.');
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleDesc = (role: Role) => {
    switch (role) {
      case 'Admin':
        return 'Hak Akses Penuh: Pengendalian sistem keuangan, prapemrosesan, konfigurasi database, integrasi eksternal, dan manajemen hak akses.';
      case 'Pengelola':
        return 'Petugas Lapangan: Terfokus pada pencatatan transaksi masuk & keluar terkait pengelolaan & perawatan operasional greenhouse.';
      case 'Finance':
        return 'Verifikator & Manajemen Finansial: Mengelola arus kas non-operasional, persetujuan modal kerja, dan memiliki wewenang ekspor visualisasi.';
      case 'Accounting':
        return 'Tim Audit & Analisis: Menyusun audit, neraca, klasifikasi biaya, serta mengakses asisten cerdas AI untuk prediksi laba rugi modern.';
      default:
        return '';
    }
  };

  // Filter & Search users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRoleFilter === 'All' || u.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div id="admin-users-view" className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-5.5 h-5.5 text-indigo-600" />
            Manajemen Akun & Hak Akses Tim
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Kelola, tambah, modifikasi, atau hapus kredensial tim berdasarkan pembagian tanggung jawab operasional.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={loadUsers}
            disabled={loading}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors shadow-3xs"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleStartCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Akun Pengguna
          </button>
        </div>
      </div>

      {notificationBox()}

      {/* Main Grid: Forms and Cards Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sidebar/Floating panel for Forms (Create / Edit User) */}
        <div className="lg:col-span-1 space-y-6">
          {isCreating && renderCreateForm()}
          {editingUsername && renderEditForm()}
          
          {/* Quick Stats Panel */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-4">Summary Pembagian Peran</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center bg-slate-800/40 p-2.5 rounded-xl">
                <span className="text-slate-300 font-medium font-sans">Total Anggota Terdaftar</span>
                <span className="font-mono font-bold text-white text-sm">{users.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-slate-800/20 p-2 rounded-lg text-center">
                  <span className="text-[10px] text-slate-400 block font-semibold mb-0.5">Admin</span>
                  <span className="font-mono font-bold text-white text-xs">{users.filter(u=>u.role==='Admin').length}</span>
                </div>
                <div className="bg-slate-800/20 p-2 rounded-lg text-center">
                  <span className="text-[10px] text-slate-400 block font-semibold mb-0.5">Pengelola</span>
                  <span className="font-mono font-bold text-white text-xs">{users.filter(u=>u.role==='Pengelola').length}</span>
                </div>
                <div className="bg-slate-800/20 p-2 rounded-lg text-center">
                  <span className="text-[10px] text-slate-400 block font-semibold mb-0.5">Finance</span>
                  <span className="font-mono font-bold text-white text-xs">{users.filter(u=>u.role==='Finance').length}</span>
                </div>
                <div className="bg-slate-800/20 p-2 rounded-lg text-center">
                  <span className="text-[10px] text-slate-400 block font-semibold mb-0.5">Accounting</span>
                  <span className="font-mono font-bold text-white text-xs">{users.filter(u=>u.role==='Accounting').length}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-400 leading-normal flex items-start gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Prinsip keamanan sistem: Setiap perubahan data keuangan akan dicatat di Log Aktivitas secara real-time.</span>
              </div>
            </div>
          </div>
        </div>

        {/* User list pane */}
        <div id="users-list-container" className="lg:col-span-2 space-y-4">
          
          {/* Controls bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-3xs flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari berdasarkan username atau peran..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-slate-350 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-950 transition-all font-sans"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="w-full md:w-44 px-3 py-2 bg-white border border-slate-200 text-slate-650 font-semibold text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-950 transition-all cursor-pointer shadow-3xs"
              >
                <option value="All">Semua Hak Akses</option>
                <option value="Admin">Admin</option>
                <option value="Pengelola">Pengelola (Lapangan)</option>
                <option value="Finance">Finance</option>
                <option value="Accounting">Accounting</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-xs text-slate-500 mt-3 font-semibold">Sedang menyelaraskan hak akses...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-3xs">
              <Users2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-xs font-semibold">Tidak ada data pengguna yang cocok dengan kriteria pencarian.</p>
              <p className="text-[10px] text-slate-400 mt-1">Klik "+ Tambah Akun Pengguna" untuk membuat user tim baru.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredUsers.map(u => {
                const isSelectedForEdit = editingUsername === u.username;
                const isActiveSession = activeUser && activeUser.username.toLowerCase() === u.username.toLowerCase();
                return (
                  <div 
                    key={u.username}
                    className={`bg-white rounded-2xl border p-5 transition-all duration-300 shadow-3xs hover:shadow-2xs ${
                      isSelectedForEdit ? 'border-indigo-400 ring-2 ring-indigo-500/15' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col justify-between h-full space-y-4">
                      
                      {/* Badge and Top Row */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border ${
                            u.role === 'Admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            u.role === 'Pengelola' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            u.role === 'Finance' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            'bg-violet-50 text-violet-700 border-violet-200'
                          }`}>
                            {u.role}
                          </span>
                          {isActiveSession && (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 font-bold px-2 py-0.5 rounded-full font-sans">
                              Sesi Aktif
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 font-mono mt-1 break-all">
                          {u.username}
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed pt-1.5">
                          {getRoleDesc(u.role)}
                        </p>
                      </div>

                      {/* Password and Actions Panel */}
                      <div className="border-t border-slate-100/80 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                        {/* Masked Password */}
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                          <span className="text-[10px] text-slate-400">PW:</span>
                          <span className="font-mono text-slate-700 font-semibold tracking-wide text-xs">
                            {visiblePasswords[u.username] ? u.password : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(u.username)}
                            className="text-slate-400 hover:text-slate-600 p-0.5 ml-1 transition-colors"
                            title={visiblePasswords[u.username] ? 'Sembunyikan' : 'Tampilkan'}
                          >
                            {visiblePasswords[u.username] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Edit & Delete Action Buttons */}
                        <div className="flex gap-1.5 ml-auto">
                          <button
                            onClick={() => handleStartEdit(u)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/50 rounded-lg transition-all"
                            title="Edit Akun"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleConfirmDelete(u)}
                            disabled={isActiveSession}
                            className={`p-1.5 text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/50 rounded-lg transition-all ${isActiveSession ? 'opacity-35 cursor-not-allowed hover:bg-slate-50 hover:text-slate-500' : ''}`}
                            title={isActiveSession ? 'Tidak dapat menghapus diri sendiri' : 'Hapus Akun'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* Delete Confirmation Modal Overlay */}
      {deletingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-rose-50 text-rose-600 rounded-lg p-2 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-850 text-sm">Konfirmasi Hapus Pengguna</h3>
                <p className="text-xs text-slate-500 leading-normal">
                  Apakah Anda yakin ingin menghapus akun <span className="font-mono font-bold text-slate-800">{deletingUser.username}</span> dengan role <span className="font-semibold text-slate-700">{deletingUser.role}</span>?
                </p>
                <p className="text-[10px] text-rose-600 font-semibold bg-rose-50 border border-rose-100/50 p-2 rounded-lg mt-2 leading-relaxed">
                  Peringatan: Pengguna ini tidak akan bisa login lagi ke sistem.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingUser(null)}
                disabled={actionLoading}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  function notificationBox() {
    if (!notif) return null;
    return (
      <div className={`p-4 rounded-xl text-xs flex items-center gap-2.5 shadow-3xs transition-all border ${
        notif.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-100'
      }`}>
        {notif.type === 'success' ? (
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
        )}
        <span className="font-semibold">{notif.message}</span>
      </div>
    );
  }

  function renderCreateForm() {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-4 animate-slide-up">
        <div className="flex items-center justify-between border-b border-slate-150 pb-3">
          <h3 className="font-display font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-indigo-600" />
            Tambah Akun Tim Baru
          </h3>
          <button 
            onClick={handleCancelCreate}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Username Pengguna</label>
            <input 
              type="text"
              required
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.replace(/\s+/g, ''))}
              placeholder="Contoh: agus_lapangan"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password Login</label>
            <input 
              type="text"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tingkat Hak Akses / Peran</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer shadow-3xs"
            >
              <option value="Admin">Admin</option>
              <option value="Pengelola">Pengelola (Petugas Lapangan)</option>
              <option value="Finance">Finance</option>
              <option value="Accounting">Accounting (Audit & AI)</option>
            </select>
            <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg mt-2 text-[10px] text-slate-400 leading-normal">
              {getRoleDesc(newRole)}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancelCreate}
              disabled={actionLoading}
              className="px-3.5 py-2 border border-slate-250 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {actionLoading ? 'Menyimpan...' : 'Simpan User'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  function renderEditForm() {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-4 animate-slide-up">
        <div className="flex items-center justify-between border-b border-slate-150 pb-3">
          <h3 className="font-display font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <Edit className="w-4 h-4 text-emerald-600" />
            Edit Info Pengguna
          </h3>
          <button 
            onClick={handleCancelEdit}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleUpdateUser} className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Username Pengguna (Baru)</label>
            <input 
              type="text"
              required
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value.replace(/\s+/g, ''))}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password Login Baru</label>
            <input 
              type="text"
              required
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tingkat Hak Akses / Peran</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as Role)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer shadow-3xs"
            >
              <option value="Admin">Admin</option>
              <option value="Pengelola">Pengelola (Petugas Lapangan)</option>
              <option value="Finance">Finance</option>
              <option value="Accounting">Accounting (Audit & AI)</option>
            </select>
            <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg mt-2 text-[10px] text-slate-400 leading-normal">
              {getRoleDesc(editRole)}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={actionLoading}
              className="px-3.5 py-2 border border-slate-250 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {actionLoading ? 'Memperbarui...' : 'Pembaruan Akun'}
            </button>
          </div>
        </form>
      </div>
    );
  }
}
