import React, { useState } from 'react';
import { Role, DatabaseConfig } from '../types';
import { getDatabaseConfig } from '../utils/db';
import { LogOut, Cloud, CloudOff, FileSpreadsheet, Sprout, SlidersHorizontal } from 'lucide-react';

interface NavbarProps {
  currentRole: Role;
  currentUser: string;
  onLogout: () => void;
  config: DatabaseConfig;
  textFontSize: 'normal' | 'large' | 'xl';
  textSpacing: 'normal' | 'narrow' | 'compact';
  onFontSizeChange: (size: 'normal' | 'large' | 'xl') => void;
  onSpacingChange: (spacing: 'normal' | 'narrow' | 'compact') => void;
  connectionStatus?: 'online' | 'offline' | 'checking';
}

export default function Navbar({ 
  currentRole, 
  currentUser, 
  onLogout, 
  config, 
  textFontSize,
  textSpacing,
  onFontSizeChange,
  onSpacingChange,
  connectionStatus = 'offline'
}: NavbarProps) {
  const [displayMenuOpen, setDisplayMenuOpen] = useState(false);
  
  const getRoleStyle = (role: Role) => {
    switch (role) {
      case 'Admin':
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
      case 'Pengelola':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
      case 'Finance':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'Accounting':
        return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      default:
        return 'bg-slate-500/10 text-slate-700 border-slate-500/20';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 py-3.5 px-6 shadow-xs sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo and title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-xs shrink-0">
            <Sprout className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-sm sm:text-base text-slate-900 tracking-tight leading-none">
              Keuangan Greenhouse
            </h1>
            <p className="text-[10px] text-slate-500 font-medium hidden sm:block mt-0.5">Pencatatan Finansial Greenhouse</p>
          </div>
        </div>

        {/* Right side information panel */}
        <div className="flex items-center gap-3">
          
          {/* Cloud Sync Status info */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-[10px] sm:text-xs font-bold"
            title="Database Cloud Google Sheets Aktif & Sinkron!"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="hidden md:inline">Google Sheets Terhubung</span>
          </div>

          {/* User information display */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200/60 font-medium">
            <div className="text-right hidden sm:block leading-none">
              <span className="text-xs text-slate-800 font-bold block capitalize">{currentUser}</span>
              <span className="text-[9px] text-slate-400 font-mono block mt-0.5 font-bold uppercase tracking-wider">{currentRole} ACCESS</span>
            </div>

            {/* Badge */}
            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${getRoleStyle(currentRole)} sm:hidden uppercase`}>
              {currentRole}
            </span>

            {/* Penyesuaian Tampilan (Font & Jarak) Popover */}
            <div className="relative">
              <button
                onClick={() => setDisplayMenuOpen(!displayMenuOpen)}
                className={`p-2 rounded-xl border transition-all flex items-center justify-center relative hover:bg-slate-50 cursor-pointer ${
                  displayMenuOpen 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                    : 'text-slate-400 border-slate-200 hover:text-slate-700'
                }`}
                title="Sesuaikan Tampilan (Font & Jarak)"
              >
                <SlidersHorizontal className="w-4 h-4 shrink-0" />
                {(textFontSize !== 'normal' || textSpacing !== 'normal') && (
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse absolute -top-0.5 -right-0.5" />
                )}
              </button>

              {/* Popover Dropdown */}
              {displayMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setDisplayMenuOpen(false)}
                  />
                  
                  <div className="absolute right-0 mt-2.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                    <h3 className="font-display font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-3 leading-none flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                      Pengaturan Tampilan
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Font Size Row */}
                      <div className="space-y-1.5">
                        <label className="text-slate-500 font-bold block uppercase text-[9px] tracking-wide">Ukuran Huruf</label>
                        <div className="grid grid-cols-3 gap-1">
                          {([ 'normal', 'large', 'xl' ] as const).map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => onFontSizeChange(size)}
                              className={`py-1.5 px-1 rounded-lg border text-center font-bold text-[10px] transition-all cursor-pointer ${
                                textFontSize === size
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {size === 'normal' && 'Biasa'}
                              {size === 'large' && 'Besar'}
                              {size === 'xl' && 'Sangat Besar'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Spacing Spacing Row */}
                      <div className="space-y-1.5">
                        <label className="text-slate-500 font-bold block uppercase text-[9px] tracking-wide">Kerapatan Jarak</label>
                        <div className="grid grid-cols-3 gap-1">
                          {([ 'normal', 'narrow', 'compact' ] as const).map((spacing) => (
                            <button
                              key={spacing}
                              type="button"
                              onClick={() => onSpacingChange(spacing)}
                              className={`py-1.5 px-1 rounded-lg border text-center font-bold text-[10px] transition-all cursor-pointer ${
                                textSpacing === spacing
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {spacing === 'normal' && 'Biasa'}
                              {spacing === 'narrow' && 'Rapat'}
                              {spacing === 'compact' && 'Sangat Rapat'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                      <span>*Tersimpan otomatis</span>
                      {(textFontSize !== 'normal' || textSpacing !== 'normal') && (
                        <button 
                          onClick={() => {
                            onFontSizeChange('normal');
                            onSpacingChange('normal');
                          }}
                          className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline"
                        >
                          Reset Default
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sign Out Trigger Button */}
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-xl border border-slate-150 transition-colors"
              title="Keluar Akun"
            >
              <LogOut className="w-4 h-4 shrink-0" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
