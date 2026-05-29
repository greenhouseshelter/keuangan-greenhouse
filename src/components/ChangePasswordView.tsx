import React, { useState } from 'react';
import { User } from '../types';
import { updateUser } from '../utils/db';
import { addActivityLog } from '../utils/activityLogger';
import { KeyRound, Eye, EyeOff, Save, CheckCircle, AlertCircle, RefreshCw, Shield } from 'lucide-react';

interface ChangePasswordViewProps {
  currentUser: User;
  onPasswordChanged: (updatedUser: User) => void;
}

export default function ChangePasswordView({ currentUser, onPasswordChanged }: ChangePasswordViewProps) {
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState<{ type: 'success' | 'err'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotif(null);

    // Form inputs validation
    if (!currentPasswordInput || !newPassword || !confirmPassword) {
      setNotif({ type: 'err', message: 'Semua kolom wajib diisi.' });
      return;
    }

    if (currentPasswordInput !== currentUser.password) {
      setNotif({ type: 'err', message: 'Password saat ini salah.' });
      return;
    }

    if (newPassword.length < 4) {
      setNotif({ type: 'err', message: 'Password baru minimal berisi 4 karakter.' });
      return;
    }

    if (newPassword === currentUser.password) {
      setNotif({ type: 'err', message: 'Password baru tidak boleh sama dengan password saat ini.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setNotif({ type: 'err', message: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    setLoading(true);

    try {
      const updatedUser: User = {
        role: currentUser.role,
        username: currentUser.username,
        password: newPassword
      };

      const success = await updateUser(updatedUser);

      if (success) {
        addActivityLog('UBAH_PASSWORD', `Mengubah password login untuk akun: ${currentUser.username}`);
        setNotif({ type: 'success', message: 'Password berhasil diperbarui!' });
        onPasswordChanged(updatedUser);
        // Clear fields
        setCurrentPasswordInput('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        throw new Error('Gagal memperbarui di database cloud Google Sheets.');
      }
    } catch (err: any) {
      setNotif({ type: 'err', message: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="change-password-view" className="space-y-6 max-w-xl mx-auto">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-emerald-600" />
          Ganti Password Akun
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Perbarui kata sandi login Anda secara berkala untuk menjaga keamanan akses portal keuangan.
        </p>
      </div>

      {notif && (
        <div className={`p-4 rounded-xl flex items-start gap-3 text-xs animate-in fade-in slide-in-from-top-2 duration-200 border ${
          notif.type === 'success' 
            ? 'bg-emerald-50 border-emerald-150 text-emerald-800' 
            : 'bg-rose-50 border-rose-150 text-rose-800'
        }`}>
          {notif.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <div className="font-semibold">{notif.message}</div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        {/* User Information Display */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-50 rounded-xl border border-slate-100 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Akun Aktif</span>
            <span className="text-xs font-bold text-slate-700 block">Username: <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">{currentUser.username}</span></span>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-3xs shrink-0 select-none">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] uppercase font-bold text-slate-600">Hak Akses: {currentUser.role}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">
              Password Saat Ini <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                required
                value={currentPasswordInput}
                onChange={(e) => setCurrentPasswordInput(e.target.value)}
                placeholder="Masukkan kata sandi lama Anda..."
                disabled={loading}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white pr-10 disabled:opacity-60 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-650 focus:outline-none"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 my-4" />

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">
              Password Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 4 karakter..."
                disabled={loading}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white pr-10 disabled:opacity-60 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-650 focus:outline-none"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">
              Ulangi Password Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru untuk konfirmasi..."
                disabled={loading}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white pr-10 disabled:opacity-60 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-650 focus:outline-none"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sedang Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
