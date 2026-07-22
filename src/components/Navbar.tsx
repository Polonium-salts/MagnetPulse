import React from 'react';
import { ActiveTab } from '../types';
import { Magnet, FileSearch, Zap, Layers, Code, Server, Download } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}


export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-xl border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('parser')}>
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-white group-hover:border-zinc-500 transition-colors shadow-inner">
            <Magnet className="w-4 h-4 text-zinc-100 rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif-display text-xl tracking-wide text-white italic">
                MagnetPulse
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-mono tracking-widest uppercase bg-zinc-900 text-zinc-400 border border-zinc-800 rounded">
                API v1.0
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 hidden sm:block tracking-tight">Torrent 种子转 Magnet 极速解析引擎</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#0a0a0a] p-1 rounded-xl border border-zinc-800/80">
          <button
            onClick={() => setActiveTab('parser')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'parser'
                ? 'bg-zinc-100 text-black shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80'
            }`}
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span>种子解析</span>
          </button>

          <button
            onClick={() => setActiveTab('enhancer')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'enhancer'
                ? 'bg-zinc-100 text-black shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">磁力优化</span>
            <span className="sm:hidden">加速</span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'batch'
                ? 'bg-zinc-100 text-black shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">批量转换</span>
            <span className="sm:hidden">批量</span>
          </button>

          <button
            onClick={() => setActiveTab('direct-link')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'direct-link'
                ? 'bg-zinc-100 text-black shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">直链下载</span>
            <span className="sm:hidden">直链</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'api'
                ? 'bg-zinc-100 text-black shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>开放 API</span>
          </button>

        </nav>

        {/* Server Status Indicator */}
        <div className="hidden lg:flex items-center gap-2 bg-[#0a0a0a] px-3 py-1.5 rounded-full border border-zinc-800/80">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
          </span>
          <Server className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[10px] font-mono tracking-wider uppercase text-emerald-500 font-semibold">ENGINE ONLINE</span>
        </div>
      </div>
    </header>
  );
};

