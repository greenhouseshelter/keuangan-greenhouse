import React, { useState } from 'react';
import { 
  BookOpen, ChevronLeft, ChevronRight, CheckCircle, Shield, Settings, 
  FileSpreadsheet, Users, BrainCircuit, Landmark, UploadCloud, Copy, 
  Check, FileText, LayoutDashboard, ScrollText, Star, AlertCircle, KeyRound, HelpCircle
} from 'lucide-react';

interface Slide {
  title: string;
  subTitle: string;
  description: string[];
  tips: string;
  mockupType: 'dashboard' | 'transaction' | 'userConfig' | 'aiAnalytics' | 'report' | 'appsScript';
}

interface RoleManual {
  role: string;
  icon: any;
  color: string;
  borderColor: string;
  bgColor: string;
  description: string;
  slides: Slide[];
}

export default function UserManualView() {
  const [activeRoleIndex, setActiveRoleIndex] = useState<number>(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  // Updated entire Apps Script for user to copy-paste
  const appsScriptCode = `// Nama file di Apps Script: code.gs
// SCRIPT PORTAL KEUANGAN GREENHOUSE DENGAN integrasi LOG AKTIVITAS SINKRON

function doGet(e) {
  var action = e.parameter.action;
  var response = { status: "error", message: "Action tidak dikenal" };
  
  try {
    if (action === "getTransactions") {
      response = { status: "success", data: getDataFromSheet("Transactions") };
    } else if (action === "getUsers") {
      response = { status: "success", data: getDataFromSheet("Users") };
    } else if (action === "getAccounts") {
      response = { status: "success", data: getDataFromSheet("Accounts") };
    } else if (action === "getProjects") {
      response = { status: "success", data: getDataFromSheet("Projects") };
    } else if (action === "getSettings") {
      response = { status: "success", data: getSystemSettings() };
    } else if (action === "getActivityLogs") {
      response = { status: "success", data: getDataFromSheet("ActivityLogs") };
    }
  } catch (err) {
    response = { status: "error", message: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var response = { status: "error", message: "Koneksi Post Gagal" };
  
  try {
    var rawData = e.postData.contents;
    var payload = JSON.parse(rawData);
    var action = payload.action;
    
    initSheetsIfNeeded();
    
    if (action === "addTransaction") {
      response = addRowToSheet("Transactions", payload.transaction);
    } else if (action === "updateTransaction") {
      response = updateRowInSheet("Transactions", payload.transaction);
    } else if (action === "deleteTransaction") {
      response = deleteRowInSheet("Transactions", payload.id);
    } else if (action === "updateUser") {
      response = updateUserInSheet(payload);
    } else if (action === "addAccount") {
      response = addRowToSheet("Accounts", payload.account);
    } else if (action === "updateAccount") {
      response = updateRowInSheet("Accounts", payload.account);
    } else if (action === "deleteAccount") {
      response = deleteRowInSheet("Accounts", payload.id);
    } else if (action === "addProject") {
      response = addRowToSheet("Projects", payload.project);
    } else if (action === "updateProject") {
      response = updateRowInSheet("Projects", payload.project);
    } else if (action === "deleteProject") {
      response = deleteRowInSheet("Projects", payload.id);
    } else if (action === "updateSettings") {
      response = updateSystemSettings(payload.key, payload.value);
    } else if (action === "uploadFile") {
      response = uploadImageToDrive(payload.filename, payload.mimeType, payload.base64Data);
    } else if (action === "addActivityLog") {
      response = addRowToSheet("ActivityLogs", payload.log);
    } else if (action === "clearActivityLogs") {
      response = clearSheetContent("ActivityLogs");
    }
  } catch (err) {
    response = { status: "error", message: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// === UTILITY FUNCTIONS ===

function getActiveSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getDataFromSheet(sheetName) {
  var ss = getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var headers = data[0];
  var result = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      // Format Tanggal ISO jika objek adalah Date
      if (val instanceof Date) {
        val = val.toISOString().split('T')[0];
      }
      obj[headers[j]] = val;
    }
    result.push(obj);
  }
  return result;
}

function addRowToSheet(sheetName, item) {
  var ss = getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { status: "error", message: "Sheet " + sheetName + " tidak ditemukan" };
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var newRow = [];
  
  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];
    var val = (item[key] !== undefined) ? item[key] : "";
    
    // Pastikan tipe data boolean, angka, dan tanggal dipertahankan dengan benar
    if (typeof val === "boolean") {
      val = val ? "true" : "false";
    }
    newRow.push(val);
  }
  
  sheet.appendRow(newRow);
  return { status: "success" };
}

function updateRowInSheet(sheetName, item) {
  var ss = getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { status: "error", message: "Sheet tidak ditemukan" };
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIndex = headers.indexOf("id");
  if (idIndex === -1) idIndex = 0; // fallback ke kolom pertama
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][idIndex].toString() === item.id.toString()) {
      var rowRange = sheet.getRange(i + 1, 1, 1, headers.length);
      var updatedRow = [];
      for (var j = 0; j < headers.length; j++) {
        var key = headers[j];
        var val = (item[key] !== undefined) ? item[key] : data[i][j];
        if (typeof val === "boolean") {
          val = val ? "true" : "false";
        }
        updatedRow.push(val);
      }
      rowRange.setValues([updatedRow]);
      return { status: "success" };
    }
  }
  return { status: "error", message: "ID tidak ditemukan" };
}

function deleteRowInSheet(sheetName, id) {
  var ss = getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { status: "error", message: "Sheet tidak ditemukan" };
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIndex = headers.indexOf("id");
  if (idIndex === -1) idIndex = 0;
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][idIndex].toString() === id.toString()) {
      sheet.deleteRow(i + 1);
      return { status: "success" };
    }
  }
  return { status: "error", message: "ID transaksi tidak ditemukan" };
}

function updateUserInSheet(payload) {
  var ss = getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  if (!sheet) return { status: "error", message: "Sheet Users tidak ditemukan" };
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][2].toString() === payload.role.toString()) { // Kolom Role ke-3 (indeks 2)
      sheet.getRange(i + 1, 1).setValue(payload.username); // Kolom Username ke-1
      sheet.getRange(i + 1, 2).setValue(payload.password); // Kolom Password ke-2
      return { status: "success" };
    }
  }
  return { status: "error", message: "Gagal menemukan user berdasarkan role" };
}

function getSystemSettings() {
  var ss = getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Settings");
  if (!sheet) {
    return { imageRequiredIn: "false", imageRequiredOut: "false" };
  }
  
  var data = sheet.getDataRange().getValues();
  var settings = {};
  for (var i = 1; i < data.length; i++) {
    settings[data[i][0]] = data[i][1];
  }
  return settings;
}

function updateSystemSettings(key, value) {
  var ss = getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Settings");
  if (!sheet) return { status: "error", message: "Sheet Settings tidak ada" };
  
  var data = sheet.getDataRange().getValues();
  var found = false;
  
  var stringVal = value.toString();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === key) {
      sheet.getRange(i + 1, 2).setValue(stringVal);
      found = true;
      break;
    }
  }
  
  if (!found) {
    sheet.appendRow([key, stringVal]);
  }
  return { status: "success" };
}

function clearSheetContent(sheetName) {
  var ss = getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { status: "error", message: "Sheet tidak ditemukan" };
  
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  return { status: "success" };
}

function uploadImageToDrive(filename, mimeType, base64Data) {
  try {
    var rawData = Utilities.base64Decode(base64Data.split(",")[1] || base64Data);
    var blob = Utilities.newBlob(rawData, mimeType, filename);
    
    var folder;
    var folders = DriveApp.getFoldersByName("Greenhouse_Uploads");
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder("Greenhouse_Uploads");
    }
    
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    
    return {
      status: "success",
      data: {
        id: file.getId(),
        url: file.getUrl()
      }
    };
  } catch (err) {
    return { status: "error", message: "Drive upload error: " + err.toString() };
  }
}

function initSheetsIfNeeded() {
  var ss = getActiveSpreadsheet();
  
  var expectedSheets = {
    "Transactions": ["id", "date", "description", "category", "account", "amount", "type", "evidenceUrl", "project"],
    "Users": ["username", "password", "role"],
    "Accounts": ["id", "name", "type", "description"],
    "Projects": ["id", "name", "category", "description", "targetBudget"],
    "Settings": ["key", "value"],
    "ActivityLogs": ["id", "timestamp", "username", "role", "action", "details"]
  };
  
  for (var sName in expectedSheets) {
    var sheet = ss.getSheetByName(sName);
    if (!sheet) {
      sheet = ss.insertSheet(sName);
      sheet.appendRow(expectedSheets[sName]);
    }
  }
}`;

  const roleManuals: RoleManual[] = [
    {
      role: 'Admin',
      icon: Shield,
      color: 'text-emerald-750',
      borderColor: 'border-emerald-250',
      bgColor: 'bg-emerald-50/50',
      description: 'Pemegang kendali penuh atas konfigurasi eksternal (Sheets API), pembagian hak akses pengguna, pemantauan riwayat log sistem komparatif, pengelolaan unit proyek per komoditas, dan pembuat keputusan utama.',
      slides: [
        {
          title: 'Manajemen Akun & Autentikasi Keamanan',
          subTitle: 'Pengendalian hak akses kredensial tim',
          description: [
            '1. Navigasikan ke menu "Kelola Hak Akses" di sidebar.',
            '2. Klik "+ Tambah Akun Pengguna" untuk membuka form pembuatan pengguna baru.',
            '3. Atur Username unik (misal: "budi_lapangan"), masukan password, dan tentukan tingkatan peran (Admin, Pengelola, Finance, Accounting) sesuai wewenang tanggung jawab.',
            '4. Klik "Simpan User" untuk menerbitkan user baru secara langsung ke cloud.'
          ],
          tips: 'Gunakan tombol bertanda icon mata untuk melihat isi password yang disimpan agar memudahkan verifikasi kredensial ketika rekan Anda kehilangan sandinya.',
          mockupType: 'userConfig'
        },
        {
          title: 'Audit Real-Time Melalui Log Aktivitas',
          subTitle: 'Menjaga transparansi seluruh entri di Google Sheets',
          description: [
            '1. Navigasikan ke panel "Log Aktivitas". Seluruh aksi CRUD (Tambah/Update/Hapus) di semua role tercatat otomatis lengkap dengan cap waktu (timestamp).',
            '2. Gunakan bar pencarian untuk mencari histori berdasarkan username, peran (role), atau aksi tertentu.',
            '3. Unduh data log tersebut berupa fail Excel, PDF, atau CSV menggunakan tombol ekspor yang berada di pojok kanan atas.',
            '4. Hanya Admin yang memiliki wewenang penuh untuk melakukan pembersihan massal (Clear Logs).'
          ],
          tips: 'Pencatatan log dilakukan dengan sistem non-blocking yang berarti aktivitas lapangan tetap berjalan kencang walau pencatatan cloud sedang berjalan di background.',
          mockupType: 'report'
        },
        {
          title: 'Apps Script Baru Pendukung Log',
          subTitle: 'Salin kode terintegrasi untuk Spreadsheet Anda',
          description: [
            '1. Kami telah mendesain program Apps Script baru yang mencakup inisialisasi lembar kerja "ActivityLogs".',
            '2. Silakan salin (copy) kode skrip yang tersedia di bawah ini.',
            '3. Buka Google Sheets Anda -> klik Extensions -> pilih Apps Script.',
            '4. Hapus seluruh isi skrip lama, tempel skrip baru ini, lalu klik ikon simpan dan lakukan Deploy ulang web app as "Anyone".'
          ],
          tips: 'Pembaruan skrip ini wajib dilakukan agar Google Sheets dapat membuat tabel penampung log secara otomatis.',
          mockupType: 'appsScript'
        }
      ]
    },
    {
      role: 'Pengelola',
      icon: ScrollText,
      color: 'text-amber-700',
      borderColor: 'border-amber-200',
      bgColor: 'bg-amber-50/50',
      description: 'Petugas lapangan yang mencatat transaksi operasional harian komoditas (Cabe, Melon, Perikanan, Ternak). Fokus pada kecepatan penulisan kas operasional dan penunggahan bukti nota transaksi fisik.',
      slides: [
        {
          title: 'Alur Cepat Input Transaksi Lapangan',
          subTitle: 'Mendaftarkan pemasukan & pengeluaran kas',
          description: [
            '1. Klik menu "Transaksi" pada bar samping Anda.',
            '2. Pada panel entri transaksi harian, tentukan tipe mutasi: "Kas Masuk / Inflow" (misal: Penjualan panen melon) atau "Kas Keluar / Outflow" (misal: Belanja nutrisi AB-Mix).',
            '3. Pilih Proyek Greenhouse spesifik (Melon, Cabe, Perikanan, Ternak) agar performa laba rugi komoditas terklasifikasi tepat sasaran.',
            '4. Masukan Jumlah Rupiah, Deskripsi deskriptif, Akun kas, dan tanggal realisasi transaksi.'
          ],
          tips: 'Isi deskripsi secara spesifik, misalnya "Pembelian Pupuk NPK Cair 5 Liter" daripada hanya menulis "Pupuk" guna memudahkan tim Accounting mengaudit.',
          mockupType: 'transaction'
        },
        {
          title: 'Kewajiban Pengunggahan Bukti Nota Fisik',
          subTitle: 'Menjamin validitas belanja kas operasional',
          description: [
            '1. Ketika menginput kas, Anda akan melihat area "Unggah Bukti Transaksi" bercorak putus-putus.',
            '2. Anda dapat klik untuk memilih fail foto nota dari ponsel/komputer atau menyeret foto nota langsung ke area dropzone tersebut.',
            '3. Sistem akan memproses kompresi gambar dan mengunggahnya ke server Google Drive secara mulus.',
            '4. Bergantung kebijakan transaksi masuk/keluar yang diset, pengunggahan ini dapat bersifat "Melaju Saja (Opsional)" atau "Wajib".'
          ],
          tips: 'Jika pengisian gagal karena bukti kas masih wajib sedangkan Anda tidak memilikinya, hubungi Admin atau Finance untuk menyesuaikan kebijakan lewat setelan.',
          mockupType: 'transaction'
        }
      ]
    },
    {
      role: 'Finance',
      icon: Landmark,
      color: 'text-emerald-600',
      borderColor: 'border-emerald-250',
      bgColor: 'bg-emerald-50/20',
      description: 'Tim auditor dan pengendali modal kerja non-operasional. Mengelola kelayakan akun keuangan (Kas Utama, Bank Mandiri, dll.), mengawasi ketersediaan kas proyek, serta memiliki tombol ekspor rekapitulasi berkas.',
      slides: [
        {
          title: 'Manajemen Akun Finansial & Proyek',
          subTitle: 'Menyusun struktur kantong keuangan operasional',
          description: [
            '1. Akses menu "Kelola Akun" di sidebar.',
            '2. Finance berhak membuat penampung saldo baru (misal: "KAS KECIL - Lapangan" atau "Pribadi Dompet Digital") untuk menjaga perputaran kas operasional.',
            '3. Tentukan kategori Proyek komoditas baru (misal: Proyek budidaya bawang) dengan nilai estimasi Target Anggaran di menu "Kelola Proyek".',
            '4. Data proyek dan akun ini langsung tersinkron dan siap digunakan tim lapangan saat menginput transaksi.'
          ],
          tips: 'Menetapkan anggaran target yang realistis di kelola proyek akan membantu visualisasi ringkasan realisasi kas di dashboard menjadi akurat.',
          mockupType: 'userConfig'
        },
        {
          title: 'Verifikasi Aturan & Kebijakan Bukti Transaksi',
          subTitle: 'Menjaga kepatuhan pelaporan nota operasional',
          description: [
            '1. Masuk ke halaman "Transaksi".',
            '2. Di pojok kanan, tim Finance dibekali panel "Kebijakan Bukti Kas" untuk menyetel aturan pengisian kas lapangan.',
            '3. Setel "Pemasukan Wajib Bukti" atau "Pengeluaran Wajib Bukti" sesuai kenyamanan pengarsipan.',
            '4. Perubahan setelan kebijakan ini langsung aktif untuk semua pengguna lapangan lain saat itu juga.'
          ],
          tips: 'Aktifkan aturan "Pengeluaran Wajib Bukti" agar pengelola lapangan tidak dapat menyimpan transaksi luar kas tanpa mengunggah berkas bon terlebih dahulu.',
          mockupType: 'transaction'
        }
      ]
    },
    {
      role: 'Accounting',
      icon: BrainCircuit,
      color: 'text-violet-700',
      borderColor: 'border-violet-200',
      bgColor: 'bg-violet-50/50',
      description: 'Tim analisis cerdas, audit penutupan buku laba-rugi per komoditas, evaluasi margin, pelapor laporan pajak, serta pengguna asisten analitik pintar bertenaga Gemini AI untuk proyeksi kalkulasi laba-rugi masa depan.',
      slides: [
        {
          title: 'Rekapitulasi Rugi Laba & Cetak Laporan',
          subTitle: 'Monitoring kesehatan keuangan per komoditas mandiri',
          description: [
            '1. Buka halaman "Laporan Laba Rugi".',
            '2. Pilih Filter bulan dan tahun untuk melihat perbandingan arus kas masuk vs arus kas keluar.',
            '3. Periksa visualisasi Margin Laba Bersih, struktur diagram komposisi, serta rincian komoditas (Cabe, Melon, dll) yang berkontribusi rugi atau laba.',
            '4. Klik icon "Printer" untuk mencetak laporan resmi atau menyimpannya sebagai file PDF siap cetak.'
          ],
          tips: 'Cetak laporan bulanan secara konsisten untuk diarsipkan dalam rapat triwulan bersama para pemegang saham Greenhouse.',
          mockupType: 'report'
        },
        {
          title: 'Pemanfaatan Asisten Keuangan Gemini AI',
          subTitle: 'Mendapatkan wawasan finansial prediktif dalam detik',
          description: [
            '1. Masuk ke tab "Asisten Analisis AI".',
            '2. Sistem akan menghimpun ratusan data riwayat transaksi real-time di Spreadsheet.',
            '3. Klik tombol "Dapatkan Analisis Keuangan Cerdas" di tengah panel.',
            '4. Model modern Gemini AI akan menjabarkan performa kas umum, performa proyek terbaik, deteksi boros biaya, dan memberikan 3 rekomendasi taktis agribisnis.'
          ],
          tips: 'Salin teks hasil analisis AI ke dalam dokumen rapat bulanan untuk dijadikan basis pengambilan keputusan manajerial.',
          mockupType: 'aiAnalytics'
        }
      ]
    }
  ];

  const activeRole = roleManuals[activeRoleIndex];
  const activeSlide = activeRole.slides[currentSlideIndex];

  const handleNextSlide = () => {
    if (currentSlideIndex < activeRole.slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const handleRoleChange = (index: number) => {
    setActiveRoleIndex(index);
    setCurrentSlideIndex(0);
  };

  const copyScriptToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  return (
    <div id="user-manual-view" className="space-y-6 max-w-6xl mx-auto pb-12 font-sans">
      
      {/* View Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5.5 h-5.5 text-emerald-600" />
            Media Presentasi & Panduan Multi-Role
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Panduan interaktif lengkap dengan representasi screenshot visual untuk menunjang kegiatan operasional tim.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200/60 px-3 py-1.5 rounded-xl font-mono">
            VERSI VERIFIKASI: v1.0
          </span>
        </div>
      </div>

      {/* Role Switcher (Tabs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {roleManuals.map((rm, idx) => {
          const Icon = rm.icon;
          const isSelected = activeRoleIndex === idx;
          return (
            <button
              key={rm.role}
              id={`manual-role-tab-${idx}`}
              onClick={() => handleRoleChange(idx)}
              className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                isSelected 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md scale-102 font-semibold' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50/80 hover:shadow-3xs'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Icon className="w-4 h-4 shrink-0" />
                </div>
                <span className="text-xs font-bold tracking-wider font-display uppercase">Role: {rm.role}</span>
              </div>
              <p className={`text-[10px] leading-snug line-clamp-2 ${isSelected ? 'text-slate-350' : 'text-slate-450'}`}>
                {rm.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Main Slideshow Deck Card */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs grid grid-cols-1 lg:grid-cols-12 min-h-120">
        
        {/* Left Side: Presentation Slide Content (Lego style) */}
        <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between border-r border-slate-100 bg-slate-50/30">
          <div className="space-y-5">
            {/* Header / Page Number */}
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase border ${activeRole.bgColor} ${activeRole.color} ${activeRole.borderColor}`}>
                <Star className="w-3 h-3 fill-current" />
                Langkah {currentSlideIndex + 1} dari {activeRole.slides.length}
              </span>
              <span className="font-mono text-[10px] text-slate-450 font-bold uppercase">
                Slide Peran {activeRole.role}
              </span>
            </div>

            {/* Slide Texts */}
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-bold font-display text-slate-850 leading-tight">
                {activeSlide.title}
              </h3>
              <p className="text-xs text-indigo-700/85 font-semibold">
                {activeSlide.subTitle}
              </p>
            </div>

            {/* Step Guides lists */}
            <div className="space-y-2.5 pt-2">
              {activeSlide.description.map((step, sIdx) => (
                <div key={sIdx} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {step}
                  </p>
                </div>
              ))}
            </div>

            {/* Pro Tip Callout */}
            <div className={`p-4 rounded-2xl border ${activeRole.bgColor} ${activeRole.borderColor} space-y-1`}>
              <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[10px] uppercase tracking-wide">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                Tips Keberhasilan Operasional
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                {activeSlide.tips}
              </p>
            </div>
          </div>

          {/* Footer Slide Controls */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-6 lg:mt-0">
            <button
              onClick={handlePrevSlide}
              disabled={currentSlideIndex === 0}
              className={`px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1 transition-all ${
                currentSlideIndex === 0 
                  ? 'opacity-40 cursor-not-allowed bg-slate-50' 
                  : 'bg-white hover:bg-slate-50 active:scale-98 cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Kembali
            </button>
            
            <div className="flex gap-1.5">
              {activeRole.slides.map((_, dotIdx) => (
                <span 
                  key={dotIdx}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    currentSlideIndex === dotIdx ? 'bg-slate-900 w-4' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNextSlide}
              disabled={currentSlideIndex === activeRole.slides.length - 1}
              className={`px-4 py-2.5 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-all ${
                currentSlideIndex === activeRole.slides.length - 1 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-slate-900 hover:bg-slate-800 active:scale-98 cursor-pointer'
              }`}
            >
              Lanjut
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Side: Beautiful Mockup Representation (The Screenshot / Visual Demo) */}
        <div className="lg:col-span-7 bg-slate-950 p-6 sm:p-8 flex flex-col justify-center items-center relative overflow-hidden text-white group">
          {/* Subtle Grid overlay background */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

          {/* Screenshot Card Container */}
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden relative z-10 transition-transform duration-500 hover:scale-101">
            
            {/* Simulated Desktop window top bar */}
            <div className="bg-slate-950 px-4 py-2.5 flex items-center justify-between border-b border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              </div>
              <span className="text-[9px] font-mono font-semibold text-slate-400 select-none bg-slate-900 border border-slate-800 px-3 overflow-hidden py-0.5 rounded-md truncate max-w-56">
                keuangan-greenhouse.com/portal
              </span>
              <span className="w-4" />
            </div>

            {/* SCREENSHOT BODY: Render simulated UI based on active mockup type */}
            <div className="p-5 font-sans min-h-68 text-slate-350 text-xs">
              
              {activeSlide.mockupType === 'dashboard' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <span className="font-bold text-white font-display text-sm">Dashboard Utama</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono">
                      ONLINE
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 font-semibold block">Total Inflow</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono block mt-1">Rp 45,600,000</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 font-semibold block">Total Outflow</span>
                      <span className="text-sm font-bold text-rose-400 font-mono block mt-1">Rp 12,350,000</span>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                      <span>Margin Keuntungan</span>
                      <span className="text-emerald-400">73% (Sangat Sehat)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="w-[73%] h-full bg-emerald-400 rounded-full" />
                    </div>
                  </div>
                </div>
              )}

              {activeSlide.mockupType === 'transaction' && (
                <div className="space-y-3.5 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <ScrollText className="w-4 h-4 text-emerald-400" />
                      Registrasi Kas Baru
                    </span>
                    <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">Kas Masuk</span>
                  </div>
                  
                  <div className="space-y-2 text-[10px]">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-950 p-1.5 border border-slate-850 rounded-lg">
                        <span className="text-slate-500 block">PROYEK TARJET</span>
                        <span className="font-semibold text-white">PROYEK MELON (AB-Mix)</span>
                      </div>
                      <div className="bg-slate-950 p-1.5 border border-slate-850 rounded-lg">
                        <span className="text-slate-500 block">SALURAN KAS</span>
                        <span className="font-semibold text-white">Kas Utama</span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-950 p-2 border border-slate-850 rounded-lg">
                      <span className="text-slate-500 block">NOMINAL RUPIAH</span>
                      <span className="font-mono text-xs font-bold text-emerald-400 block mt-0.5">Rp 15,000,000</span>
                    </div>

                    <div className="border border-dashed border-slate-800 p-3 rounded-xl text-center bg-slate-950 flex flex-col items-center justify-center gap-1 text-[9px] text-slate-400">
                      <UploadCloud className="w-5 h-5 text-emerald-400" />
                      <span className="font-semibold">Bukti_Nota_Panen_Melon.jpg</span>
                      <span className="text-[8px] text-emerald-500 font-bold flex items-center gap-0.5">
                        <CheckCircle className="w-3 h-3" /> Berhasil Diunggah ke Drive
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeSlide.mockupType === 'userConfig' && (
                <div className="space-y-4.5 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-400" />
                      Struktur Akun & Akses Tim
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {/* Admin user card */}
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                      <div className="space-y-1 leading-none">
                        <span className="text-[10px] font-mono text-white block">budi_perkebunan</span>
                        <span className="text-[8px] text-emerald-400 font-bold tracking-wide uppercase mt-0.5 block">ROLE: ADMIN</span>
                      </div>
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                        Akun Anda (Sesi Aktif)
                      </span>
                    </div>
                    
                    {/* Lapangan user card */}
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 flex justify-between items-center opacity-70">
                      <div className="space-y-1 leading-none">
                        <span className="text-[10px] font-mono text-slate-300 block">agus_lapangan</span>
                        <span className="text-[8px] text-amber-400 font-bold tracking-wide uppercase mt-0.5 block">ROLE: PENGELOLA</span>
                      </div>
                      <div className="flex gap-1">
                        <span className="p-1 px-2 text-[8px] border border-slate-800 rounded bg-slate-900 font-bold">PW: Safe</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSlide.mockupType === 'aiAnalytics' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="font-bold text-indigo-400 flex items-center gap-1.5 font-display">
                      <BrainCircuit className="w-4 h-4" />
                      Asisten Keuangan AI Gemini
                    </span>
                    <span className="text-[9px] text-slate-400 bg-slate-950 px-2 py-0.5 border border-slate-800 rounded-lg">LLM Ready</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-indigo-950 font-sans leading-normal text-[10px] text-slate-300 max-h-44 overflow-y-auto space-y-2">
                    <p className="text-indigo-300 font-bold">💡 REKOMENDASI AGRIBISNIS GEMINI:</p>
                    <p className="italic">1. "Proyek Melon menghasilkan margin tertinggi (73%). Alokasikan 15% surplus kas inflow untuk ekspansi bibit unggul hidroponik baru."</p>
                    <p className="italic">2. "Komoditas Perikanan menyerap beban listrik pompa 18% lebih boros minggu lalu. Coba setel pemakaian solar-panel otomatis di siang hari."</p>
                  </div>
                </div>
              )}

              {activeSlide.mockupType === 'report' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <span className="font-bold text-white">Neraca Rugi Laba Mei 2026</span>
                    <span className="text-[9px] text-slate-500 font-mono font-bold">KONSOLIDASI</span>
                  </div>
                  <div className="space-y-2 text-[10px] bg-slate-950 p-3 rounded-xl border border-slate-850">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Pemasukan Melon</span>
                      <span className="font-mono text-emerald-400">+Rp 30,000,000</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Pemasukan Cabe</span>
                      <span className="font-mono text-emerald-400">+Rp 15,600,000</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-800 pt-1.5 mt-1.5 text-slate-300">
                      <span>Total Biaya Pupuk</span>
                      <span className="font-mono text-rose-400">-Rp 7,200,000</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Biaya Operasional</span>
                      <span className="font-mono text-rose-400">-Rp 5,150,000</span>
                    </div>
                  </div>
                </div>
              )}

              {activeSlide.mockupType === 'appsScript' && (
                <div className="space-y-3 animate-fade-in flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5 font-mono text-[10px]">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Google Apps Script Web App
                    </span>
                    <span className="text-[8px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">POST/GET SUPPORT</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Kode macros GS ini bertindak sebagai penjembatan database cloud Google Sheets agar bisa disinkronkan secara real-time dengan aplikasi.
                  </p>
                  <button
                    onClick={copyScriptToClipboard}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="w-4 h-4" />
                        Tersalin Ke Clipboard!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Salin Kode Apps Script
                      </>
                    )}
                  </button>
                </div>
              )}

            </div>
          </div>

          <div className="absolute bottom-3 left-6 text-[9.5px] text-slate-500 font-mono font-bold select-none text-center">
            *Visual Representasi Screenshot Interaktif
          </div>
        </div>

      </div>

      {/* Full Sheet script box below inside presentation page for accessibility */}
      <div id="full-script-section" className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-slate-850 text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-600 animate-pulse" />
              Kode Lengkap Google Apps Script Terintegrasi
            </h3>
            <p className="text-xs text-slate-500">
              Salin kode Google Apps Script di bawah ini untuk memperbarui Web App di Google Workspace agar mendukung penyimpanan Log Aktivitas baru Anda harian.
            </p>
          </div>
          <button
            onClick={copyScriptToClipboard}
            className="px-4 py-2 border border-slate-250 hover:bg-slate-50 hover:border-slate-350 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer"
          >
            {copiedScript ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                Berhasil Tersalin!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Salin Seluruh Kode
              </>
            )}
          </button>
        </div>

        <div className="relative">
          <pre className="p-5 bg-slate-950 text-emerald-400 font-mono text-[10px] leading-relaxed rounded-2xl overflow-x-auto max-h-80 border border-slate-850">
            <code>{appsScriptCode}</code>
          </pre>
          <div className="absolute top-3 right-3 bg-slate-900 border border-slate-800 text-[8px] text-slate-400 px-2 py-0.5 rounded-md font-mono select-none">
            GOOGLE SCRIPT GS
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl leading-normal text-xs text-amber-900 flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 font-semibold text-[11px]">
            <p className="font-bold">⚠️ Syarat Penting Deployment Google Apps Script:</p>
            <p className="font-medium text-slate-600">Pastikan Anda memilih tipe pemicu "Web App", setel "Execute asMe (your-email)" dan yang terpenting setel "Who has access" ke "Anyone". Jangan lupa untuk menyalin URL web app yang dihasilkan dan menyimpannya di setelan API portal ini.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
