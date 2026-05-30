import React, { useState } from 'react';
import { Transaction } from '../types';
import { addActivityLog } from '../utils/activityLogger';
import { fetchWithTimeout } from '../utils/db';
import { BrainCircuit, RefreshCw, Send, AlertTriangle, Sparkles, CheckCircle, FileQuestion, Quote, ExternalLink } from 'lucide-react';

interface FinancialAnalysisProps {
  transactions: Transaction[];
}

export default function FinancialAnalysis({ transactions }: FinancialAnalysisProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [loadingStep, setLoadingStep] = useState<string>('');

  const loadingSteps = [
    'Mengumpulkan data keuangan dari database...',
    'Menghitung neraca laba-rugi kotor dan bersih...',
    'Mengevaluasi efisiensi biaya hidroponik Melon Jepang...',
    'Menganalisis margin keuntungan cabai rawit merah...',
    'Mengkaji rasio pakan protein tinggi perikanan Nila...',
    'Membandingkan pengeluaran operasional greenhouse...',
    'Merumuskan rekomendasi bisnis agribisnis strategis...'
  ];

  const generateAnalysis = async () => {
    if (transactions.length === 0) {
      setError('Belum ada transaksi terdaftar yang bisa dianalisis.');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysis('');
    
    // Cycle through loading steps to provide a premium interactive feel
    let stepIndex = 0;
    setLoadingStep(loadingSteps[0]);
    const interval = setInterval(() => {
      stepIndex = (stepIndex + 1) % loadingSteps.length;
      setLoadingStep(loadingSteps[stepIndex]);
    }, 2500);

    try {
      addActivityLog('DAPATKAN_ANALISIS_AI', 'Meminta asisten analitik Gemini AI untuk menyusun analisis keuangan cerdas berdasarkan data transaksi');
      const response = await fetchWithTimeout('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions })
      }, 30000);

      clearInterval(interval);

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = 'Gagal memanggil asisten analitik API.';
        try {
          const errJson = JSON.parse(text);
          errorMessage = errJson.error || errJson.details || errorMessage;
        } catch (e) {
          if (text.includes('GEMINI_API_KEY') || text.includes('not set') || text.includes('Secrets')) {
            errorMessage = 'API Key Gemini (GEMINI_API_KEY) belum dikonfigurasi. Silakan masuk ke panel "Settings" > "Secrets" di AI Studio, tambahkan variabel "GEMINI_API_KEY" dengan value kunci API Gemini Anda.';
          } else {
            errorMessage = `Terjadi kesalahan komunikasi dengan server (Status: ${response.status}). Pastikan Anda telah mengonfigurasi Secrets "GEMINI_API_KEY" di panel Settings > Secrets AI Studio.`;
          }
        }
        throw new Error(errorMessage);
      }

      const text = await response.text();
      let resJson;
      try {
        resJson = JSON.parse(text);
      } catch (e) {
        throw new Error('Format respon analitik dari server tidak valid (bukan JSON).');
      }
      
      if (resJson && resJson.analysis) {
        setAnalysis(resJson.analysis);
      } else {
        throw new Error('Format respon analitik AI kosong atau tidak sesuai.');
      }
    } catch (err: any) {
      clearInterval(interval);
      console.error('Analysis error:', err);
      setError(err.message || 'Koneksi terputus. Silakan coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Simple Markdown to HTML parser to keep it extremely stable on React 19 without third-party module installation errors
  const parseMarkdown = (md: string) => {
    if (!md) return '';
    
    // Safety escape
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^### (.*?)$/gm, '<h4 class="text-sm font-semibold text-slate-800 font-display mt-4 mb-2">$1</h4>');
    html = html.replace(/^## (.*?)$/gm, '<h3 class="text-base font-bold text-slate-800 font-display mt-5 mb-2.5">$1</h3>');
    html = html.replace(/^# (.*?)$/gm, '<h2 class="text-lg font-extra-bold text-slate-900 font-display mt-6 mb-3">$1</h2>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
    
    // Lists
    html = html.replace(/^- (.*?)$/gm, '<li class="ml-4 list-disc pl-1 py-0.5">$1</li>');

    // Paragraph wrappers (split double newlines)
    const blocks = html.split('\n');
    const parsedBlocks = blocks.map(block => {
      block = block.trim();
      if (!block) return '';
      if (block.startsWith('<h') || block.startsWith('<li')) return block;
      return `<p class="leading-relaxed mb-3 text-slate-600">${block}</p>`;
    });

    return parsedBlocks.join('\n');
  };

  return (
    <div id="financial-analysis-view" className="space-y-6 max-w-4xl mx-auto">
      
      {/* Introduction Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start gap-4">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
          <BrainCircuit className="w-6 h-6" />
        </div>
        <div className="space-y-3 flex-1">
          <div>
            <h2 className="font-display font-bold text-slate-800 text-base flex items-center gap-2">
              Asisten Analisis Keuangan Cerdas (Gemini AI)
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-800">
                PRO-FEASIBILITY
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Teknologi AI Gemini menilik efisiensi input pakan, kelayakan nutrisi AB-Mix Melon, rasio promosi Cabe, 
              dan memberikan strategi optimalisasi keuntungan untuk Greenhouse Anda berdasarkan seluruh data transaksi saat ini.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1.5">
            <button
              onClick={generateAnalysis}
              disabled={loading || transactions.length === 0}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              )}
              {loading ? 'Menyusun Analisis...' : 'Minta Analisis Keuangan AI'}
            </button>
          </div>
        </div>
      </div>

      {/* Loading animation state */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
            <Sparkles className="w-5 h-5 text-indigo-500 absolute top-3.5 left-3.5 animate-pulse" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h4 className="font-display font-bold text-slate-800 text-sm">Gemini sedang bekerja...</h4>
            <p className="text-xs text-indigo-600 font-medium animate-pulse">{loadingStep}</p>
          </div>
          <p className="text-[10px] text-slate-400 italic">Proses ini memakan waktu sekitar 5 - 10 detik.</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-rose-50/50 border border-rose-100 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-rose-800 font-bold font-display text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            Analis AI Gagal Dibuat
          </div>
          <p className="text-xs text-rose-700 leading-relaxed font-medium">
            {error}
          </p>
          
          <div className="bg-white/70 p-4 rounded-xl border border-rose-100/60 space-y-3">
            <h5 className="text-[11px] font-bold text-slate-700">Panduan Mengatasi Masalah (Troubleshooting):</h5>
            <ol className="text-[10px] text-slate-600 space-y-1.5 list-decimal pl-4 leading-relaxed">
              <li>
                <strong>Verifikasi Secrets:</strong> Pastikan Anda telah membuat secret bernama <code className="bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-800">GEMINI_API_KEY</code> pada panel <strong>Settings &gt; Secrets</strong> di AI Studio Anda.
              </li>
              <li>
                <strong>Masalah Iframe / Browser Cookie:</strong> Jika Anda membuka aplikasi di panel preview AI Studio, browser Anda mungkin memblokir cookie keamanan sistem Sandbox.
              </li>
            </ol>
            
            <div className="pt-1 flex flex-wrap gap-2">
              <a 
                href="/api/debug-key" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 hover:border-indigo-300 px-2.5 py-1.5 rounded-lg transition-colors"
                id="debug-btn-link"
              >
                <ExternalLink className="w-3 h-3" />
                Lakukan Tes Koneksi & Cookie (Buka Tab Baru)
              </a>
              <span className="text-[9px] text-slate-400 self-center">
                *Klik tautan di atas untuk mengaktifkan izin cookie & menguji format API key.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Structured markdown output display */}
      {analysis && !loading && (
        <div className="bg-white rounded-2xl border border-indigo-100 p-8 shadow-xs space-y-6 relative overflow-hidden">
          
          {/* Subtle graphical watermark decoration */}
          <div className="absolute right-4 top-4 text-indigo-50/40 opacity-40">
            <BrainCircuit className="w-24 h-24" />
          </div>

          <div className="flex items-center gap-2 border-b border-indigo-50 pb-4 relative z-10">
            <Sparkles className="w-5 h-5 text-indigo-500 shrink-0" />
            <div>
              <h3 className="font-display font-bold text-slate-800 text-sm font-semibold">Laporan Rekomendasi Finansial Greenhouse</h3>
              <p className="text-[10px] text-slate-400 font-mono">Dianalisis secara real-time pada: {new Date().toLocaleDateString('id-ID')}</p>
            </div>
          </div>

          {/* Render MD */}
          <div 
            className="text-xs text-slate-600 leading-relaxed space-y-3 relative z-10 md-analysis-content"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(analysis) }}
          />

          {/* Signature info footer inside results card */}
          <div className="flex items-center gap-2.5 bg-indigo-55/40 p-4 rounded-xl border border-indigo-100/30 text-[10px] text-indigo-800 mt-6 relative z-10 font-medium">
            <Quote className="w-4 h-4 text-indigo-400 rotate-180 shrink-0" />
            <span>
              Laporan penasihat AI ini dibentuk berdasarkan tren matematika arus kas riil saat ini. Gunakan hasil tinjauan operasional 
              ini mendampingi pertimbangan agronomis dan pergerakan harga pasar sayur/ternak riil setempat.
            </span>
          </div>
        </div>
      )}

      {/* Default placeholder state when empty */}
      {!analysis && !loading && !error && (
        <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 py-16 text-center space-y-4">
          <div className="flex justify-center">
            <BrainCircuit className="w-10 h-10 text-slate-300" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="font-display font-bold text-slate-700 text-sm">Belum Ada Analisis Terkini</h4>
            <p className="text-xs text-slate-400">
              Silakan klik tombol <strong>"Minta Analisis Keuangan AI"</strong> di atas untuk memperoleh audit kelayakan dan strategi pembagian laba harian.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
