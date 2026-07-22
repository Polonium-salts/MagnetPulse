import { NextRequest, NextResponse } from 'next/server';
import { parseTorrent, parseMagnetUri, buildMagnetUri, POPULAR_TRACKERS } from '@/src/lib/torrentParser';

export const runtime = 'nodejs'; // Cloudflare Pages supports Node.js APIs or Edge, but since we parse buffers, Node.js is robust.

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let torrentBuffer: Uint8Array | null = null;
    let fileBase64 = '';
    let fileHex = '';
    let fileUrl = '';
    let magnetUri = '';
    let appendBestTrackers = false;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        torrentBuffer = new Uint8Array(arrayBuffer);
      }
      appendBestTrackers = formData.get('appendBestTrackers') === 'true';
      magnetUri = (formData.get('magnetUri') as string) || '';
    } else {
      const body = await req.json().catch(() => ({}));
      fileBase64 = body.fileBase64 || '';
      fileHex = body.fileHex || '';
      fileUrl = body.fileUrl || '';
      magnetUri = body.magnetUri || '';
      appendBestTrackers = body.appendBestTrackers === true;
    }

    // Case 1: Buffer from uploaded file (populated above)
    // Case 2: Base64 string
    if (!torrentBuffer && fileBase64) {
      const base64Data = fileBase64.replace(/^data:.*?;base64,/, '');
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      torrentBuffer = bytes;
    }
    // Case 3: Hex string
    else if (!torrentBuffer && fileHex) {
      const hex = fileHex.trim();
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
      }
      torrentBuffer = bytes;
    }
    // Case 4: Remote file URL
    else if (!torrentBuffer && fileUrl) {
      const url = fileUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return NextResponse.json({ error: '无效的 URL 协议，仅支持 http:// 或 https://' }, { status: 400 });
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TorrentMagnetParser/1.0'
        }
      });

      if (!response.ok) {
        return NextResponse.json({ error: `下载远程 Torrent 失败: HTTP ${response.status} ${response.statusText}` }, { status: 400 });
      }

      const arrayBuffer = await response.arrayBuffer();
      torrentBuffer = new Uint8Array(arrayBuffer);
    }
    // Case 5: Magnet URI directly
    else if (!torrentBuffer && magnetUri) {
      const parsedMag = parseMagnetUri(magnetUri);
      const enhancedMagnet = buildMagnetUri(
        parsedMag.infoHash,
        parsedMag.name,
        appendBestTrackers ? [...parsedMag.trackers, ...POPULAR_TRACKERS.best] : parsedMag.trackers
      );

      return NextResponse.json({
        success: true,
        source: 'magnet',
        data: {
          infoHash: parsedMag.infoHash,
          name: parsedMag.name || 'Magnet Link',
          magnetUri: enhancedMagnet,
          trackers: parsedMag.trackers,
          addedTrackersCount: appendBestTrackers ? POPULAR_TRACKERS.best.length : 0
        }
      });
    }

    if (!torrentBuffer || torrentBuffer.length === 0) {
      return NextResponse.json({
        error: '未提供有效的 Torrent 数据。请上传 file 文件、提供 fileBase64 / fileHex / fileUrl，或 magnetUri 参数。'
      }, { status: 400 });
    }

    const parsed = parseTorrent(torrentBuffer);

    // Optional trackers append
    const urlParams = req.nextUrl.searchParams;
    const appendTrackersQuery = urlParams.get('appendTrackers') === 'true';

    if (appendBestTrackers || appendTrackersQuery) {
      const allTrackers = Array.from(new Set([...parsed.trackers, ...POPULAR_TRACKERS.best]));
      parsed.magnetUri = buildMagnetUri(parsed.infoHash, parsed.name, allTrackers);
      parsed.trackers = allTrackers;
    }

    return NextResponse.json({
      success: true,
      source: 'file',
      data: parsed
    });

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || '解析 Torrent 失败'
    }, { status: 400 });
  }
}
