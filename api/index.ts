import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Prevent HTTP caching of API requests to make sure separate tabs get active, up-to-date status
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Extract spreadsheet ID from url if full spreadsheet link is provided
function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.startsWith('http') || trimmed.includes('/spreadsheets/')) {
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return trimmed;
}

const CONFIG_FILE = path.join(process.cwd(), 'backend_config.json');

// Get configuration securely stored in backend
function getBackendConfig() {
  let webAppUrl = '';
  let spreadsheetIdRaw = '';

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      webAppUrl = parsed.webAppUrl || '';
      spreadsheetIdRaw = parsed.spreadsheetId || '';
    }
  } catch (err) {
    console.error('Error reading backend config file:', err);
  }

  // Fallback to environment variables if file values are empty
  if (!webAppUrl) {
    webAppUrl = process.env.VITE_SHEETS_API_URL || process.env.SHEETS_API_URL || '';
  }
  if (!spreadsheetIdRaw) {
    spreadsheetIdRaw = process.env.VITE_SPREADSHEET_ID || process.env.SPREADSHEET_ID || '';
  }

  const spreadsheetId = extractSpreadsheetId(spreadsheetIdRaw);
  return { webAppUrl, spreadsheetId };
}

// Lazy-loaded Gemini AI client to prevent crash on startup if key is missing
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required but not set in environment secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Backend API Routes first
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/debug-key', (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({
      status: 'missing',
      message: 'Kunci API (GEMINI_API_KEY) tidak ditemukan di panel Secrets environment server.'
    });
  }
  
  const trimmed = apiKey.trim();
  const hasWhitespace = apiKey !== trimmed;
  const isValidFormat = apiKey.startsWith('AIzaSy') || apiKey.startsWith('AQ.');
  
  return res.json({
    status: 'found',
    length: apiKey.length,
    prefix: apiKey.slice(0, 6) + '...',
    endsWith: '...' + apiKey.slice(-4),
    hasWhitespace,
    isValidFormat,
    message: isValidFormat 
      ? (hasWhitespace ? 'Kunci ditemukan, tetapi mengandung spasi kosong di awal/akhir baris. Harap hapus spasi tersebut pada panel Secrets.' : 'Kunci ditemukan dan berformat valid (dimulai dengan AIzaSy atau AQ).')
      : 'Kunci ditemukan tetapi format tidak biasa (tidak dimulai dengan "AIzaSy" atau "AQ."). Mohon pastikan kembali Anda meng-copy seluruh teks API Key dengan benar.'
  });
});

app.get('/api/config', (req, res) => {
  const cfg = getBackendConfig();
  res.json({
    isConfigured: !!cfg.webAppUrl,
    mode: cfg.webAppUrl ? 'sheets' : 'local'
  });
});

app.all('/api/sheets-proxy', async (req, res): Promise<any> => {
  const config = getBackendConfig();
  const webAppUrl = config.webAppUrl || '';
  const spreadsheetId = config.spreadsheetId || '';

  if (!webAppUrl) {
    return res.status(400).json({ status: 'error', message: 'Google Sheets Web App URL is not configured on the server.' });
  }

  const { method, query, body } = req;

  try {
    let targetUrl = webAppUrl;

    // Merge spreadsheet ID into request parameters for search params
    const updatedQuery = { ...query } as any;
    if (spreadsheetId) {
      updatedQuery.spreadsheetId = spreadsheetId;
      updatedQuery.sheetId = spreadsheetId;
    }

    if (method === 'GET' || Object.keys(updatedQuery).length > 0) {
      const queryValue = new URLSearchParams(updatedQuery).toString();
      targetUrl = queryValue ? `${webAppUrl}${webAppUrl.includes('?') ? '&' : '?'}${queryValue}` : webAppUrl;
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 20000); // 20s timeout for script responses

    const fetchOptions: any = {
      method,
      signal: controller.signal,
      headers: {}
    };

    if (method === 'POST') {
      fetchOptions.headers['Content-Type'] = 'application/json';
      let postBody = body || {};
      if (typeof postBody === 'object' && spreadsheetId) {
        postBody = {
          ...postBody,
          spreadsheetId,
          sheetId: spreadsheetId
        };
      }
      fetchOptions.body = JSON.stringify(postBody);
    }

    const response = await fetch(targetUrl, fetchOptions);
    clearTimeout(id);

    if (!response.ok) {
      return res.status(response.status).json({
        status: 'error',
        message: `Google Sheets returned status ${response.status}`
      });
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      return res.json(json);
    } else {
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        return res.json(json);
      } catch (e) {
        // If it looks like HTML, Google is returning an error page or authorization redirect
        if (text.trim().startsWith('<') || text.toLowerCase().includes('<html')) {
          return res.status(502).json({
            status: 'error',
            errorType: 'html_response',
            message: 'Google Sheets Apps Script mengembalikan halaman HTML/Error. Kemungkinan ada kesalahan runtime, izin akses belum dikonfigurasi, atau Spreadsheet ID tidak valid.',
            html: text
          });
        }
        return res.json({ status: 'success', data: text });
      }
    }
  } catch (error: any) {
    console.error('Sheets Proxy error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Error occurred in server-side Sheets proxy'
    });
  }
});

// Financial analysis using server-side Gemini
app.post('/api/analyze', async (req, res): Promise<any> => {
  try {
    const { transactions, budgetPlan, language = 'Indonesian' } = req.body;

    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Valid transactions data array is required.' });
    }

    // Short summary of financials to feed to the LLM to keep token count low and efficient
    const totalTransactions = transactions.length;
    const inflows = transactions.filter((t: any) => t.type === 'Inflow');
    const outflows = transactions.filter((t: any) => t.type === 'Outflow');

    const totalInflow = inflows.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
    const totalOutflow = outflows.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
    const netProfit = totalInflow - totalOutflow;

    // Project breakdown
    const projects = ['Melon', 'Cabe', 'Perikanan', 'Ternak'];
    const projectBreakdown = projects.map(proj => {
      const pTxs = transactions.filter((t: any) => t.project === proj);
      const pIn = pTxs.filter((t: any) => t.type === 'Inflow').reduce((sum, t) => sum + Number(t.amount), 0);
      const pOut = pTxs.filter((t: any) => t.type === 'Outflow').reduce((sum, t) => sum + Number(t.amount), 0);
      return {
        name: proj,
        inflow: pIn,
        outflow: pOut,
        net: pIn - pOut,
        recordedCount: pTxs.length
      };
    });

    const recentList = transactions.slice(0, 10).map((t: any) => 
      `- [${t.date}] Proyek: ${t.project} | Tipe: ${t.type} | Kategori: ${t.category} | Jumlah: Rp ${t.amount.toLocaleString('id-ID')} | Ket: ${t.description}`
    ).join('\n');

    const prompt = `Anda adalah konsultan keuangan agribisnis dan akuntan profesional untuk Greenhouse terintegrasi (greenhouse modern yang mengelola komoditas Melon, Cabe, Perikanan, dan Ternak).
Tolong buat laporan analisis keuangan mandiri yang cerdas, strategis, dan komprehensif berdasarkan data transaksi di bawah ini.

Ringkasan Keuangan Greenhouse Saat Ini:
- Total Transaksi Tercatat: ${totalTransactions}
- Total Pemasukan (Inflow / Pendapatan): Rp ${totalInflow.toLocaleString('id-ID')}
- Total Pengeluaran (Outflow / Pengoperasian): Rp ${totalOutflow.toLocaleString('id-ID')}
- Laba/Rugi Bersih (Net Profit): Rp ${netProfit.toLocaleString('id-ID')}

Detail Status Proyek Saat Ini:
${projectBreakdown.map(p => `- Proyek ${p.name}: Pendapatan = Rp ${p.inflow.toLocaleString('id-ID')}, Pengeluaran = Rp ${p.outflow.toLocaleString('id-ID')}, Laba Bersih = Rp ${p.net.toLocaleString('id-ID')} (Tercatat ${p.recordedCount} transaksi)`).join('\n')}

Daftar 10 Transaksi Terbaru untuk Referensi Tren Operasional:
${recentList}

---

Tolong susun laporan analisis Anda dengan tata bahasa Indonesia yang sangat profesional, elegan, sistematis, dan terperinci. Gunakan struktur Markdown yang kaya untuk memaksimalkan visual dengan aturan pemformatan khusus berikut:

1. **Gunakan Judul Utama (#) dan Subjudul (##) secara rapi.**
2. **Gunakan tag penanda status kapital di dalam judul atau paragraf** untuk menyoroti kondisi keuangan, seperti:
   - Tulis \`[SEHAT]\` untuk proyek atau kondisi surplus stabil.
   - Tulis \`[KURANG SEHAT]\` jika biaya membengkak atau rugi.
   - Tulis \`[OPTIMAL]\` untuk efisiensi tinggi.
   - Tulis \`[EVALUASI]\` untuk hal yang perlu perhatian segera.
3. **Sajikan Tabel Kinerja Finansial Proyek** secara rahasia dan formal dengan format markdown:
   | Nama Proyek | Total Pendapatan | Total Pengeluaran | Laba/Rugi Bersih | Evaluasi Status |
   | :--- | :--- | :--- | :--- | :--- |
   | Melon | Rp ... | Rp ... | Rp ... | [OPTIMAL] / [SEHAT] / [KURANG SEHAT] |
   dan seterusnya.
4. **Gunakan blockquote khusus (\`>\`) untuk menyoroti Peringatan atau Tips Finansial:**
   - Untuk evaluasi penting atau peringatan rugi: \`> ⚠️ **[PENTING] Evaluasi Kritis:** ...teks penjelasan...\`
   - Untuk ide penghematan biaya: \`> 💡 **[TIPS] Strategi Efisiensi Anggaran:** ...teks strategi...\`
   - Untuk usulan bisnis/ekspansi cerdas: \`> ✨ **[REKOMENDASI] Pengembangan Usaha:** ...teks ide pengembangan...\`

Struktur Laporan harus mencakup:
- **# Ringkasan Eksekutif Finansial Greenhouse** (Analisis komprehensif kesehatan kas umum, rasio pengeluaran dibanding total pemasukan).
- **# Analisis Komparatif Performa Proyek** (Sajikan tabel komparatif finansial proyek secara rapi dan dalam format Markdown, kemudian ulas proyek mana yang menjadi 'cash cow' penyumbang kas tertinggi dan proyek mana yang menyerap beban operasional berlebih).
- **# Tinjauan Efisiensi Biaya Operasional** (Analisis struktur pengeluaran tak menguntungkan serta rasio biaya operasional terhadap total pengeluaran).
- **# Peta Panduan Rekomendasi Finansial Strategis (Roadmap)** (Berikan minimal 3 poin saran konkret, aplikatif, dan realistis menggunakan pemformatan bullet-list tentang rekayasa pakan perikanan, rasio nutrisi melon, mitigasi harga cabe, atau pemanfaatan limbah ternak untuk mendongkrak keuntungan jangka panjang).

Tulis laporan yang kaya informasi, bernada optimis namun objektif, serta memberikan wawasan agribisnis mendalam yang bernilai tinggi bagi pemilik modal.`;

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error('API Analyze error:', error);
    res.status(500).json({ 
      error: 'Gagal melakukan analisis keuangan otomatis.', 
      details: error.message || 'Apakah GEMINI_API_KEY sudah diset di Secrets?' 
    });
  }
});

export default app;
