import React, { useState } from 'react';
import { ParsedTorrent, buildMagnetUri, POPULAR_TRACKERS } from '../lib/torrentParser';
import { QrCodeModal } from './QrCodeModal';
import { 
  Magnet, 
  Copy, 
  Check, 
  QrCode as QrIcon, 
  Download, 
  FileText, 
  FolderTree, 
  Radio, 
  Search, 
  ExternalLink, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  User, 
  MessageSquare, 
  Zap,
  Sparkles,
  Layers,
  Filter
} from 'lucide-react';

interface TorrentDetailsProps {
  torrent: ParsedTorrent;
  filename: string;
  onClear?: () => void;
  onConvertToDirectLink?: (magnet: string) => void;
}

export const TorrentDetails: React.FC<TorrentDetailsProps> = ({ torrent, filename, onConvertToDirectLink }) => {
  const [currentTorrent, setCurrentTorrent] = useState<ParsedTorrent>(torrent);
  const [copiedMagnet, setCopiedMagnet] = useState(false);
  const [copiedHashHex, setCopiedHashHex] = useState(false);
  const [copiedTrackers, setCopiedTrackers] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // File filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Trackers added indicator
  const [trackersEnhanced, setTrackersEnhanced] = useState(false);

  const handleCopyMagnet = () => {
    navigator.clipboard.writeText(currentTorrent.magnetUri);
    setCopiedMagnet(true);
    setTimeout(() => setCopiedMagnet(false), 2000);
  };

  const handleCopyHashHex = () => {
    navigator.clipboard.writeText(currentTorrent.infoHash);
    setCopiedHashHex(true);
    setTimeout(() => setCopiedHashHex(false), 2000);
  };

  const handleCopyTrackers = () => {
    const listStr = currentTorrent.trackers.join('\n');
    navigator.clipboard.writeText(listStr);
    setCopiedTrackers(true);
    setTimeout(() => setCopiedTrackers(false), 2000);
  };

  const handleDownloadMagnetFile = () => {
    const blob = new Blob([currentTorrent.magnetUri], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTorrent.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}.magnet`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInjectBestTrackers = () => {
    const mergedTrackers = Array.from(new Set([...currentTorrent.trackers, ...POPULAR_TRACKERS.best]));
    const newMagnet = buildMagnetUri(currentTorrent.infoHash, currentTorrent.name, mergedTrackers);

    setCurrentTorrent(prev => ({
      ...prev,
      trackers: mergedTrackers,
      magnetUri: newMagnet
    }));

    setTrackersEnhanced(true);
    setTimeout(() => setTrackersEnhanced(false), 3000);
  };

  // Filter files
  const filteredFiles = currentTorrent.files.filter(file => {
    const matchesSearch = file.path.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedCategory === 'all') return true;
    const ext = file.path.split('.').pop()?.toLowerCase() || '';

    if (selectedCategory === 'video') return ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'ts', 'm4v'].includes(ext);
    if (selectedCategory === 'audio') return ['mp3', 'flac', 'wav', 'aac', 'ogg', 'm4a', 'wma'].includes(ext);
    if (selectedCategory === 'archive') return ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso'].includes(ext);
    if (selectedCategory === 'document') return ['pdf', 'epub', 'txt', 'doc', 'docx', 'nfo'].includes(ext);

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* QR Code Popup Modal */}
      <QrCodeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        magnetUri={currentTorrent.magnetUri}
        title={currentTorrent.name}
      />

      {/* Main Torrent Overview Card */}
      <div className="bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Top Header Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-zinc-900 text-zinc-300 border border-zinc-800 text-[10px] font-mono tracking-widest uppercase rounded flex items-center gap-1.5">
              <Magnet className="w-3.5 h-3.5 text-zinc-300" />
              <span>PARSED OK</span>
            </span>

            {currentTorrent.isPrivate ? (
              <span className="px-2.5 py-1 bg-amber-950/40 text-amber-400 border border-amber-800/60 text-[10px] font-mono tracking-widest uppercase rounded flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>PRIVATE</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 text-[10px] font-mono tracking-widest uppercase rounded flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>PUBLIC</span>
              </span>
            )}
          </div>

          <span className="text-xs text-zinc-500 font-mono">
            {filename}
          </span>
        </div>

        {/* Torrent Name */}
        <h1 className="font-serif-display text-2xl sm:text-3xl text-white mb-6 break-all leading-snug">
          {currentTorrent.name}
        </h1>

        {/* Info Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#050505] border border-zinc-800/80 rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">总文件大小</p>
            <p className="text-base sm:text-lg font-mono font-semibold text-white">{currentTorrent.formattedTotalSize}</p>
          </div>

          <div className="bg-[#050505] border border-zinc-800/80 rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">包含文件数</p>
            <p className="text-base sm:text-lg font-mono font-semibold text-zinc-200">{currentTorrent.fileCount} 个</p>
          </div>

          <div className="bg-[#050505] border border-zinc-800/80 rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">分块大小 & 数量</p>
            <p className="text-xs sm:text-sm font-mono font-semibold text-zinc-300">
              {currentTorrent.pieceLength ? `${(currentTorrent.pieceLength / 1024 / 1024).toFixed(1)} MB` : '未知'}
              <span className="text-[10px] text-zinc-500 ml-1">({currentTorrent.pieceCount} 块)</span>
            </p>
          </div>

          <div className="bg-[#050505] border border-zinc-800/80 rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Tracker 服务器数</p>
            <p className="text-base sm:text-lg font-mono font-semibold text-emerald-400">{currentTorrent.trackers.length} 个</p>
          </div>
        </div>

        {/* Magnet URI Display & Action Bar */}
        <div className="space-y-3 bg-[#050505] border border-zinc-800/80 p-4 sm:p-5 rounded-xl mb-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Magnet className="w-4 h-4 text-zinc-400" />
              <span>Magnet 磁力链接 (BTIH)</span>
            </span>

            <button
              onClick={handleInjectBestTrackers}
              className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              title="自动注入全球高速公共 Tracker"
            >
              <Zap className="w-3.5 h-3.5 fill-amber-400/20" />
              <span>{trackersEnhanced ? '已注入优质 Tracker！' : '注入高速 Tracker'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={currentTorrent.magnetUri}
              className="w-full bg-[#0a0a0a] border border-zinc-800/80 rounded-lg px-3.5 py-2.5 text-xs font-mono text-zinc-300 focus:outline-none select-all truncate"
            />

            <button
              onClick={handleCopyMagnet}
              className="px-4 py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-mono uppercase tracking-wider font-semibold rounded-lg transition-all shadow-sm flex items-center gap-1.5 shrink-0"
            >
              {copiedMagnet ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedMagnet ? '已复制' : '复制磁力链'}</span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {onConvertToDirectLink && (
              <button
                onClick={() => onConvertToDirectLink(currentTorrent.magnetUri)}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs font-mono uppercase tracking-wider rounded-lg transition-all shadow-sm flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>转换为直链直接下载</span>
              </button>
            )}

            <a
              href={currentTorrent.magnetUri}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              <span>调起 BT 客户端下载</span>
            </a>

            <button
              onClick={() => setShowQrModal(true)}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5"
            >
              <QrIcon className="w-3.5 h-3.5 text-zinc-400" />
              <span>生成二维码</span>
            </button>

            <button
              onClick={handleDownloadMagnetFile}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>导出 .magnet 文件</span>
            </button>
          </div>
        </div>

        {/* InfoHash Hashes Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-[#050505] border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider block mb-0.5">InfoHash (HEX 40 位):</span>
              <span className="font-mono text-zinc-200 text-xs truncate block">{currentTorrent.infoHash}</span>
            </div>
            <button
              onClick={handleCopyHashHex}
              className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors shrink-0"
              title="复制 InfoHash Hex"
            >
              {copiedHashHex ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="bg-[#050505] border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider block mb-0.5">InfoHash (Base32 32 位):</span>
              <span className="font-mono text-zinc-300 text-xs truncate block">{currentTorrent.infoHashBase32 || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* File Tree Explorer & Tracker Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: File Explorer (2 cols width) */}
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl p-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="font-serif-display text-xl text-white flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-zinc-400" />
              <span>文件结构清单 ({filteredFiles.length} / {currentTorrent.fileCount})</span>
            </h3>

            {/* Extension category filters */}
            <div className="flex items-center gap-1 bg-[#050505] p-1 rounded-xl border border-zinc-800/80 text-xs font-mono">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedCategory === 'all' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setSelectedCategory('video')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedCategory === 'video' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                视频
              </button>
              <button
                onClick={() => setSelectedCategory('audio')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedCategory === 'audio' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                音频
              </button>
              <button
                onClick={() => setSelectedCategory('archive')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedCategory === 'archive' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                压缩包/镜像
              </button>
            </div>
          </div>

          {/* Search File Box */}
          <div className="relative mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="按文件名搜索文件..."
              className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500 pl-9"
            />
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
          </div>

          {/* File Table List */}
          <div className="max-h-[420px] overflow-y-auto rounded-xl border border-zinc-800/80 bg-[#050505] divide-y divide-zinc-800/50 text-xs">
            {filteredFiles.length > 0 ? (
              filteredFiles.map((file, idx) => {
                const percent = currentTorrent.totalSize > 0
                  ? Math.min(100, Math.max(0.5, (file.length / currentTorrent.totalSize) * 100))
                  : 0;

                return (
                  <div key={idx} className="p-3 hover:bg-zinc-900/50 transition-colors flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="font-mono text-zinc-200 truncate">{file.path}</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-zinc-400 h-full rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      <span className="text-zinc-300 font-semibold">{file.formattedSize}</span>
                      <span className="text-[10px] text-zinc-500 block">{percent.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-zinc-500 text-xs font-mono">
                未找到匹配的文件
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Trackers & Metadata (1 col width) */}
        <div className="space-y-6">
          {/* Tracker List */}
          <div className="bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif-display text-lg text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Trackers 服务器</span>
              </h3>

              <button
                onClick={handleCopyTrackers}
                className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1"
              >
                {copiedTrackers ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTrackers ? '已复制' : '复制 Tracker 列表'}</span>
              </button>
            </div>

            <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-1">
              {currentTorrent.trackers.length > 0 ? (
                currentTorrent.trackers.map((tr, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#050505] border border-zinc-800/80 text-[11px] font-mono text-zinc-300 truncate flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">{tr}</span>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-[#050505] rounded-xl text-center text-zinc-500 text-xs font-mono">
                  暂无内置 Tracker 服务器
                </div>
              )}
            </div>
          </div>

          {/* Metadata Card */}
          <div className="bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl p-6 shadow-2xl text-xs space-y-3">
            <h3 className="font-serif-display text-lg text-white mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" />
              <span>种子制作信息</span>
            </h3>

            {currentTorrent.createdDate && (
              <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800/60 pb-2">
                <span>创建时间：</span>
                <span className="font-mono text-zinc-200">
                  {new Date(currentTorrent.createdDate).toLocaleString('zh-CN')}
                </span>
              </div>
            )}

            {currentTorrent.createdBy && (
              <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800/60 pb-2">
                <span>制作工具：</span>
                <span className="font-mono text-zinc-200">{currentTorrent.createdBy}</span>
              </div>
            )}

            {currentTorrent.comment && (
              <div className="text-zinc-400 pt-1">
                <span className="block mb-1 font-semibold text-zinc-300">备注注释：</span>
                <p className="bg-[#050505] p-2.5 rounded-xl border border-zinc-800/80 text-zinc-300 text-[11px] font-mono italic">
                  "{currentTorrent.comment}"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
