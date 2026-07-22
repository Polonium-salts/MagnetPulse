import React, { useState, useEffect, useRef } from 'react';
import { DirectLinkResponse, DirectLinkItem } from '../types';
import { formatBytes } from '../lib/torrentParser';
import { 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  Link, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  Play, 
  Globe, 
  Terminal, 
  FileText, 
  UploadCloud, 
  FileDown, 
  ShieldCheck,
  Eye,
  Activity,
  Users,
  StopCircle,
  HelpCircle,
  Wifi
} from 'lucide-react';

interface DirectLinkConverterProps {
  initialMagnet?: string;
  onSelectSample?: (sample: any) => void;
}

declare global {
  interface Window {
    WebTorrent: any;
    __webtorrent_client: any;
  }
}

export const DirectLinkConverter: React.FC<DirectLinkConverterProps> = ({ initialMagnet }) => {
  const [inputMagnet, setInputMagnet] = useState(initialMagnet || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<DirectLinkResponse | null>(null);
  
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);
  const [copiedAllLinks, setCopiedAllLinks] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [filterText, setFilterText] = useState('');

  // WebTorrent Engine State
  const [webtorrentLoaded, setWebtorrentLoaded] = useState(false);
  const [engineInitializing, setEngineInitializing] = useState(false);
  const [webtorrentError, setWebtorrentError] = useState<string | null>(null);
  const [torrentStates, setTorrentStates] = useState<Record<string, any>>({});
  const [blobLoadingIndex, setBlobLoadingIndex] = useState<number | null>(null);

  // Preview Modal state
  const [previewFile, setPreviewFile] = useState<{
    infoHash: string;
    fileIndex: number;
    name: string;
    size: string;
    magnetUri: string;
  } | null>(null);

  useEffect(() => {
    if (initialMagnet) {
      setInputMagnet(initialMagnet);
    }
  }, [initialMagnet]);

  // Load WebTorrent script from CDN and handle global singleton
  const initWebTorrent = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return reject(new Error('Not in browser'));
      
      if (window.WebTorrent) {
        setWebtorrentLoaded(true);
        if (!window.__webtorrent_client) {
          window.__webtorrent_client = new window.WebTorrent();
        }
        return resolve(window.__webtorrent_client);
      }

      setEngineInitializing(true);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js';
      script.async = true;
      script.onload = () => {
        setWebtorrentLoaded(true);
        setEngineInitializing(false);
        if (!window.__webtorrent_client) {
          window.__webtorrent_client = new window.WebTorrent();
        }
        resolve(window.__webtorrent_client);
      };
      script.onerror = () => {
        setEngineInitializing(false);
        reject(new Error('加载 WebTorrent 引擎失败，请检查网络连接'));
      };
      document.body.appendChild(script);
    });
  };

  // Poll for WebTorrent download progress
  useEffect(() => {
    if (typeof window !== 'undefined' && window.WebTorrent) {
      setWebtorrentLoaded(true);
    }

    const interval = setInterval(() => {
      if (typeof window === 'undefined') return;
      const client = window.__webtorrent_client;
      if (!client || !client.torrents || !client.torrents.length) {
        if (Object.keys(torrentStates).length > 0) {
          setTorrentStates({});
        }
        return;
      }

      const newStates: Record<string, any> = {};
      client.torrents.forEach((t: any) => {
        newStates[t.infoHash] = {
          infoHash: t.infoHash,
          name: t.name,
          progress: t.progress,
          downloadSpeed: t.downloadSpeed,
          uploadSpeed: t.uploadSpeed,
          downloaded: t.downloaded,
          uploaded: t.uploaded,
          numPeers: t.numPeers,
          timeRemaining: t.timeRemaining,
          files: t.files.map((f: any) => ({
            name: f.name,
            path: f.path,
            length: f.length,
            progress: f.progress,
            downloaded: f.downloaded,
            blobUrl: f._blobUrl || null,
          }))
        };
      });
      setTorrentStates(newStates);
    }, 1000);

    return () => clearInterval(interval);
  }, [torrentStates]);

  const handleConvert = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMagnet.trim()) {
      setErrorMsg('请输入 Magnet 磁力链接、InfoHash 或上传 Torrent 文件');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/v1/direct-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnetUri: inputMagnet.trim() })
      });

      const text = await response.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`服务器响应异常 (${response.status})`);
      }

      if (!response.ok || !json.success) {
        throw new Error(json.error || '生成直链失败');
      }

      setResult(json.data);
    } catch (err: any) {
      setErrorMsg(err.message || '请求失败，请检查输入格式');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/v1/direct-link', {
        method: 'POST',
        body: formData
      });

      const text = await response.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`服务器响应异常 (${response.status})`);
      }

      if (!response.ok || !json.success) {
        throw new Error(json.error || '解析文件生成直链失败');
      }

      setResult(json.data);
      setInputMagnet(json.data.magnetUri);
    } catch (err: any) {
      setErrorMsg(err.message || '解析 Torrent 文件失败');
    } finally {
      setLoading(false);
    }
  };

  const startTorrentDownload = async (magnetUri: string) => {
    try {
      setWebtorrentError(null);
      const client = await initWebTorrent();
      
      let torrent = client.get(magnetUri);
      if (!torrent) {
        torrent = client.add(magnetUri, {
          announce: [
            'wss://tracker.openwebtorrent.com',
            'wss://tracker.btorrent.xyz',
            'wss://tracker.fastcast.nz',
            'wss://tracker.files.fm:7073/announce'
          ]
        });

        torrent.on('error', (err: any) => {
          console.error('Torrent error:', err);
          setWebtorrentError(err.message || '磁力链接下载中发生错误');
        });
      }
    } catch (err: any) {
      setWebtorrentError(err.message || '启动下载器失败');
    }
  };

  const stopTorrentDownload = (magnetUri: string) => {
    const client = window.__webtorrent_client;
    if (!client) return;
    const torrent = client.get(magnetUri);
    if (torrent) {
      torrent.destroy(() => {
        const hash = torrent.infoHash;
        setTorrentStates(prev => {
          const next = { ...prev };
          delete next[hash];
          return next;
        });
      });
    }
  };

  const handleSaveFile = async (magnetUri: string, fileIndex: number, fileName: string) => {
    try {
      setWebtorrentError(null);
      const client = await initWebTorrent();
      
      let torrent = client.get(magnetUri);
      if (!torrent) {
        torrent = client.add(magnetUri, {
          announce: [
            'wss://tracker.openwebtorrent.com',
            'wss://tracker.btorrent.xyz',
            'wss://tracker.fastcast.nz',
            'wss://tracker.files.fm:7073/announce'
          ]
        });
        
        torrent.on('error', (err: any) => {
          console.error('Torrent error:', err);
          setWebtorrentError(err.message || '下载过程中发生错误');
        });
      }

      const file = torrent.files.find((f: any, idx: number) => idx === fileIndex || f.name === fileName);
      if (!file) {
        alert('正在连接种子节点拉取文件，请稍等重试');
        return;
      }

      setBlobLoadingIndex(fileIndex);
      file.getBlobURL((err: any, url: string) => {
        setBlobLoadingIndex(null);
        if (err) {
          alert('生成本地浏览器下载链接失败: ' + err.message);
          return;
        }
        file._blobUrl = url;
        
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
    } catch (err: any) {
      setBlobLoadingIndex(null);
      alert('无法开启浏览器下载引擎: ' + err.message);
    }
  };

  const handleCopySingle = (url: string, index: number) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkIndex(index);
    setTimeout(() => setCopiedLinkIndex(null), 2000);
  };

  const handleCopyAll = () => {
    if (!result) return;
    const allUrls = result.directDownloadUrls.map(item => `${item.name}\t${item.directHttpUrl}`).join('\n');
    navigator.clipboard.writeText(allUrls);
    setCopiedAllLinks(true);
    setTimeout(() => setCopiedAllLinks(false), 2000);
  };

  const handleCopyCurl = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.curlCommandAll);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleExportTxt = () => {
    if (!result) return;
    const textContent = result.directDownloadUrls
      .map(item => `[${item.name}] (${item.size})\n直链: ${item.directHttpUrl}\nWebTorrent: ${item.webTorrentGatewayUrl}\nCurl: ${item.curlCommand}\n`)
      .join('\n---\n\n');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.name || 'DirectLinks'}_直链列表.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFileType = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(ext)) return 'audio';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
    if (['txt', 'nfo', 'log', 'md', 'json', 'html', 'css', 'js'].includes(ext)) return 'text';
    if (['pdf'].includes(ext)) return 'pdf';
    return 'other';
  };

  const filteredFiles = result
    ? result.directDownloadUrls.filter(file => file.name.toLowerCase().includes(filterText.toLowerCase()))
    : [];

  // Active torrent status for current result
  const activeTorrentState = result ? torrentStates[result.infoHash] : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Input Form Card */}
      <div className="bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-4 mb-6 gap-3">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-zinc-300" />
            <h2 className="font-serif-display text-2xl tracking-wide text-white italic">
              Torrent 转 HTTP 直链解析器
            </h2>
          </div>

          <span className="text-[10px] font-mono tracking-widest uppercase bg-zinc-900 text-emerald-400 border border-zinc-800 px-2.5 py-1 rounded">
            HTTP Direct Gateway Online
          </span>
        </div>

        <form onSubmit={handleConvert} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-zinc-400 mb-2">
              输入 Magnet 磁力链接 / InfoHash 或 上传 .torrent 文件：
            </label>
            <div className="relative">
              <input
                type="text"
                value={inputMagnet}
                onChange={(e) => setInputMagnet(e.target.value)}
                placeholder="magnet:?xt=urn:btih:4a2e587a8b9c... 或 4a2e587a8b9c..."
                className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500 pl-10"
              />
              <Link className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={loading || !inputMagnet.trim()}
              className="w-full sm:w-auto flex-1 py-3 px-4 bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wider"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Sparkles className="w-4 h-4" />}
              <span>{loading ? '转换为直链中...' : '一键生成 HTTP 直链'}</span>
            </button>

            <label className="w-full sm:w-auto py-3 px-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-mono text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer">
              <UploadCloud className="w-4 h-4 text-zinc-400" />
              <span>选择 Torrent 文件</span>
              <input
                type="file"
                accept=".torrent"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </form>

        {errorMsg && (
          <div className="mt-4 p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Real-time In-Browser Download Engine Dashboard */}
      {result && (
        <div className="bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeTorrentState ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${activeTorrentState ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
              </span>
              <span className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
                浏览器内置极速下载引擎
              </span>
              {engineInitializing && (
                <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1 ml-2">
                  <Loader2 className="w-3 h-3 animate-spin text-zinc-400" /> 引擎加载中...
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!activeTorrentState ? (
                <button
                  onClick={() => startTorrentDownload(result.magnetUri)}
                  className="py-1 px-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-emerald-400 text-zinc-300 font-mono text-[10px] rounded transition-all flex items-center gap-1.5"
                >
                  <Wifi className="w-3.5 h-3.5" />
                  <span>启用站内极速下载/播放</span>
                </button>
              ) : (
                <button
                  onClick={() => stopTorrentDownload(result.magnetUri)}
                  className="py-1 px-3 bg-rose-950/40 border border-rose-800/60 hover:border-rose-700 hover:text-rose-300 text-rose-400 font-mono text-[10px] rounded transition-all flex items-center gap-1.5"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  <span>停止并释放下载引擎</span>
                </button>
              )}
            </div>
          </div>

          {activeTorrentState ? (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-[#050505] p-3 rounded-xl border border-zinc-800/40">
                <span className="text-zinc-500 text-[10px] block uppercase mb-1">下载速度</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" />
                  {formatBytes(activeTorrentState.downloadSpeed)}/s
                </span>
              </div>
              <div className="bg-[#050505] p-3 rounded-xl border border-zinc-800/40">
                <span className="text-zinc-500 text-[10px] block uppercase mb-1">活跃连接节点</span>
                <span className="text-zinc-200 font-semibold flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {activeTorrentState.numPeers} 个 Peers
                </span>
              </div>
              <div className="bg-[#050505] p-3 rounded-xl border border-zinc-800/40">
                <span className="text-zinc-500 text-[10px] block uppercase mb-1">已下容量</span>
                <span className="text-zinc-300">
                  {formatBytes(activeTorrentState.downloaded)} / {result.totalSize}
                </span>
              </div>
              <div className="bg-[#050505] p-3 rounded-xl border border-zinc-800/40">
                <span className="text-zinc-500 text-[10px] block uppercase mb-1">当前总进度</span>
                <span className="text-zinc-200 font-bold">
                  {(activeTorrentState.progress * 100).toFixed(1)}%
                </span>
              </div>
              <div className="col-span-1 sm:col-span-4 bg-[#050505] p-3.5 rounded-xl border border-zinc-800/40 space-y-1.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-zinc-400 font-semibold">WebRTC 极速点对点下载缓冲</span>
                  <span className="text-zinc-400">
                    {activeTorrentState.progress === 1 ? '已完成种子下载，可离线保存或预览' : '数据流正在浏览器安全沙盒中缓冲...'}
                  </span>
                </div>
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300 bg-gradient-to-r from-emerald-600 to-emerald-400"
                    style={{ width: `${activeTorrentState.progress * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[#050505] rounded-xl border border-zinc-800/40 text-center text-zinc-500 font-mono text-xs">
              提示：你可以直接在下方文件列表点击 <span className="text-zinc-300">“站内极速下载”</span> 或 <span className="text-zinc-300">“站内播放/预览”</span>，系统将自动激活浏览器内置的 WebRTC 引擎，无需任何服务器代理。
            </div>
          )}

          {webtorrentError && (
            <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{webtorrentError}</span>
            </div>
          )}
        </div>
      )}

      {/* Result Display Section */}
      {result && (
        <div className="space-y-6">
          {/* Direct Link Overview Card */}
          <div className="bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold">
                  直链解析完成 (DIRECT LINK READY)
                </span>
              </div>

              <span className="text-xs font-mono text-zinc-500 bg-[#050505] px-2.5 py-1 rounded border border-zinc-800">
                InfoHash: {result.infoHash}
              </span>
            </div>

            <div>
              <h3 className="font-serif-display text-2xl text-white break-all mb-2">
                {result.name}
              </h3>
              <p className="text-xs font-mono text-zinc-500">
                总容量: <span className="text-zinc-300">{result.totalSize}</span> • 包含文件: <span className="text-zinc-300">{result.fileCount} 个</span>
              </p>
            </div>

            {/* Quick Action Gateways */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => startTorrentDownload(result.magnetUri)}
                className="p-4 rounded-xl bg-[#050505] border border-zinc-800/80 hover:border-zinc-600 transition-all group flex flex-col justify-between text-left gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-zinc-900 text-zinc-200">
                    <Play className="w-4 h-4" />
                  </div>
                  <Wifi className={`w-3.5 h-3.5 ${activeTorrentState ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-white'}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white group-hover:text-zinc-200">
                    站内极速 WebRTC 引擎
                  </p>
                  <p className="text-[10px] font-mono text-zinc-500 mt-1">
                    {activeTorrentState ? '引擎运行中 - 正在流式下载与分享' : '一键激活浏览器内置客户端，在站内免服务器直接下载/预览'}
                  </p>
                </div>
              </button>

              <a
                href={result.cloudSeedrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-xl bg-[#050505] border border-zinc-800/80 hover:border-zinc-600 transition-all group flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-zinc-900 text-zinc-200">
                    <Globe className="w-4 h-4" />
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white group-hover:text-zinc-200">
                    云端离线解包 (Seedr Gateway)
                  </p>
                  <p className="text-[10px] font-mono text-zinc-500 mt-1">
                    云端服务器极速下载并转换为标准 HTTP/HTTPS 离线直链
                  </p>
                </div>
              </a>

              <div className="p-4 rounded-xl bg-[#050505] border border-zinc-800/80 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-zinc-900 text-zinc-200">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <button
                    onClick={handleCopyCurl}
                    className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                    title="复制 Curl 命令"
                  >
                    {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">
                    Curl 终端命令行直链
                  </p>
                  <p className="text-[10px] font-mono text-zinc-500 mt-1 truncate">
                    {result.curlCommandAll}
                  </p>
                </div>
              </div>
            </div>

            {/* Batch Export Tools Bar */}
            <div className="pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-mono text-zinc-400">
                文件列表直链 ({result.directDownloadUrls.length} 个)
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCopyAll}
                  className="py-2 px-3.5 bg-white hover:bg-zinc-200 text-black font-mono font-semibold text-xs rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                >
                  {copiedAllLinks ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAllLinks ? '已复制所有文件直链' : '复制所有文件直链'}</span>
                </button>

                <button
                  onClick={handleExportTxt}
                  className="py-2 px-3.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-mono text-xs rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5 text-zinc-400" />
                  <span>导出直链 TXT</span>
                </button>
              </div>
            </div>

            {/* Filter Input */}
            <div>
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="搜索文件名称..."
                className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>

            {/* File Direct Download Table */}
            <div className="max-h-[500px] overflow-y-auto rounded-xl border border-zinc-800/80 bg-[#050505] divide-y divide-zinc-800/80 text-xs">
              {filteredFiles.length > 0 ? (
                filteredFiles.map((fileItem) => {
                  // Check if WebTorrent has specific info for this file
                  const fileProgress = activeTorrentState?.files?.find((f: any) => f.name === fileItem.name);
                  const isDownloaded = fileProgress ? fileProgress.progress === 1 : false;

                  return (
                    <div key={fileItem.index} className="p-4 hover:bg-zinc-900/40 transition-colors space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span className="font-mono font-semibold text-zinc-200 truncate">
                            {fileItem.name}
                          </span>
                        </div>
                        <span className="font-mono text-zinc-400 text-xs shrink-0">
                          {fileItem.size}
                        </span>
                      </div>

                      {/* File specific Progress bar if downloading */}
                      {fileProgress && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                            <span>缓冲进度: {(fileProgress.progress * 100).toFixed(1)}%</span>
                            <span>{formatBytes(fileProgress.downloaded)} 已缓冲</span>
                          </div>
                          <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-400 h-full transition-all duration-300" 
                              style={{ width: `${fileProgress.progress * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-[#0a0a0a] p-2.5 rounded-lg border border-zinc-800/60 font-mono text-[11px]">
                        <span className="text-zinc-400 truncate max-w-md">
                          {fileItem.directHttpUrl}
                        </span>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {/* Copy URL button */}
                          <button
                            onClick={() => handleCopySingle(fileItem.directHttpUrl, fileItem.index)}
                            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded text-[11px] font-mono flex items-center gap-1 transition-colors border border-zinc-800/50"
                          >
                            {copiedLinkIndex === fileItem.index ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedLinkIndex === fileItem.index ? '已复制' : '复制直链'}</span>
                          </button>

                          {/* Direct Browser Download Button */}
                          <button
                            onClick={() => handleSaveFile(result.magnetUri, fileItem.index, fileItem.name)}
                            disabled={blobLoadingIndex === fileItem.index}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-colors ${
                              isDownloaded 
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-black font-semibold' 
                                : 'bg-white hover:bg-zinc-200 text-black font-semibold'
                            }`}
                          >
                            {blobLoadingIndex === fileItem.index ? (
                              <Loader2 className="w-3 h-3 animate-spin text-black" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            <span>
                              {blobLoadingIndex === fileItem.index 
                                ? '生成中...' 
                                : isDownloaded 
                                  ? '站内保存 (已就绪)' 
                                  : '站内极速直接下载'}
                            </span>
                          </button>

                          {/* In-Site Streaming & Play Preview Button */}
                          <button
                            onClick={() => {
                              // Ensure torrent is adding/added to webtorrent client
                              startTorrentDownload(result.magnetUri);
                              setPreviewFile({
                                infoHash: result.infoHash,
                                fileIndex: fileItem.index,
                                name: fileItem.name,
                                size: fileItem.size,
                                magnetUri: result.magnetUri
                              });
                            }}
                            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded text-[11px] font-mono flex items-center gap-1 transition-colors border border-zinc-700/50"
                          >
                            <Eye className="w-3 h-3 text-emerald-400" />
                            <span>站内流媒体预览</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-zinc-500 font-mono text-xs">
                  无匹配的文件
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Real-time Streaming Player Modal */}
      {previewFile && (
        <PreviewPlayerModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onSave={() => handleSaveFile(previewFile.magnetUri, previewFile.fileIndex, previewFile.name)}
        />
      )}
    </div>
  );
};

// Beautiful Interactive Preview Player Modal
const PreviewPlayerModal: React.FC<{
  file: { infoHash: string, fileIndex: number, name: string, size: string, magnetUri: string };
  onClose: () => void;
  onSave: () => void;
}> = ({ file, onClose, onSave }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getFileType = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(ext)) return 'audio';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
    if (['txt', 'nfo', 'log', 'md', 'json', 'html', 'css', 'js'].includes(ext)) return 'text';
    if (['pdf'].includes(ext)) return 'pdf';
    return 'other';
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const client = window.__webtorrent_client;
    if (!client) {
      setError('未检测到站内 WebRTC 引擎，请关闭重试');
      setLoading(false);
      return;
    }
    const torrent = client.get(file.magnetUri);
    if (!torrent) {
      setError('正在连接种子，引擎正在搜寻节点中...');
      setLoading(false);
      return;
    }

    const torrentFile = torrent.files.find((f: any, idx: number) => idx === file.fileIndex || f.name === file.name);
    if (!torrentFile) {
      setError('正在解析文件树列表，请稍后...');
      setLoading(false);
      return;
    }

    containerRef.current.innerHTML = '';
    setLoading(true);

    try {
      torrentFile.appendTo(containerRef.current, {
        autoplay: true,
        controls: true,
        muted: false
      }, (err: any, elem: any) => {
        setLoading(false);
        if (err) {
          console.error('appendTo error, using blob fallback:', err);
          setError('正在为该文件类型缓冲完整 Blob 数据流以支持在线预览...');
          
          // Fallback to getBlobURL
          torrentFile.getBlobURL((blobErr: any, url: string) => {
            if (blobErr) {
              setError('由于浏览器跨域或节点连接断开，获取文件失败。你可以直接点击“保存文件”。');
              return;
            }
            setError(null);
            if (containerRef.current) {
              containerRef.current.innerHTML = '';
              const fileType = getFileType(file.name);
              if (fileType === 'video') {
                const video = document.createElement('video');
                video.src = url;
                video.controls = true;
                video.autoplay = true;
                video.className = "w-full max-h-[50vh] rounded-xl bg-black outline-none";
                containerRef.current.appendChild(video);
              } else if (fileType === 'audio') {
                const audio = document.createElement('audio');
                audio.src = url;
                audio.controls = true;
                audio.autoplay = true;
                audio.className = "w-full py-4";
                containerRef.current.appendChild(audio);
              } else if (fileType === 'image') {
                const img = document.createElement('img');
                img.src = url;
                img.className = "max-w-full max-h-[50vh] mx-auto rounded-lg object-contain";
                containerRef.current.appendChild(img);
              } else if (fileType === 'text') {
                const iframe = document.createElement('iframe');
                iframe.src = url;
                iframe.className = "w-full h-[40vh] rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 p-2 font-mono text-xs";
                containerRef.current.appendChild(iframe);
              } else {
                setError('该文件类型（如压缩包、镜像、EXE等）不支持站内媒体预览，请直接点击下方按钮保存。');
              }
            }
          });
        } else {
          if (elem) {
            elem.className = "w-full max-h-[50vh] rounded-xl border border-zinc-800 bg-black outline-none";
          }
        }
      });
    } catch (e: any) {
      console.error('appendTo threw error:', e);
      setError('拉取多媒体流异常，请尝试直接下载: ' + e.message);
      setLoading(false);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [file]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/80 bg-zinc-950">
          <div className="min-w-0 flex-1 mr-4">
            <h4 className="text-sm font-semibold text-white truncate">{file.name}</h4>
            <p className="text-[10px] font-mono text-zinc-500 mt-0.5">大小: {file.size} • 站内 WebRTC 极速流媒体预览</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Player Container */}
        <div className="p-6 flex-1 flex flex-col items-center justify-center bg-black min-h-[320px] relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10 gap-3 text-center p-4">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-xs font-mono text-zinc-300">正在搜索分布式 WebRTC 节点并缓冲媒体流，请稍候...</p>
              <p className="text-[10px] font-mono text-zinc-500 max-w-sm">浏览器将安全地从 P2P 节点和公共 WebRTC 网关缓冲内容，无需消耗额外服务器流量。</p>
            </div>
          )}

          {error && (
            <div className="p-4 text-center text-zinc-400 max-w-md mx-auto space-y-3 z-10">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-xs font-mono leading-relaxed">{error}</p>
            </div>
          )}

          <div ref={containerRef} className="w-full flex justify-center items-center" />
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950 flex justify-between items-center gap-3">
          <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            支持一边下一边播，流畅不等待
          </span>
          <div className="flex gap-2">
            <button
              onClick={onSave}
              className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>直接下载保存</span>
            </button>
            <button
              onClick={onClose}
              className="py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
