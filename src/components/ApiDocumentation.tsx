import React, { useState } from 'react';
import { 
  Code, 
  Terminal, 
  Play, 
  Copy, 
  Check, 
  Server, 
  Globe, 
  Send, 
  FileCode, 
  CheckCircle2, 
  Loader2,
  BookOpen,
  Sparkles,
  Zap
} from 'lucide-react';

export const ApiDocumentation: React.FC = () => {
  const [activeLang, setActiveLang] = useState<'curl' | 'js' | 'python' | 'go' | 'php'>('curl');
  const [copiedCode, setCopiedCode] = useState(false);

  // Live API Tester states
  const [testEndpoint, setTestEndpoint] = useState<'/api/v1/parse' | '/api/v1/enhance-magnet'>('/api/v1/parse');
  const [testMethod, setTestMethod] = useState<'POST'>('POST');
  const [testMagnetUri, setTestMagnetUri] = useState('magnet:?xt=urn:btih:4a2e587a8b9c1d2e3f4a5b6c7d8e9f0a1b2c3d4e&dn=SampleVideo');
  const [testFile, setTestFile] = useState<File | null>(null);
  const [appendBestTrackers, setAppendBestTrackers] = useState(true);

  // Test Execution states
  const [apiLoading, setApiLoading] = useState(false);
  const [apiResponseStatus, setApiResponseStatus] = useState<number | null>(null);
  const [apiResponseTime, setApiResponseTime] = useState<number | null>(null);
  const [apiResponseJson, setApiResponseJson] = useState<string | null>(null);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const snippets = {
    curl: `# 1. 上传 .torrent 文件解析
curl -X POST "${currentOrigin}/api/v1/parse" \\
  -F "file=@/path/to/ubuntu-24.04.torrent" \\
  -F "appendBestTrackers=true"

# 2. 通过 URL / 磁力链解析
curl -X POST "${currentOrigin}/api/v1/parse" \\
  -H "Content-Type: application/json" \\
  -d '{
    "fileUrl": "https://example.com/file.torrent",
    "appendBestTrackers": true
  }'`,

    js: `// JavaScript / Node.js (fetch)
async function parseTorrentFile(fileObject) {
  const formData = new FormData();
  formData.append('file', fileObject);
  formData.append('appendBestTrackers', 'true');

  const response = await fetch('${currentOrigin}/api/v1/parse', {
    method: 'POST',
    body: formData
  });

  const json = await response.json();
  console.log('Magnet URI:', json.data.magnetUri);
  console.log('InfoHash:', json.data.infoHash);
  return json;
}`,

    python: `# Python 3 (requests)
import requests

# 上传 .torrent 文件
url = "${currentOrigin}/api/v1/parse"
files = {'file': open('file.torrent', 'rb')}
data = {'appendBestTrackers': 'true'}

response = requests.post(url, files=files, data=data)
result = response.json()

print("Magnet URI:", result['data']['magnetUri'])
print("InfoHash:", result['data']['infoHash'])`,

    go: `// Go (net/http)
package main

import (
	"bytes"
	"fmt"
	"mime/multipart"
	"net/http"
	"os"
	"io"
)

func main() {
	url := "${currentOrigin}/api/v1/parse"
	file, _ := os.Open("file.torrent")
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "file.torrent")
	io.Copy(part, file)
	writer.Close()

	req, _ := http.NewRequest("POST", url, body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	fmt.Println(string(respBody))
}`,

    php: `<?php
// PHP cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "${currentOrigin}/api/v1/parse");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, [
    'file' => new CURLFile('/path/to/file.torrent'),
    'appendBestTrackers' => 'true'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
echo "Magnet: " . $data['data']['magnetUri'];
?>`
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(snippets[activeLang]);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRunApiTest = async () => {
    setApiLoading(true);
    setApiResponseStatus(null);
    setApiResponseJson(null);

    const startTime = performance.now();

    try {
      if (testEndpoint === '/api/v1/parse') {
        let res: Response;
        if (testFile) {
          const fd = new FormData();
          fd.append('file', testFile);
          fd.append('appendBestTrackers', String(appendBestTrackers));
          res = await fetch('/api/v1/parse', {
            method: 'POST',
            body: fd
          });
        } else {
          res = await fetch('/api/v1/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              magnetUri: testMagnetUri,
              appendBestTrackers
            })
          });
        }

        const endTime = performance.now();
        setApiResponseTime(Math.round(endTime - startTime));
        setApiResponseStatus(res.status);

        const json = await res.json();
        setApiResponseJson(JSON.stringify(json, null, 2));
      } else {
        // Enhance magnet
        const res = await fetch('/api/v1/enhance-magnet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            magnetUri: testMagnetUri,
            preset: 'best'
          })
        });

        const endTime = performance.now();
        setApiResponseTime(Math.round(endTime - startTime));
        setApiResponseStatus(res.status);

        const json = await res.json();
        setApiResponseJson(JSON.stringify(json, null, 2));
      }
    } catch (err: any) {
      setApiResponseStatus(500);
      setApiResponseJson(JSON.stringify({ error: err.message || '网络连接失败' }, null, 2));
    } finally {
      setApiLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-zinc-900 text-zinc-200 border border-zinc-800">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-serif-display text-2xl text-white italic">开发者 REST API 中心</h1>
            <p className="text-xs font-mono text-zinc-500">零鉴权 / 支持跨域 CORS / 方便个人自动化脚本及第三方应用无缝集成</p>
          </div>
        </div>

        {/* Base Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <div className="bg-[#050505] p-4 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">API Base URL</span>
            <span className="text-xs font-mono text-emerald-400 break-all">{currentOrigin}/api/v1</span>
          </div>

          <div className="bg-[#050505] p-4 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">CORS 跨域支持</span>
            <span className="text-xs font-mono text-zinc-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>全接口开放允许 (*)</span>
            </span>
          </div>

          <div className="bg-[#050505] p-4 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">内容格式支持</span>
            <span className="text-xs font-mono text-zinc-300">
              Form-Data / JSON / Base64 / Hex
            </span>
          </div>
        </div>
      </div>

      {/* Code Snippets Section */}
      <div className="bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <h2 className="font-serif-display text-xl text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-zinc-400" />
            <span>多语言 SDK & 调用代码示例</span>
          </h2>

          <div className="flex items-center gap-1 bg-[#050505] p-1 rounded-xl border border-zinc-800/80 text-xs font-mono">
            {(['curl', 'js', 'python', 'go', 'php'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setActiveLang(lang)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all uppercase ${
                  activeLang === lang
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        <div className="relative bg-[#050505] rounded-xl border border-zinc-800/80 p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
          <button
            onClick={handleCopyCode}
            className="absolute top-3 right-3 p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-zinc-300 transition-colors flex items-center gap-1 text-[11px] font-mono"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? '已复制' : '复制示例代码'}</span>
          </button>

          <pre className="pt-2">{snippets[activeLang]}</pre>
        </div>
      </div>

      {/* Live Interactive API Tester */}
      <div className="bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-4">
          <Play className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
          <h2 className="font-serif-display text-xl text-white">在线 API 测试沙盒 (Live Interactive Tester)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Controls Form */}
          <div className="space-y-4 bg-[#050505] border border-zinc-800/80 p-5 rounded-xl">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">选择测试 Endpoint</label>
              <select
                value={testEndpoint}
                onChange={(e) => setTestEndpoint(e.target.value as any)}
                className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-zinc-500 font-mono"
              >
                <option value="/api/v1/parse">POST /api/v1/parse (解析种子或磁力链)</option>
                <option value="/api/v1/enhance-magnet">POST /api/v1/enhance-magnet (磁力链注入 Tracker)</option>
              </select>
            </div>

            {testEndpoint === '/api/v1/parse' && (
              <>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">或上传本地 Torrent 文件</label>
                  <input
                    type="file"
                    accept=".torrent"
                    onChange={(e) => setTestFile(e.target.files?.[0] || null)}
                    className="w-full text-xs font-mono text-zinc-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                  />
                </div>

                {!testFile && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">输入磁力链或远程 URL</label>
                    <input
                      type="text"
                      value={testMagnetUri}
                      onChange={(e) => setTestMagnetUri(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-3.5 py-2 text-xs font-mono text-white focus:outline-none"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={appendBestTrackers}
                    onChange={(e) => setAppendBestTrackers(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-700 text-white focus:ring-zinc-500"
                  />
                  <span>自动注入全局 High-Speed Trackers</span>
                </label>
              </>
            )}

            <button
              onClick={handleRunApiTest}
              disabled={apiLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-semibold font-mono rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
            >
              {apiLoading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Send className="w-4 h-4" />}
              <span>{apiLoading ? '发送请求中...' : '发送实时 HTTP 请求'}</span>
            </button>
          </div>

          {/* Response Inspector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 uppercase tracking-wider text-[10px]">Response 响应结果</span>
              {apiResponseStatus && (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                    apiResponseStatus === 200 ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-400' : 'bg-rose-950/60 border border-rose-800/80 text-rose-400'
                  }`}>
                    HTTP {apiResponseStatus}
                  </span>
                  <span className="text-zinc-500 font-mono text-[10px]">{apiResponseTime} ms</span>
                </div>
              )}
            </div>

            <div className="bg-[#050505] border border-zinc-800/80 rounded-xl p-4 font-mono text-[11px] text-zinc-300 h-[240px] overflow-y-auto">
              {apiResponseJson ? (
                <pre>{apiResponseJson}</pre>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-600 text-center font-mono text-xs">
                  点击“发送实时 HTTP 请求”在下方观察 Express 服务器返回 JSON 数据...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
