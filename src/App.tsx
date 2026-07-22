'use client';

import React, { useState } from 'react';
import { ActiveTab } from './types';
import { ParsedTorrent } from './lib/torrentParser';
import { Navbar } from './components/Navbar';
import { TorrentUploader } from './components/TorrentUploader';
import { TorrentDetails } from './components/TorrentDetails';
import { MagnetEnhancer } from './components/MagnetEnhancer';
import { BatchProcessor } from './components/BatchProcessor';
import { DirectLinkConverter } from './components/DirectLinkConverter';
import { ApiDocumentation } from './components/ApiDocumentation';
import { Code, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('parser');
  const [currentTorrent, setCurrentTorrent] = useState<{
    parsed: ParsedTorrent;
    filename: string;
  } | null>(null);
  const [directLinkMagnet, setDirectLinkMagnet] = useState<string>('');

  const handleParsed = (parsed: ParsedTorrent, filename: string) => {
    setCurrentTorrent({ parsed, filename });
    setActiveTab('parser');
  };

  const handleClearCurrent = () => {
    setCurrentTorrent(null);
  };

  const handleConvertToDirectLink = (magnet: string) => {
    setDirectLinkMagnet(magnet);
    setActiveTab('direct-link');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#d1d1d1] flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Top Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'parser' && (
          <div className="space-y-8">
            {/* Torrent Uploader Component */}
            <TorrentUploader onParsed={handleParsed} />

            {/* Parsed Torrent Inspector Component */}
            {currentTorrent && (
              <div className="relative pt-4">
                <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <h2 className="text-xs uppercase font-mono tracking-widest text-zinc-400 font-semibold">
                      解析结果与详细参数 (Inspector)
                    </h2>
                  </div>
                  <button
                    onClick={handleClearCurrent}
                    className="text-xs text-zinc-300 hover:text-white font-mono transition-colors flex items-center gap-1"
                  >
                    <span>+ 解析新的 Torrent 文件</span>
                  </button>
                </div>
                <TorrentDetails
                  torrent={currentTorrent.parsed}
                  filename={currentTorrent.filename}
                  onConvertToDirectLink={handleConvertToDirectLink}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'enhancer' && <MagnetEnhancer />}

        {activeTab === 'batch' && <BatchProcessor />}

        {activeTab === 'direct-link' && <DirectLinkConverter initialMagnet={directLinkMagnet} />}

        {activeTab === 'api' && <ApiDocumentation />}
      </main>


      {/* Modern Compact Sophisticated Dark Footer */}
      <footer className="border-t border-zinc-800/60 bg-[#050505] py-8 text-zinc-500 text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <p className="font-serif-display text-sm text-zinc-300 tracking-wide">
              MagnetPulse — Torrent 转 Magnet 极速解析器 & REST API
            </p>
            <p className="text-[11px] text-zinc-500 font-mono">
              毫秒级纯算法 • 支持 Bencode 解析 • 开放极速接口
            </p>
          </div>

          <div className="flex items-center gap-4 text-zinc-400">
            <button
              onClick={() => setActiveTab('api')}
              className="hover:text-white transition-colors flex items-center gap-1.5 font-mono text-[11px]"
            >
              <Code className="w-3.5 h-3.5 text-emerald-400" />
              <span>开放 API 文档</span>
            </button>

            <span className="text-zinc-800">•</span>

            <span className="flex items-center gap-1 text-zinc-500 font-mono text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>纯净无广告</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

