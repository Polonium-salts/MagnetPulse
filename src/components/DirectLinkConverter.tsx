import React, { useState } from 'react';
import { DirectLinkResponse, DirectLinkItem } from '../types';
import { Download, Copy, Check, ExternalLink, Link, Sparkles, Loader2, AlertCircle, Play, Globe, Terminal, FileText, UploadCloud, FileDown, ShieldCheck } from 'lucide-react';

interface DirectLinkConverterProps {
  initialMagnet?: string;
  onSelectSample?: (sample: any) => void;
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

  const filteredFiles = result
    ? result.directDownloadUrls.filter(file => file.name.toLowerCase().includes(filterText.toLowerCase()))
    : [];

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
              <a
                href={result.webTorrentPlayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-xl bg-[#050505] border border-zinc-800/80 hover:border-zinc-600 transition-all group flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-zinc-900 text-zinc-200">
                    <Play className="w-4 h-4" />
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white group-hover:text-zinc-200">
                    WebTorrent 在线极速直连播放
                  </p>
                  <p className="text-[10px] font-mono text-zinc-500 mt-1">
                    无需下载客户端，在浏览器中使用 WebRTC 直接播放/下载
                  </p>
                </div>
              </a>

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
                filteredFiles.map((fileItem) => (
                  <div key={fileItem.index} className="p-4 hover:bg-zinc-900/40 transition-colors space-y-2">
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

                    <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0a0a0a] p-2.5 rounded-lg border border-zinc-800/60 font-mono text-[11px]">
                      <span className="text-zinc-400 truncate max-w-md">
                        {fileItem.directHttpUrl}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleCopySingle(fileItem.directHttpUrl, fileItem.index)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[11px] font-mono flex items-center gap-1 transition-colors"
                        >
                          {copiedLinkIndex === fileItem.index ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedLinkIndex === fileItem.index ? '已复制' : '复制直链'}</span>
                        </button>

                        <a
                          href={fileItem.webTorrentGatewayUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[11px] font-mono flex items-center gap-1 transition-colors"
                        >
                          <Play className="w-3 h-3 text-zinc-300" />
                          <span>在线播放/下载</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-zinc-500 font-mono text-xs">
                  无匹配的文件
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
