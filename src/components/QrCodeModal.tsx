import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, QrCode as QrIcon, Download } from 'lucide-react';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  magnetUri: string;
  title: string;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  magnetUri,
  title
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && magnetUri) {
      QRCode.toDataURL(magnetUri, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
        .then(url => setDataUrl(url))
        .catch(err => console.error('Error generating QR code', err));
    }
  }, [isOpen, magnetUri]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(magnetUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `magnet-qrcode-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl max-w-md w-full p-6 text-zinc-100 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1 text-zinc-400 font-mono text-xs uppercase tracking-wider">
          <QrIcon className="w-4 h-4 text-zinc-300" />
          <span>磁力链接二维码</span>
        </div>
        <h3 className="font-serif-display text-xl text-white truncate mb-4">{title}</h3>

        <div className="bg-white p-4 rounded-xl flex items-center justify-center my-4 shadow-inner">
          {dataUrl ? (
            <img src={dataUrl} alt="Magnet QR Code" className="w-64 h-64 object-contain" />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center text-zinc-500 font-mono text-xs">
              生成二维码中...
            </div>
          )}
        </div>

        <p className="text-xs font-mono text-zinc-500 text-center mb-5">
          使用手机 BT 客户端（如 qBittorrent, Transmission, Flud）扫码添加任务
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-zinc-200 text-black font-semibold font-mono rounded-lg transition-all shadow-sm text-xs uppercase tracking-wider"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '已复制磁力链' : '复制磁力链接'}</span>
          </button>
          <button
            onClick={handleDownloadQr}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-mono rounded-lg transition-colors text-xs"
            title="下载二维码图片"
          >
            <Download className="w-4 h-4" />
            <span>保存图片</span>
          </button>
        </div>
      </div>
    </div>
  );
};
