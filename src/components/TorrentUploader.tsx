import React, { useState, useRef } from 'react';
import { parseTorrent, ParsedTorrent } from '../lib/torrentParser';
import { SAMPLE_TORRENTS, SampleTorrent } from '../data/sampleTorrents';
import { 
  UploadCloud, 
  Link as LinkIcon, 
  FileCode, 
  Sparkles, 
  AlertCircle, 
  ArrowRight,
  HardDrive,
  FileUp,
  Loader2
} from 'lucide-react';

interface TorrentUploaderProps {
  onParsed: (parsed: ParsedTorrent, filename: string) => void;
}

export const TorrentUploader: React.FC<TorrentUploaderProps> = ({ onParsed }) => {
  const [activeInputMode, setActiveInputMode] = useState<'drag' | 'url' | 'raw'>('drag');
  const [urlInput, setUrlInput] = useState('');
  const [rawInput, setRawInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setLoading(true);

    try {
      if (!file.name.endsWith('.torrent') && !file.type.includes('bittorrent')) {
        // Warning but still attempt to parse
      }

      const arrayBuffer = await file.arrayBuffer();
      const parsed = parseTorrent(new Uint8Array(arrayBuffer));
      onParsed(parsed, file.name);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || '解压并解析 Torrent 失败，请检查文件格式。');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setErrorMsg(null);
    setLoading(true);

    try {
      const trimmed = urlInput.trim();
      
      // Call backend API /api/v1/parse with fileUrl or magnetUri
      const res = await fetch('/api/v1/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(trimmed.startsWith('magnet:?') ? { magnetUri: trimmed } : { fileUrl: trimmed }),
          appendBestTrackers: true
        })
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || '解析 URL / 磁力链失败');
      }

      if (json.source === 'file') {
        onParsed(json.data, trimmed.split('/').pop() || 'remote.torrent');
      } else {
        // Construct mock ParsedTorrent from magnet
        const magData = json.data;
        onParsed({
          infoHash: magData.infoHash,
          infoHashBase32: '',
          magnetUri: magData.magnetUri,
          name: magData.name,
          totalSize: 0,
          formattedTotalSize: '未知大小',
          fileCount: 1,
          files: [{ path: magData.name, length: 0, formattedSize: '未知' }],
          trackers: magData.trackers,
          announce: magData.trackers[0] || null,
          isPrivate: false,
          pieceLength: 0,
          pieceCount: 0
        }, 'Magnet Link');
      }
    } catch (err: any) {
      setErrorMsg(err.message || '请求或解析过程出错');
    } finally {
      setLoading(false);
    }
  };

  const handleRawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawInput.trim()) return;

    setErrorMsg(null);
    setLoading(true);

    try {
      const cleaned = rawInput.trim().replace(/\s+/g, '');
      let bytes: Uint8Array;

      // Detect if Base64 or Hex
      if (/^[0-9a-fA-F]+$/.test(cleaned) && cleaned.length % 2 === 0) {
        // Hex
        const len = cleaned.length / 2;
        bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = parseInt(cleaned.substring(i * 2, i * 2 + 2), 16);
        }
      } else {
        // Base64
        const binaryStr = atob(cleaned.replace(/^data:.*?;base64,/, ''));
        bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
      }

      const parsed = parseTorrent(bytes);
      onParsed(parsed, 'pasted-torrent.torrent');
    } catch (err: any) {
      setErrorMsg('输入的 Base64 或 Hex 数据无法解析为标准的 Bencode 结构。');
    } finally {
      setLoading(false);
    }
  };

  const handleSampleClick = (sample: SampleTorrent) => {
    setErrorMsg(null);
    setLoading(true);
    setTimeout(() => {
      try {
        const parsed = parseTorrent(sample.buffer);
        onParsed(parsed, sample.title);
      } catch (err: any) {
        setErrorMsg('加载示例失败');
      } finally {
        setLoading(false);
      }
    }, 150);
  };

  return (
    <div className="bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Background Subtle Gradient */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-zinc-900/40 rounded-full blur-3xl pointer-events-none" />

      {/* Input Mode Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-4 mb-6 gap-3">
        <div className="flex items-center gap-2">
          <FileUp className="w-5 h-5 text-zinc-300" />
          <h2 className="font-serif-display text-2xl tracking-wide text-white italic">
            Torrent 种子解析器
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-[#050505] p-1 rounded-xl border border-zinc-800/80">
          <button
            type="button"
            onClick={() => setActiveInputMode('drag')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              activeInputMode === 'drag'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            文件拖拽
          </button>
          <button
            type="button"
            onClick={() => setActiveInputMode('url')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              activeInputMode === 'url'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            网络 URL
          </button>
          <button
            type="button"
            onClick={() => setActiveInputMode('raw')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              activeInputMode === 'raw'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Base64 / Hex
          </button>
        </div>
      </div>

      {/* Mode 1: Drag & Drop File */}
      {activeInputMode === 'drag' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-zinc-400 bg-zinc-900/60 scale-[0.99]'
              : 'border-zinc-800/80 hover:border-zinc-600 bg-[#050505]/60 hover:bg-[#050505]'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".torrent,application/x-bittorrent"
            className="hidden"
          />

          <div className="w-14 h-14 rounded-xl bg-zinc-900 text-zinc-300 flex items-center justify-center mx-auto mb-4 border border-zinc-700/60 shadow-inner">
            {loading ? (
              <Loader2 className="w-7 h-7 animate-spin text-zinc-200" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>

          <h3 className="text-sm sm:text-base font-medium text-white mb-1.5">
            拖拽 `.torrent` 文件到此处，或<span className="text-zinc-300 underline decoration-zinc-600 underline-offset-4 ml-1">点击选择本地文件</span>
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto font-mono">
            100% 本地高能解析 + 毫秒级提取 InfoHash 与 Magnet 磁力链接
          </p>
        </div>
      )}

      {/* Mode 2: Remote URL or Magnet */}
      {activeInputMode === 'url' && (
        <form onSubmit={handleUrlSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-zinc-400 mb-2">
              Torrent 远程链接 或 磁力链接 (magnet:?)
            </label>
            <div className="relative">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/file.torrent 或 magnet:?xt=urn:btih:..."
                className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 pl-10 font-mono"
              />
              <LinkIcon className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !urlInput.trim()}
            className="w-full py-3 px-4 bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs uppercase font-mono tracking-wider"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>服务器请求解析中...</span>
              </>
            ) : (
              <>
                <span>立即解析 URL / 磁力链</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Mode 3: Base64 or Hex */}
      {activeInputMode === 'raw' && (
        <form onSubmit={handleRawSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-zinc-400 mb-2">
              粘贴 Torrent 文件的 Base64 编码 或 十六进制 (Hex) 文本
            </label>
            <div className="relative">
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                rows={4}
                placeholder="例如: d8:announce39:udp://tracker.opentrackr.org:1337/announce... 或 64383a616e6e6f756e6365..."
                className="w-full bg-[#050505] border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !rawInput.trim()}
            className="w-full py-3 px-4 bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs uppercase font-mono tracking-wider"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>解码中...</span>
              </>
            ) : (
              <>
                <FileCode className="w-4 h-4" />
                <span>解码并解析 Bencode 数据</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Error Message Alert */}
      {errorMsg && (
        <div className="mt-4 p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Quick Sample Torrent Preset Buttons */}
      <div className="mt-6 pt-5 border-t border-zinc-800/80">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
            <span>无文件？点击加载预置测试种子：</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {SAMPLE_TORRENTS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSampleClick(sample)}
              className="flex items-start gap-2.5 p-3 rounded-xl bg-[#050505] hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-600 text-left transition-all group"
            >
              <div className="p-2 rounded-lg bg-zinc-900 text-zinc-300 group-hover:bg-zinc-800 transition-colors shrink-0">
                <HardDrive className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-200 group-hover:text-white truncate transition-colors">
                  {sample.title}
                </p>
                <p className="text-[10px] font-mono text-zinc-500 truncate mt-0.5">
                  {sample.category} • {sample.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
