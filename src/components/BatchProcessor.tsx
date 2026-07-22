import React, { useState, useRef } from 'react';
import { parseTorrent, ParsedTorrent, buildMagnetUri, POPULAR_TRACKERS } from '../lib/torrentParser';
import { 
  Layers, 
  UploadCloud, 
  Copy, 
  Check, 
  Download, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  Loader2
} from 'lucide-react';

interface BatchItem {
  id: string;
  filename: string;
  status: 'pending' | 'success' | 'error';
  torrent?: ParsedTorrent;
  error?: string;
}

export const BatchProcessor: React.FC = () => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appendTrackers, setAppendTrackers] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setLoading(true);

    const newItems: BatchItem[] = files.map((file, idx) => ({
      id: `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      filename: file.name,
      status: 'pending'
    }));

    setItems(prev => [...prev, ...newItems]);

    // Process files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const targetId = newItems[i].id;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const parsed = parseTorrent(new Uint8Array(arrayBuffer));

        if (appendTrackers) {
          const mergedTrackers = Array.from(new Set([...parsed.trackers, ...POPULAR_TRACKERS.best]));
          parsed.magnetUri = buildMagnetUri(parsed.infoHash, parsed.name, mergedTrackers);
          parsed.trackers = mergedTrackers;
        }

        setItems(prev => prev.map(item => item.id === targetId ? {
          ...item,
          status: 'success',
          torrent: parsed
        } : item));
      } catch (err: any) {
        setItems(prev => prev.map(item => item.id === targetId ? {
          ...item,
          status: 'error',
          error: err.message || '文件解析失败'
        } : item));
      }
    }

    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearAll = () => {
    setItems([]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCopyAllMagnets = () => {
    const magnets = items
      .filter(i => i.status === 'success' && i.torrent)
      .map(i => i.torrent!.magnetUri)
      .join('\n\n');

    if (!magnets) return;

    navigator.clipboard.writeText(magnets);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadTxt = () => {
    const lines = items
      .filter(i => i.status === 'success' && i.torrent)
      .map(i => `# ${i.torrent!.name} (${i.torrent!.formattedTotalSize})\n${i.torrent!.magnetUri}\n`)
      .join('\n');

    if (!lines) return;

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `magnet-list-batch-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const data = items
      .filter(i => i.status === 'success' && i.torrent)
      .map(i => i.torrent);

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `torrent-parsed-batch-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const successCount = items.filter(i => i.status === 'success').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      <div className="bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-900 text-zinc-200 border border-zinc-800">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif-display text-2xl text-white italic">批量 Torrent 转换 Magnet</h2>
              <p className="text-xs font-mono text-zinc-500">同时选择多个 .torrent 种子文件批量解析与导出磁力列表</p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer bg-[#050505] px-3.5 py-2 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white">
            <input
              type="checkbox"
              checked={appendTrackers}
              onChange={(e) => setAppendTrackers(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-white focus:ring-zinc-500"
            />
            <Zap className="w-3.5 h-3.5 text-zinc-300" />
            <span>自动添加全球 Top 10 高速 Tracker</span>
          </label>
        </div>

        {/* Dropzone for Batch Files */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-800 hover:border-zinc-600 bg-[#050505]/60 hover:bg-[#050505] rounded-xl p-8 text-center cursor-pointer transition-all"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFilesSelected}
            multiple
            accept=".torrent,application/x-bittorrent"
            className="hidden"
          />

          <div className="w-12 h-12 rounded-xl bg-zinc-900 text-zinc-300 flex items-center justify-center mx-auto mb-3 border border-zinc-700/60">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-zinc-200" /> : <UploadCloud className="w-6 h-6" />}
          </div>

          <p className="text-sm font-medium text-white">点击按住 Ctrl / Shift 多选或拖拽多个 Torrent 种子文件</p>
          <p className="text-xs font-mono text-zinc-500 mt-1">无数量上限，本地高能并行解析</p>
        </div>

        {/* Action Bar for Batch Export */}
        {items.length > 0 && (
          <div className="mt-6 pt-6 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-mono text-zinc-400">
              已处理：<span className="text-emerald-400 font-semibold">{successCount}</span> / {items.length} 个文件
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyAllMagnets}
                disabled={successCount === 0}
                className="py-2 px-3.5 bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-semibold text-xs font-mono uppercase tracking-wider rounded-lg transition-all shadow-sm flex items-center gap-1.5"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAll ? '已复制全部磁力链' : '一键复制全部 Magnet'}</span>
              </button>

              <button
                onClick={handleDownloadTxt}
                disabled={successCount === 0}
                className="py-2 px-3.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 disabled:opacity-40 text-zinc-300 hover:text-white font-mono text-xs rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>导出 TXT 文本</span>
              </button>

              <button
                onClick={handleDownloadJson}
                disabled={successCount === 0}
                className="py-2 px-3.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 disabled:opacity-40 text-zinc-300 hover:text-white font-mono text-xs rounded-lg transition-colors flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>导出 JSON 数据</span>
              </button>

              <button
                onClick={handleClearAll}
                className="py-2 px-3 bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/60 font-mono text-xs rounded-lg transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>清空</span>
              </button>
            </div>
          </div>
        )}

        {/* Batch Results Table */}
        {items.length > 0 && (
          <div className="mt-4 rounded-xl border border-zinc-800/80 overflow-hidden bg-[#050505] divide-y divide-zinc-800/80 text-xs">
            {items.map((item) => (
              <div key={item.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-zinc-900/40 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {item.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : item.status === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-zinc-400 animate-spin shrink-0" />
                    )}
                    <span className="font-semibold text-white truncate">
                      {item.torrent?.name || item.filename}
                    </span>
                  </div>

                  {item.status === 'success' && item.torrent && (
                    <p className="font-mono text-[11px] text-zinc-500 truncate pl-6">
                      {item.torrent.magnetUri}
                    </p>
                  )}

                  {item.status === 'error' && (
                    <p className="text-[11px] font-mono text-rose-400 pl-6">{item.error}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.status === 'success' && item.torrent && (
                    <span className="font-mono text-zinc-300 bg-[#0a0a0a] px-2.5 py-1 rounded-lg border border-zinc-800">
                      {item.torrent.formattedTotalSize}
                    </span>
                  )}

                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
