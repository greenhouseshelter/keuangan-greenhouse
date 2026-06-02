import React, { useState } from 'react';
import { Role, DatabaseConfig } from '../types';
import { getDatabaseConfig } from '../utils/db';
import { LogOut, Cloud, CloudOff, FileSpreadsheet, Sprout, SlidersHorizontal, Pin, PinOff, Sun, Moon, Palette, Type } from 'lucide-react';

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
  sidebarPinned?: boolean;
  onToggleSidebar?: () => void;
  themeMode: 'light' | 'dark';
  selectedTemplate: 'emerald' | 'gold' | 'purple';
  onThemeModeChange: (mode: 'light' | 'dark') => void;
  onTemplateChange: (template: 'emerald' | 'gold' | 'purple') => void;
  layoutTemplate: 'sidebar' | 'topnav' | 'compact';
  onLayoutTemplateChange: (layout: 'sidebar' | 'topnav' | 'compact') => void;
  fontFamilyStyle: 'sans' | 'serif' | 'mono';
  onFontStyleChange: (font: 'sans' | 'serif' | 'mono') => void;
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
  connectionStatus = 'offline',
  sidebarPinned = true,
  onToggleSidebar,
  themeMode,
  selectedTemplate,
  onThemeModeChange,
  onTemplateChange,
  layoutTemplate,
  onLayoutTemplateChange,
  fontFamilyStyle,
  onFontStyleChange
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
          
          {layoutTemplate === 'sidebar' && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="hidden md:flex items-center gap-1.5 ml-4 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:text-slate-800 text-slate-500 transition-all cursor-pointer font-bold text-[10px] uppercase tracking-wider shadow-3xs"
              title={sidebarPinned ? "Aktifkan Autohide Navigasi" : "Sematkan Menu Navigasi"}
            >
              {sidebarPinned ? (
                <>
                  <PinOff className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
                  <span className="text-slate-600 font-semibold hover:text-slate-900">Autohide</span>
                </>
              ) : (
                <>
                  <Pin className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                  <span className="text-emerald-750 font-bold">Tersemat</span>
                </>
              )}
            </button>
          )}
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

                      {/* Spacing Row */}
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

                      {/* Pilihan Gaya Font */}
                      <div className="space-y-1.5">
                        <label className="text-slate-500 font-bold block uppercase text-[9px] tracking-wide flex items-center gap-1.5">
                          <Type className="w-3 h-3 text-emerald-600" />
                          <span>Pilihan Gaya Font</span>
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {([ 'sans', 'serif', 'mono' ] as const).map((font) => (
                            <button
                              key={font}
                              type="button"
                              onClick={() => onFontStyleChange(font)}
                              className={`py-1.5 px-0.5 rounded-lg border text-center font-bold text-[10px] transition-all cursor-pointer flex flex-col items-center gap-1 justify-center ${
                                fontFamilyStyle === font
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <span className="text-[9.5px] leading-tight font-bold shrink-0">
                                {font === 'sans' && 'Modern Sans'}
                                {font === 'serif' && 'Serif Klasik'}
                                {font === 'mono' && 'Tech Mono'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Template Warna Utama */}
                      <div className="space-y-1.5">
                        <label className="text-slate-500 font-bold block uppercase text-[9px] tracking-wide flex items-center gap-1.5">
                          <Palette className="w-3 h-3 text-emerald-600" />
                          <span>Template Warna Utama</span>
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {([ 'emerald', 'gold', 'purple' ] as const).map((tmpl) => (
                            <button
                              key={tmpl}
                              type="button"
                              onClick={() => onTemplateChange(tmpl)}
                              className={`py-1.5 px-0.5 rounded-lg border text-center font-bold text-[10px] transition-all cursor-pointer flex flex-col items-center gap-1 justify-center ${
                                selectedTemplate === tmpl
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${
                                tmpl === 'emerald' ? 'bg-emerald-500' : tmpl === 'gold' ? 'bg-amber-500' : 'bg-purple-500'
                              }`} />
                              <span className="text-[9px] leading-tight shrink-0">
                                {tmpl === 'emerald' && 'Emerald'}
                                {tmpl === 'gold' && 'Luxury Gold'}
                                {tmpl === 'purple' && 'Amethyst'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Gaya Layout Aplikasi */}
                      <div className="space-y-1.5">
                        <label className="text-slate-500 font-bold block uppercase text-[9px] tracking-wide flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3 h-3 text-emerald-600" />
                          <span>Gaya Layout Utama</span>
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {([ 'sidebar', 'topnav', 'compact' ] as const).map((lay) => (
                            <button
                              key={lay}
                              type="button"
                              onClick={() => onLayoutTemplateChange(lay)}
                              className={`py-2 px-0.5 rounded-lg border text-center font-bold text-[10px] transition-all cursor-pointer flex flex-col items-center gap-1 justify-center ${
                                layoutTemplate === lay
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <span className="text-[9.5px] leading-tight font-bold shrink-0">
                                {lay === 'sidebar' && 'Panel Klasik'}
                                {lay === 'topnav' && 'Bento Eksekutif'}
                                {lay === 'compact' && 'Konsol Sederhana'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Mode Tampilan (Dark Mode) */}
                      <div className="space-y-1.5">
                        <label className="text-slate-500 font-bold block uppercase text-[9px] tracking-wide flex items-center gap-1.5">
                          {themeMode === 'light' ? <Sun className="w-3 h-3 text-amber-500" /> : <Moon className="w-3 h-3 text-indigo-400" />}
                          <span>Mode Tampilan</span>
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {([ 'light', 'dark' ] as const).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => onThemeModeChange(mode)}
                              className={`py-1.5 px-2 rounded-lg border text-center font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1.5 justify-center ${
                                themeMode === mode
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {mode === 'light' ? (
                                <>
                                  <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  <span>Mode Terang</span>
                                </>
                              ) : (
                                <>
                                  <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  <span>Mode Gelap</span>
                                </>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                      <span>*Tersimpan otomatis</span>
                      {(textFontSize !== 'normal' || textSpacing !== 'normal' || selectedTemplate !== 'emerald' || themeMode !== 'light' || layoutTemplate !== 'sidebar' || fontFamilyStyle !== 'sans') && (
                        <button 
                          onClick={() => {
                            onFontSizeChange('normal');
                            onSpacingChange('normal');
                            onTemplateChange('emerald');
                            onThemeModeChange('light');
                            onLayoutTemplateChange('sidebar');
                            onFontStyleChange('sans');
                          }}
                          className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer"
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
