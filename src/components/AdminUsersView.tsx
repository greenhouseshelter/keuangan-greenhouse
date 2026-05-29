import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { getUsers, updateUser } from '../utils/db';
import { Shield, Eye, EyeOff, Save, CheckCircle, AlertCircle, RefreshCw, KeyRound } from 'lucide-react';

export default function AdminUsersView() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [notif, setNotif] = useState<{ type: 'success' | 'err'; message: string } | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadUsers();
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

  const togglePasswordVisibility = (role: string) => {
    setVisiblePasswords(prev => ({ ...prev, [role]: !prev[role] }));
  };

  const handleStartEdit = (user: User) => {
    setEditingRole(user.role);
    setUsername(user.username);
    setPassword(user.password);
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    setUsername('');
    setPassword('');
  };

  const handleSave = async (role: Role) => {
    if (!username.trim() || !password.trim()) {
      setNotif({ type: 'err', message: 'Username dan Password tidak boleh kosong.' });
      return;
    }
    setUpdating(true);
    setNotif(null);
    try {
      const success = await updateUser({ role, username: username.trim(), password: password.trim() });
      if (success) {
        setNotif({ type: 'success', message: `Berhasil memperbarui akun untuk role: ${role}` });
        setEditingRole(null);
        await loadUsers();
      } else {
        throw new Error('Database connector failed to update user.');
      }
    } catch (err: any) {
      setNotif({ type: 'err', message: `Gagal memperbarui: ${err.message || 'Error koneksi'}` });
    } finally {
      setUpdating(false);
      setTimeout(() => setNotif(null), 4000);
    }
  };

  // Helper helper description for Indonesian terms
  const getRoleDesc = (role: Role) => {
    switch (role) {
      case 'Admin':
        return 'Akses penuh ke semua fungsi sistem keuangan, pengaturan database, serta pengelolaan kredensial akun pengguna.';
      case 'Pengelola':
        return 'Petugas operasional lapangan. Khusus melakukan pencatatan transaksi masuk & keluar terkait aktivitas operasional greenhouse langsung.';
      case 'Finance':
        return 'Mengelola keuangan strategis & pencatatan transaksi selain operasional harian. Memiliki akses penuh membaca laporan operasional Pengelola.';
      case 'Accounting':
        return 'Berwenang atas audit laporan keuangan umum, analisis laba-rugi per proyek, kompilasi neraca, serta menjalankan asisten analisis keuangan kecerdasan buatan (AI).';
      default:
        return '';
    }
  };

  return (
    <div id="admin-users-view" className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            Manajemen Akun & Hak Akses Tim
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Sebagai Administrator, Anda mengendalikan penuh username & password login untuk masing-masing hak akses pengguna.
          </p>
        </div>
        <button 
          onClick={loadUsers}
          disabled={loading}
          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors disabled:opacity-50"
          title="Segarkan Kredensial"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {notif && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
          notif.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'
        }`}>
          {notif.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{notif.message}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
          <p className="text-xs text-slate-500 mt-2">Sedang memuat data akun pengguna...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {users.map(u => {
            const isEditing = editingRole === u.role;
            return (
              <div 
                key={u.role}
                className={`bg-white rounded-2xl border p-6 transition-all duration-300 shadow-xs ${
                  isEditing ? 'border-indigo-400 ring-2 ring-indigo-500/10' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold ${
                        u.role === 'Admin' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        u.role === 'Pengelola' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        u.role === 'Finance' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {u.role}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">Role ID: {u.role.toLowerCase()}</span>
                    </div>
                    <p className="text-xs text-slate-500 max-w-2xl leading-relaxed mt-2">{getRoleDesc(u.role)}</p>
                  </div>

                  {/* Operational Settings Form */}
                  <div className="w-full md:w-auto shrink-0 md:text-right">
                    {!isEditing ? (
                      <div className="bg-slate-50 rounded-xl p-3 inline-block text-left w-full md:w-64 border border-slate-100">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kredensial Login</span>
                          <button
                            onClick={() => handleStartEdit(u)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            Ubah Password
                          </button>
                        </div>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Username:</span>
                            <span className="font-mono font-medium text-slate-800">{u.username}</span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-slate-400">Password:</span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-medium text-slate-800">
                                {visiblePasswords[u.role] ? u.password : '••••••••'}
                              </span>
                              <button
                                onClick={() => togglePasswordVisibility(u.role)}
                                className="text-slate-400 hover:text-slate-600 p-0.5"
                                title={visiblePasswords[u.role] ? 'Sembunyikan' : 'Tampilkan'}
                              >
                                {visiblePasswords[u.role] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200 w-full md:w-80 text-left">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                          <KeyRound className="w-4 h-4 text-indigo-500" />
                          Ubah Akun {u.role}
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">USERNAME</label>
                          <input 
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">PASSWORD BARU</label>
                          <div className="relative">
                            <input 
                              type={visiblePasswords[u.role] ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-8"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(u.role)}
                              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                            >
                              {visiblePasswords[u.role] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2 border-t border-slate-200/40">
                          <button
                            onClick={handleCancelEdit}
                            disabled={updating}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            Batal
                          </button>
                          <button
                            onClick={() => handleSave(u.role)}
                            disabled={updating}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Simpan
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
