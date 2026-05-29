import React, { useState, useEffect } from 'react';
import { Database, Key, FolderOpen, HelpCircle, CheckCircle2, AlertTriangle, Code, Copy, Save, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { DatabaseConfig } from '../types';
import { getDatabaseConfig, saveDatabaseConfig } from '../utils/db';

interface AdminDatabaseViewProps {
  onConfigChanged: (config: DatabaseConfig) => void;
}

export default function AdminDatabaseView({ onConfigChanged }: AdminDatabaseViewProps) {
  const [webAppUrl, setWebAppUrl] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    // Load config from backend API
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const data = await response.json();
          setWebAppUrl(data.webAppUrl || '');
          setSpreadsheetId(data.spreadsheetId || '');
          setDriveFolderId(data.driveFolderId || '');
        }
      } catch (err) {
        // Fallback to local storage if API fails
        const config = getDatabaseConfig();
        setWebAppUrl(config.webAppUrl || '');
        setSpreadsheetId(config.spreadsheetId || '');
        setDriveFolderId(config.driveFolderId || '');
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const updatedConfig = {
      mode: 'sheets' as const,
      sheetsApiUrl: webAppUrl.trim(),
      webAppUrl: webAppUrl.trim(),
      spreadsheetId: spreadsheetId.trim(),
      driveFolderId: driveFolderId.trim()
    };

    try {
      // 1. Save to backend securely
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });

      if (response.ok) {
        // 2. Save to local storage for instant browser updates
        saveDatabaseConfig(updatedConfig);
        // 3. Notify app state
        onConfigChanged(updatedConfig);
        setMessage({ type: 'success', text: 'Konfigurasi database berhasil disimpan ke backend server dan lokal browser!' });
      } else {
        setMessage({ type: 'error', text: 'Gagal menyimpan konfigurasi ke backend server.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `Gagal menyimpan konfigurasi: ${err.message || String(err)}` });
    } finally {
      setSaving(false);
    }
  };

  const appsScriptCode = `/* 
  KODE GOOGLE APPS SCRIPT UNTUK FILE UPLOAD ANTI-ERROR DI GOOGLE DRIVE
  ==============================================================
  Ganti atau tambahkan fungsi uploadFile ini di dalam script Google Anda.
  Jika ID Folder tidak valid atau terjadi eror hak akses ke folder spesifik, 
  maka script akan otomatis membuat folder baru bernama "Bukti Kas Greenhouse" 
  di Google Drive root Anda sehingga operasi tidak akan pernah gagal (fail-proof).
*/

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var rawJson = JSON.parse(rawData);
    var action = rawJson.action;
    
    if (action === "uploadFile") {
      return ContentService.createTextOutput(JSON.stringify(uploadFile(rawJson)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // ... handles other actions like updateSettings, read, etc.
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function uploadFile(data) {
  var filename = data.filename || "file_" + Date.now();
  var mimeType = data.mimeType || "image/jpeg";
  var base64Data = data.base64Data;
  var folderId = data.folderId;
  
  if (!base64Data) {
    throw new Error("Base64 data tidak ditemukan.");
  }
  
  var decoded = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(decoded, mimeType, filename);
  
  var folder;
  
  // SOLUSI ANTI-GAGAL: Coba akses folder menggunakan ID yang dikirim
  if (folderId) {
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (err) {
      Logger.log("Akses folder ID gagal, akan otomatis membuat folder fallback...: " + err);
    }
  }
  
  // Jika folder tetap null, cari atau buat folder "Bukti Kas Greenhouse"
  if (!folder) {
    var folders = DriveApp.getFoldersByName("Bukti Kas Greenhouse");
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder("Bukti Kas Greenhouse");
    }
  }
  
  // Simpan file ke folder terpilih
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return {
    status: "success",
    data: {
      id: file.getId(),
      url: file.getUrl()
    }
  };
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 tracking-tight leading-none flex items-center gap-2">
            <Database className="w-6 h-6 text-emerald-600 shrink-0" />
            Pengaturan Database & Integrasi Google Sheets
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1.5">
            Konfigurasi koneksi langsung real-time dari panel frontend ke Google Sheets DB & Folder Google Drive Bukti Kas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Form Card (Left Column) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h3 className="text-sm font-bold font-display text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-600" />
              Kredensial Koneksi Cloud
            </h3>

            {message && (
              <div className={`p-4 rounded-xl mb-5 flex items-start gap-2.5 text-xs ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span className="font-medium">{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
              {/* Web App URL */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block">
                  Google Apps Script Web App URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    value={webAppUrl}
                    onChange={(e) => setWebAppUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block font-medium leading-normal">
                  Masukkan URL deployment Apps Script Anda (pastikan di-set sebagai *Execute as: Me* dan *Who has access: Anyone*).
                </span>
                {webAppUrl && !webAppUrl.includes('/exec') && (
                  <div className="bg-amber-50 text-amber-800 border border-amber-100 p-2.5 rounded-lg text-[10px] flex items-center gap-2 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Peringatan: URL Web App Apps Script biasanya diakhiri dengan <code>/exec</code></span>
                  </div>
                )}
              </div>

              {/* Spreadsheet ID */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block">
                  Google Sheets Spreadsheet ID
                </label>
                <input
                  type="text"
                  required
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  placeholder="ID Dokumen Google Sheets"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                />
                <span className="text-[10px] text-slate-400 block font-medium leading-normal">
                  ID dari URL Spreadsheet Anda, misalnya dari: <code>https://docs.google.com/spreadsheets/d/<b>SpreadsheetID_Ada_Di_Sini</b>/edit</code>
                </span>
              </div>

              {/* Drive Folder ID */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block">
                    Google Drive Folder ID (Bukti Gambar)
                  </label>
                  <span className="text-[9px] font-extrabold uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Opsional</span>
                </div>
                <input
                  type="text"
                  value={driveFolderId}
                  onChange={(e) => setDriveFolderId(e.target.value)}
                  placeholder="Isi ID folder Google Drive tujuan unggah foto kuitansi"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                />
                <span className="text-[10px] text-slate-400 block font-medium leading-normal">
                  ID dari URL Folder Google Drive Anda. Kosongkan parameter ini untuk membiarkan Google Apps Script secara otomatis membuat folder baru bernama <strong>"Bukti Kas Greenhouse"</strong> di dalam Drive Anda.
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white/80" />
                      Sedang Menyimpan Konfigurasi...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Simpan Pengaturan Database
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Solution Guide to Google Drive Permission Failure */}
          <div className="bg-emerald-50/40 border border-emerald-100 rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-bold font-display text-slate-800 uppercase tracking-widest flex items-center gap-2 leading-none">
              <FolderOpen className="w-4 h-4 text-emerald-700" />
              💡 PANDUAN SOLUSI: IJIN REKENING (PERMISSION DRIVEAPP)
            </h3>
            
            <div className="text-xs text-slate-700 space-y-3 leading-relaxed">
              <p>
                Jika Anda melihat pesan galat/eror: <strong>"You do not have permission to call DriveApp.Folder.createFile"</strong>, Google Apps Script Anda memerlukan persetujuan otorisasi sekali saja untuk dapat membuat file di dalam akun Google Drive baru Anda (<code>greenhouseshelter@gmail.com</code>).
              </p>
              
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <span className="font-bold text-[11px] text-slate-800 uppercase tracking-wider block">Langkah-Langkah Mengizinkan DriveApp:</span>
                <ol className="list-decimal list-inside space-y-1.5 font-medium text-slate-600">
                  <li>Buka Google Spreadsheet lalu buka menu <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>.</li>
                  <li>Di dalam panel script, salin kode Apps Script anti-error di bagian kanan, lalu gantikan atau tempelkan fungsi <code>uploadFile</code> Anda.</li>
                  <li>Pada dropdown fungsi di bagian atas debugger, pilih fungsi <code>doPost</code> atau fungsi upload apa saja.</li>
                  <li>Klik tombol <strong>"Run" (Jalankan)</strong> di bagian atas.</li>
                  <li>Akan muncul dialog <strong>"Otorisasi Diperlukan" (Authorization Required)</strong>. Klik tombol <strong>Tinjau Izin</strong>.</li>
                  <li>Pilih akun Google Anda (<code>greenhouseshelter@gmail.com</code>).</li>
                  <li>Klik teks abu-abu kecil <strong>Lanjutan (Advanced)</strong> di pojok kiri bawah, lalu klik <strong>Buka Project Tanpa Nama (unsafe) / Go to ...</strong></li>
                  <li>Klik tombol biru <strong>Izinkan (Allow)</strong> untuk memberikan akses ke Google Drive Anda.</li>
                  <li>Selesai! Google Drive Anda sekarang siap menerima unggahan secara langsung.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Apps Script Code Helper (Right Column) */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-slate-300 border border-slate-800 rounded-3xl p-5 shadow-sm overflow-hidden flex flex-col h-full max-h-[640px]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-white">Kode Script Google</span>
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-bold hover:bg-slate-800 hover:text-white transition-all cursor-pointer text-slate-400"
              >
                {copiedScript ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Salin Kode
                  </>
                )}
              </button>
            </div>
            
            <p className="text-[10px] text-slate-400 mb-3 leading-normal shrink-0">
              Gunakan kode di bawah ini pada Google Apps Script Anda untuk meloloskan proses unggah file dengan mode backup otomatis jika ijin folder spesifik mengalami kendala.
            </p>

            <div className="flex-1 overflow-auto rounded-xl bg-slate-950 p-3.5 border border-slate-800/80 font-mono text-[10px] leading-relaxed text-emerald-300">
              <pre className="whitespace-pre-wrap select-all">{appsScriptCode}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
