import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../utils/db';
import { addActivityLog } from '../utils/activityLogger';
import { 
  Settings, Image, CheckCircle, AlertCircle, RefreshCw, 
  HelpCircle, ShieldAlert, Check, X, ToggleLeft, ToggleRight
} from 'lucide-react';

interface SystemSettingsViewProps {
  currentUsername: string;
  currentRole: string;
}

export default function SystemSettingsView({ currentUsername, currentRole }: SystemSettingsViewProps) {
  const [imageRequiredIn, setImageRequiredIn] = useState(false);
  const [imageRequiredOut, setImageRequiredOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'err'; message: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings = await getSettings();
      setImageRequiredIn(settings.imageRequiredIn);
      setImageRequiredOut(settings.imageRequiredOut);
    } catch (err) {
      console.error('Gagal mengambil pengaturan:', err);
      showNotification('err', 'Gagal memuat pengaturan dari Cloud.');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'err', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleToggle = async (key: 'imageRequiredIn' | 'imageRequiredOut', currentValue: boolean) => {
    const newValue = !currentValue;
    setSavingKey(key);
    
    try {
      const success = await saveSettings(key, newValue);
      if (success) {
        if (key === 'imageRequiredIn') {
          setImageRequiredIn(newValue);
        } else {
          setImageRequiredOut(newValue);
        }
        
        const labelText = key === 'imageRequiredIn' ? 'Uang Masuk (Inflow)' : 'Uang Keluar (Outflow)';
        const statusText = newValue ? 'Wajib' : 'Opsional';
        
        // Record Activity Log
        addActivityLog(
          'UBAH_PENGATURAN', 
          `Mengubah pengaturan bukti gambar ${labelText} menjadi [${statusText}]`
        );
        
        showNotification('success', `Berhasil mengupdate pengaturan ${labelText} menjadi ${statusText}!`);
      } else {
        showNotification('err', 'Gagal menyimpan pengaturan ke Google Sheets.');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      showNotification('err', 'Koneksi gagal saat mencoba memperbarui pengaturan.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2.5 bg-slate-950 text-white rounded-2xl">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight" id="title-pengaturan">
              Pengaturan Aturan Lampiran
            </h1>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Konfigurasikan apakah input bukti gambar transaksi hukumnya wajib atau opsional untuk seluruh operasional kebun baik uang masuk maupun uang keluar.
          </p>
        </div>

        <button
          onClick={loadSettings}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Segarkan
        </button>
      </div>

      {/* Notifications Alert banner */}
      {notification && (
        <div className={`p-4 border rounded-2xl flex gap-3 text-xs leading-relaxed transition-all duration-300 animate-slide-up ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-bold">{notification.type === 'success' ? 'Berhasil:' : 'Informasi:'}</span> {notification.message}
          </div>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs uppercase font-extrabold text-slate-500 tracking-wider">
              Persyaratan Lampiran Foto / Gambar Bukti
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-900" />
            <span className="text-[11px] font-medium font-mono text-slate-500">Menghubungkan ke Google Sheets...</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100/80">
            
            {/* Setting 1: Inflow */}
            <div className="py-5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Uang Masuk / Inflow
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Wajibkan Bukti Gambar untuk Uang Masuk
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Apabila diaktifkan, user pengirim data (Admin, Finance maupun Pengelola) mutlak harus melampirkan file foto nota/kwitansi/screenshot bukti pembayaran ketika mencatat arus kas masuk.
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <span className={`text-xs font-semibold ${imageRequiredIn ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {imageRequiredIn ? 'Wajib Lampirkan' : 'Opsional'}
                </span>
                <button
                  type="button"
                  id="toggle-image-in"
                  onClick={() => handleToggle('imageRequiredIn', imageRequiredIn)}
                  disabled={savingKey === 'imageRequiredIn'}
                  className={`relative inline-flex items-center focus:outline-none transition-opacity duration-200 disabled:opacity-50`}
                >
                  {imageRequiredIn ? (
                    <ToggleRight className="w-11 h-7 text-slate-950 cursor-pointer" />
                  ) : (
                    <ToggleLeft className="w-11 h-7 text-slate-300 cursor-pointer" />
                  )}
                </button>
              </div>
            </div>

            {/* Setting 2: Outflow */}
            <div className="py-5 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                    Uang Keluar / Outflow
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Wajibkan Bukti Gambar untuk Uang Keluar
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Apabila diaktifkan, personil yang mencatat pengeluaran atau pembelian (pupuk, bibit, peralatan, gaji) wajib mengunggah file foto nota transaksi pembelian fisik agar kasbon dapat disinkronkan.
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <span className={`text-xs font-semibold ${imageRequiredOut ? 'text-amber-600' : 'text-slate-400'}`}>
                  {imageRequiredOut ? 'Wajib Lampirkan' : 'Opsional'}
                </span>
                <button
                  type="button"
                  id="toggle-image-out"
                  onClick={() => handleToggle('imageRequiredOut', imageRequiredOut)}
                  disabled={savingKey === 'imageRequiredOut'}
                  className={`relative inline-flex items-center focus:outline-none transition-opacity duration-200 disabled:opacity-50`}
                >
                  {imageRequiredOut ? (
                    <ToggleRight className="w-11 h-7 text-slate-950 cursor-pointer" />
                  ) : (
                    <ToggleLeft className="w-11 h-7 text-slate-300 cursor-pointer" />
                  )}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Help Security Alert Info */}
      <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 text-xs text-slate-600 leading-relaxed flex gap-3">
        <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-900 block font-sans">🛡️ Hak Akses Konfigurasi Terbatas:</span>
          <p>
            Menu konfigurasi ini hanya dapat diakses oleh personil dengan peran <span className="font-bold text-slate-950">Admin, Finance, atau Accounting</span>. Setiap perubahan status persyaratan wajib lampiran akan otomatis terdistribusi, tersimpan ke Google Sheets "Settings", dan tercatat dalam Log Keamanan Aktivitas.
          </p>
        </div>
      </div>
    </div>
  );
}
