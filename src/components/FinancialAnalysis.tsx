import React, { useState } from 'react';
import { Transaction } from '../types';
import { addActivityLog } from '../utils/activityLogger';
import { fetchWithTimeout } from '../utils/db';
import { 
  BrainCircuit, RefreshCw, AlertTriangle, Sparkles, Quote, 
  ExternalLink, TrendingUp, TrendingDown, Award, DollarSign, ArrowUpRight, CheckCircle2
} from 'lucide-react';

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
    }, 2000);

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

  // State-machine-based Markdown to HTML parser for premium formatting
  const parseMarkdown = (md: string) => {
    if (!md) return '';

    const lines = md.split('\n');
    let html = '';
    
    let inList = false;
    let inBlockquote = false;
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];
    let hasSeparator = false;

    const closeList = () => {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
    };

    const closeBlockquote = () => {
      if (inBlockquote) {
        html += '</div>';
        inBlockquote = false;
      }
    };

    const closeTable = () => {
      if (inTable) {
        let tableHtml = '<div class="overflow-x-auto my-5 border border-slate-200/80 rounded-xl shadow-xs"><table class="min-w-full divide-y divide-slate-200 text-xs">';
        if (tableHeaders.length > 0) {
          tableHtml += '<thead class="bg-slate-50">';
          tableHtml += '<tr>';
          tableHeaders.forEach(h => {
            tableHtml += `<th scope="col" class="px-4 py-3 text-left font-bold text-slate-700 tracking-wider font-display">${h}</th>`;
          });
          tableHtml += '</tr>';
          tableHtml += '</thead>';
        }
        tableHtml += '<tbody class="bg-white divide-y divide-slate-100">';
        tableRows.forEach((row, idx) => {
          const rowBg = idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white';
          tableHtml += `<tr class="${rowBg} hover:bg-slate-50/80 transition-colors">`;
          row.forEach(cell => {
            tableHtml += `<td class="px-4 py-2.5 text-slate-600 font-medium">${cell}</td>`;
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table></div>';
        
        html += tableHtml;
        inTable = false;
        tableHeaders = [];
        tableRows = [];
        hasSeparator = false;
      }
    };

    const inlineParse = (text: string): string => {
      let result = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Bold (**text**)
      result = result.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
      
      // Italic (*text* or _text_)
      result = result.replace(/\*(.*?)\*/g, '<em class="italic text-slate-800">$1</em>');
      result = result.replace(/_(.*?)_/g, '<em class="italic text-slate-800">$1</em>');

      // Code (`code`)
      result = result.replace(/`(.*?)`/g, '<code class="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-indigo-700 text-[11px] font-semibold">$1</code>');

      // Status Badges (Replacing tags with stunning tailwind equivalents)
      result = result.replace(/\[SEHAT\]/gi, '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 font-display"><span class="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1 animate-pulse"></span>SEHAT</span>');
      result = result.replace(/\[KURANG SEHAT\]/gi, '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 font-display"><span class="w-1.5 h-1.5 bg-rose-500 rounded-full mr-1 animate-pulse"></span>KURANG SEHAT</span>');
      result = result.replace(/\[TIPS\]/gi, '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 font-display">💡 TIPS</span>');
      result = result.replace(/\[REKOMENDASI\]/gi, '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 font-display">✨ REKOMENDASI</span>');
      result = result.replace(/\[PENTING\]/gi, '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-150 text-amber-900 border border-amber-300 font-display">⚠️ PENTING</span>');
      result = result.replace(/\[OPTIMAL\]/gi, '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900 font-display">🚀 OPTIMAL</span>');
      result = result.replace(/\[EVALUASI\]/gi, '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 font-display">🔍 EVALUASI</span>');

      return result;
    };

    for (let i = 0; i < lines.length; i++) {
      const origLine = lines[i];
      const trimmed = origLine.trim();

      // Empty Lines
      if (!trimmed) {
        continue;
      }

      // Horizontal Separator Rule
      if (trimmed === '---') {
        closeList();
        closeBlockquote();
        closeTable();
        html += '<hr class="my-6 border-t border-slate-100" />';
        continue;
      }

      // Headings
      const headingMatch = origLine.match(/^(#{1,4})\s+(.*)$/);
      if (headingMatch) {
        closeList();
        closeBlockquote();
        closeTable();
        const level = headingMatch[1].length;
        const content = inlineParse(headingMatch[2]);
        if (level === 1) {
          html += `<h2 class="text-sm font-extrabold text-slate-900 font-display mt-7 mb-3.5 border-b border-indigo-50/60 pb-1.5 flex items-center gap-1.5 tracking-tight uppercase">${content}</h2>`;
        } else if (level === 2) {
          html += `<h3 class="text-xs font-bold text-slate-800 font-display mt-6 mb-2.5 flex items-center gap-1.5 border-l-2 border-indigo-500 pl-2">${content}</h3>`;
        } else {
          html += `<h4 class="text-[11px] font-semibold text-slate-750 font-display mt-5 mb-2 flex items-center gap-1 font-mono">${content}</h4>`;
        }
        continue;
      }

      // Tables (| Col | Col |)
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        closeList();
        closeBlockquote();
        
        const parts = trimmed.split('|').map(p => p.trim()).filter((p, idx, arr) => idx > 0 && idx < arr.length - 1);
        const isSeparator = parts.every(p => p.replace(/[\s-:]/g, '') === '');
        
        if (!inTable) {
          inTable = true;
          tableHeaders = parts.map(p => inlineParse(p));
        } else if (isSeparator) {
          hasSeparator = true;
        } else {
          tableRows.push(parts.map(p => inlineParse(p)));
        }
        continue;
      } else {
        closeTable();
      }

      // Bullet Lists
      const listMatch = trimmed.match(/^[-*]\s+(.*)$/);
      if (listMatch) {
        closeBlockquote();
        const content = inlineParse(listMatch[1]);
        if (!inList) {
          inList = true;
          html += '<ul class="space-y-1.5 my-3.5 pl-1">';
        }
        html += `<li class="flex items-start gap-2.5 text-slate-600 font-medium text-[11px]"><span class="text-indigo-400 mt-1 select-none text-[8px] shrink-0">❖</span><span class="flex-1">${content}</span></li>`;
        continue;
      } else {
        closeList();
      }

      // Blockquotes (>)
      if (trimmed.startsWith('&gt;') || trimmed.startsWith('>')) {
        const quoteText = trimmed.startsWith('&gt;') ? trimmed.substring(4).trim() : trimmed.substring(1).trim();
        const content = inlineParse(quoteText);
        if (!inBlockquote) {
          inBlockquote = true;
          
          let quoteBg = 'bg-slate-50 border-l-4 border-slate-350 p-4 rounded-r-xl';
          if (content.toLowerCase().includes('peringatan') || content.includes('⚠️')) {
            quoteBg = 'bg-rose-50/50 border-l-4 border-rose-500 text-rose-950 p-4 rounded-r-xl border border-rose-100/30';
          } else if (content.toLowerCase().includes('tips') || content.includes('💡')) {
            quoteBg = 'bg-amber-50/40 border-l-4 border-amber-500 text-amber-950 p-4 rounded-r-xl border border-amber-100/30';
          } else if (content.toLowerCase().includes('rekomendasi') || content.includes('✨') || content.includes('🚀')) {
            quoteBg = 'bg-indigo-50/40 border-l-4 border-indigo-500 text-indigo-950 p-4 rounded-r-xl border border-indigo-100/30';
          } else if (content.toLowerCase().includes('sehat') || content.includes('✅') || content.includes('👍')) {
            quoteBg = 'bg-emerald-50/40 border-l-4 border-emerald-500 text-emerald-950 p-4 rounded-r-xl border border-emerald-100/30';
          }
          
          html += `<div class="my-4 ${quoteBg} space-y-1 text-[11px]">`;
        }
        html += `<p class="leading-relaxed font-medium">${content}</p>`;
        continue;
      } else {
        closeBlockquote();
      }

      // Ordinary paragraphs
      const content = inlineParse(trimmed);
      html += `<p class="leading-relaxed mb-3 text-slate-600 font-medium text-[11.5px]">${content}</p>`;
    }

    closeList();
    closeBlockquote();
    closeTable();

    return html;
  };

  // Instantly Calculate client-side health metrics for bento-grid display
  const totalInflow = transactions
    .filter(t => t.type === 'Inflow')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalOutflow = transactions
    .filter(t => t.type === 'Outflow')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const netEarnings = totalInflow - totalOutflow;

  // Compute best project metrics
  const projectBalances: Record<string, number> = {};
  transactions.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (!projectBalances[t.project]) projectBalances[t.project] = 0;
    projectBalances[t.project] += t.type === 'Inflow' ? amt : -amt;
  });

  let bestProject = '-';
  let bestProjectProfit = -Infinity;
  Object.entries(projectBalances).forEach(([proj, bal]) => {
    if (bal > bestProjectProfit) {
      bestProjectProfit = bal;
      bestProject = proj;
    }
  });
  if (bestProjectProfit <= 0) {
    bestProject = '-';
    bestProjectProfit = 0;
  }

  return (
    <div id="financial-analysis-view" className="space-y-6 max-w-4xl mx-auto">
      
      {/* Introduction Banner Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        {/* Abstract vector circles background */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none bg-radial-gradient from-emerald-500 to-transparent"></div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-5 justify-between relative z-10">
          <div className="space-y-2 max-w-xl">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
              ★ SYSTEM AUDIT AGRIBISNIS
            </span>
            <h2 className="font-display font-extrabold text-slate-100 text-lg md:text-xl tracking-tight leading-tight">
              Asisten Analitik Finansial Terintegrasi
            </h2>
            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
              Sistem AI asisten mandiri yang meneliti efisiensi operasional harian Greenhouse terpadu. Memperbandingkan margin keuntungan komoditas Melon, Cabe, Perikanan, dan Ternak secara komprehensif.
            </p>
          </div>

          <button
            onClick={generateAnalysis}
            disabled={loading || transactions.length === 0}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg hover:shadow-emerald-500/10 transition-all disabled:opacity-50 active:scale-95 shrink-0"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-emerald-950" />
            )}
            {loading ? 'Menyusun Analisis...' : 'Mulai Analisis Cerdas AI'}
          </button>
        </div>
      </div>

      {/* Real-time Dashboard Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Omzet */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 shadow-xs flex items-center gap-3.5 hover:border-emerald-300 transition-colors">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase font-display">Omzet Kas (Inflow)</p>
            <h3 className="text-sm font-extrabold text-slate-900 font-display tracking-tight mt-0.5">
              Rp {totalInflow.toLocaleString('id-ID')}
            </h3>
            <p className="text-[9px] text-slate-400 font-semibold font-mono mt-0.5">
              {transactions.filter(t => t.type === 'Inflow').length} transaksi tercatat
            </p>
          </div>
        </div>

        {/* Card 2: Pengeluaran */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 shadow-xs flex items-center gap-3.5 hover:border-rose-300 transition-colors">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase font-display">Beban Kas (Outflow)</p>
            <h3 className="text-sm font-extrabold text-slate-900 font-display tracking-tight mt-0.5">
              Rp {totalOutflow.toLocaleString('id-ID')}
            </h3>
            <p className="text-[9px] text-slate-400 font-semibold font-mono mt-0.5">
              {transactions.filter(t => t.type === 'Outflow').length} transaksi tercatat
            </p>
          </div>
        </div>

        {/* Card 3: Surplus Laba Bersih */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 shadow-xs flex items-center gap-3.5 hover:border-indigo-300 transition-colors">
          <div className={`p-2.5 rounded-lg ${netEarnings >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}>
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase font-display">Sisa Laba Bersih</p>
            <h3 className={`text-sm font-extrabold font-display tracking-tight mt-0.5 ${netEarnings >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
              Rp {netEarnings.toLocaleString('id-ID')}
            </h3>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold font-mono mt-0.5 ${netEarnings >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {netEarnings >= 0 ? 'SURPLUS ✅' : 'DEFISIT ⚠️'}
            </span>
          </div>
        </div>

        {/* Card 4: Top Project */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 shadow-xs flex items-center gap-3.5 hover:border-amber-300 transition-colors">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase font-display">Cash Cow Terkuat</p>
            <h3 className="text-sm font-extrabold text-slate-900 font-display tracking-tight mt-0.5">
              Proyek {bestProject}
            </h3>
            <p className="text-[9px] text-emerald-600 font-semibold font-mono mt-0.5 flex items-center gap-0.5">
              {bestProjectProfit > 0 ? (
                <>
                  <ArrowUpRight className="w-3 h-3 shrink-0" />
                  +Rp {bestProjectProfit.toLocaleString('id-ID')}
                </>
              ) : (
                'Belum ada keuntungan'
              )}
            </p>
          </div>
        </div>

      </div>

      {/* Loading animation state */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-xs flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-4 border-indigo-50 border-t-indigo-600 animate-spin"></div>
            <Sparkles className="w-6 h-6 text-indigo-500 absolute top-4 left-4 animate-pulse" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h4 className="font-display font-extrabold text-slate-800 text-sm">Grup Gemini AI Sedang Menganalisis...</h4>
            <p className="text-xs text-indigo-600 font-bold animate-pulse font-mono">{loadingStep}</p>
          </div>
          <p className="text-[10px] text-slate-400 italic">Hampir selesai. Penyusunan strategi memakan waktu kurang dari 8 detik.</p>
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
            <h5 className="text-[11px] font-bold text-slate-700 font-display">Panduan Mengatasi Masalah (Troubleshooting):</h5>
            <ol className="text-[10px] text-slate-600 space-y-1.5 list-decimal pl-4 leading-relaxed font-semibold">
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
                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 hover:border-indigo-300 px-3 py-2 rounded-lg transition-colors"
                id="debug-btn-link"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Lakukan Tes Koneksi & Cookie (Buka Tab Baru)
              </a>
              <span className="text-[9px] text-slate-400 self-center">
                *Klik tautan di atas untuk mengaktifkan izin cookie & menguji format API key.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Structured formatted report output display */}
      {analysis && !loading && (
        <div className="bg-white rounded-2xl border border-indigo-100/70 p-8 shadow-xs space-y-6 relative overflow-hidden">
          
          {/* Subtle graphical background decorations */}
          <div className="absolute -right-6 -top-6 text-indigo-50/20 opacity-30 select-none pointer-events-none">
            <BrainCircuit className="w-40 h-40" />
          </div>

          <div className="flex items-center justify-between border-b border-indigo-50/85 pb-4.5 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-slate-900 text-sm tracking-tight leading-none uppercase">
                  Laporan Audit & Analisis Keuangan Greenhouse
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-1">Dihasilkan oleh model asisten Gemini pada: {new Date().toLocaleDateString('id-ID')}</p>
              </div>
            </div>
            
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100/60 font-mono uppercase">
              REKOMENDASI AKTIF
            </span>
          </div>

          {/* Render parsed formatted HTML blocks */}
          <div 
            className="text-xs text-slate-600 leading-relaxed space-y-4 relative z-10 md-analysis-content font-medium"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(analysis) }}
          />

          {/* Professional standard disclaimer badge */}
          <div className="flex items-start gap-3 bg-slate-50/80 p-4.5 rounded-xl border border-slate-200/50 text-[10px] text-slate-500 leading-normal mt-7 relative z-10 font-bold">
            <Quote className="w-4 h-4 text-slate-300 rotate-180 shrink-0 mt-0.5" />
            <span className="font-medium italic text-slate-500">
              Catatan Penting: Laporan analitik keuangan asisten AI ini dibentuk berdasarkan pengolahan data aritmatika dari riwayat catatan transaksi kas yang diinput. Seluruh rekomendasi strategi budidaya sebaiknya dikonsultasikan kembali sesuai dengan kondisi cuaca, harga herbisida/pupuk, inflasi pasar lokal, serta standar agronomi terkini.
            </span>
          </div>
        </div>
      )}

      {/* Default placeholder state when empty */}
      {!analysis && !loading && !error && (
        <div className="bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 py-16 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3.5 bg-slate-100/80 text-slate-400 rounded-2xl">
              <BrainCircuit className="w-10 h-10" />
            </div>
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h4 className="font-display font-bold text-slate-700 text-sm">Belum Ada Hasil Audit Keuangan</h4>
            <p className="text-xs text-slate-400 px-4 leading-normal font-medium">
              Silakan tekan tombol <strong className="text-slate-600">"Mulai Analisis Cerdas AI"</strong> di atas. Sistem akan mengirim seluruh catatan kas riil ke model Gemini AI untuk audit instan.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
