import React, { useState } from 'react';
import { parseMagnetUri, buildMagnetUri, POPULAR_TRACKERS } from '../lib/torrentParser';
import { QrCodeModal } from './QrCodeModal';
import { 
  Zap, 
  Magnet, 
  Plus, 
  Copy, 
  Check, 
  QrCode as QrIcon, 
  ExternalLink, 
  ShieldCheck, 
  Radio, 
  Sparkles,
  ArrowRight,
  ListPlus
} from 'lucide-react';

export const MagnetEnhancer: React.FC = () => {
  const [inputMagnet, setInputMagnet] = useState('');
  const [parsedHash, setParsedHash] = useState('');
  const [parsedName, setParsedName] = useState('');
  const [originalTrackers, setOriginalTrackers] = useState<string[]>([]);
  const [enhancedMagnet, setEnhancedMagnet] = useState('');
  const [activePreset, setActivePreset] = useState<'best' | 'all'>('best');
  const [customTrackersInput, setCustomTrackersInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const handleEnhance = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMagnet.trim()) return;

    setErrorMsg(null);
    try {
      const parsed = parseMagnetUri(inputMagnet.trim());
      setParsedHash(parsed.infoHash);
      setParsedName(parsed.name || '');
      setOriginalTrackers(parsed.trackers);

      // Select preset
      const presetTrackers = activePreset === 'all' ? POPULAR_TRACKERS.all : POPULAR_TRACKERS.best;

      // Custom trackers
      const customTrackers = customTrackersInput
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.startsWith('udp://') || s.startsWith('http://') || s.startsWith('https://'));

      const allMerged = Array.from(new Set([...parsed.trackers, ...presetTrackers, ...customTrackers]));
      const newMagnet = buildMagnetUri(parsed.infoHash, parsed.name, allMerged);

      setEnhancedMagnet(newMagnet);
    } catch (err: any) {
      setErrorMsg(err.message || '格式错误，无法解析此磁力链接。');
    }
  };

  const handleCopy = () => {
    if (!enhancedMagnet) return;
    navigator.clipboard.writeText(enhancedMagnet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      <QrCodeModal
        isOpen={showQr}
        onClose={() => setShowQr(false)}
        magnetUri={enhancedMagnet}
        title={parsedName || parsedHash || '加速磁力链'}
      />

      <div className="bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-zinc-900 text-zinc-200 border border-zinc-800">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif-display text-2xl text-white italic">磁力链接加速器 (Tracker 注入)</h2>
            <p className="text-xs text-zinc-500 font-mono">为缺乏 Peer 节点的磁力链接一键注入全球热门 Tracker 服务器，大幅加速 BT 节点发现</p>
          </div>
        </div>

        <form onSubmit={handleEnhance} className="mt-6 space-y-5">
          {/* Input Magnet */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest text-zinc-400 mb-2">
              输入未加速的 Magnet 磁力链接：
            </label>
            <div className="relative">
              <input
                type="text"
                value={inputMagnet}
                onChange={(e) => setInputMagnet(e.target.value)}
                placeholder="magnet:?xt=urn:btih:4a2e587a8b9c... 或 magnet:?xt=urn:btih:..."
                className="w-full bg-[#050505] border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500 pl-10"
              />
              <Magnet className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Tracker Preset Selection */}
          <div className="bg-[#050505] border border-zinc-800/80 p-4 rounded-xl space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
              <ListPlus className="w-4 h-4 text-zinc-300" />
              <span>选择 Tracker 注入策略：</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActivePreset('best')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  activePreset === 'best'
                    ? 'bg-zinc-900 border-zinc-600 text-white'
                    : 'bg-[#0a0a0a] border-zinc-800/80 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${activePreset === 'best' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-900 text-zinc-600'}`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">推荐：高存活率 Tracker 包 (+10)</p>
                  <p className="text-[10px] font-mono text-zinc-500 mt-0.5">精选全球前 10 响应最快、可用率 99% 的 UDP/HTTP Tracker</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActivePreset('all')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  activePreset === 'all'
                    ? 'bg-zinc-900 border-zinc-600 text-white'
                    : 'bg-[#0a0a0a] border-zinc-800/80 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${activePreset === 'all' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-900 text-zinc-600'}`}>
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">全量：强力网络加速包 (+15+)</p>
                  <p className="text-[10px] font-mono text-zinc-500 mt-0.5">聚合全部公共 Tracker 节点，最大化全网寻源能力</p>
                </div>
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full py-3 px-4 bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wider"
          >
            <Sparkles className="w-4 h-4" />
            <span>一键生成加速 Magnet 磁力链</span>
          </button>
        </form>

        {errorMsg && (
          <p className="mt-4 text-xs font-mono text-rose-400 bg-rose-950/40 p-3 rounded-xl border border-rose-800/60">
            {errorMsg}
          </p>
        )}
      </div>

      {/* Enhanced Result Display Card */}
      {enhancedMagnet && (
        <div className="bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>加速后的 Magnet 磁力链接已生成</span>
            </span>

            <span className="text-xs font-mono text-zinc-500 bg-[#050505] px-2.5 py-1 rounded-lg border border-zinc-800">
              InfoHash: {parsedHash}
            </span>
          </div>

          {parsedName && (
            <p className="text-xs font-mono text-zinc-200">任务名称: {parsedName}</p>
          )}

          <div className="bg-[#050505] p-4 rounded-xl border border-zinc-800/80 space-y-3">
            <textarea
              readOnly
              value={enhancedMagnet}
              rows={4}
              className="w-full bg-transparent text-xs font-mono text-zinc-300 focus:outline-none resize-none select-all"
            />

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={handleCopy}
                className="py-2 px-4 bg-white hover:bg-zinc-200 text-black font-mono font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? '已复制加速链接' : '复制加速磁力链'}</span>
              </button>

              <a
                href={enhancedMagnet}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-mono text-xs rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-zinc-400" />
                <span>直接调起下载客户端</span>
              </a>

              <button
                onClick={() => setShowQr(true)}
                className="py-2 px-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-mono text-xs rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <QrIcon className="w-4 h-4 text-zinc-400" />
                <span>生成二维码</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
