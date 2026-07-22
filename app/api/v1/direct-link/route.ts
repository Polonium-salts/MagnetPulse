import { NextRequest, NextResponse } from 'next/server';
import { parseTorrent, parseMagnetUri, buildMagnetUri, POPULAR_TRACKERS, formatBytes } from '@/src/lib/torrentParser';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${proto}://${host}`;

    const contentType = req.headers.get('content-type') || '';
    let parsed: any = null;
    let torrentBuffer: Uint8Array | null = null;
    let fileBase64 = '';
    let magnetUri = '';
    let infoHashParam = '';
    let fileUrl = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        torrentBuffer = new Uint8Array(arrayBuffer);
      }
      magnetUri = (formData.get('magnetUri') as string) || '';
      infoHashParam = (formData.get('infoHash') as string) || '';
      fileUrl = (formData.get('fileUrl') as string) || '';
    } else {
      const body = await req.json().catch(() => ({}));
      fileBase64 = body.fileBase64 || '';
      magnetUri = body.magnetUri || '';
      infoHashParam = body.infoHash || '';
      fileUrl = body.fileUrl || '';
    }

    if (torrentBuffer) {
      parsed = parseTorrent(torrentBuffer);
    } else if (fileBase64) {
      const base64Data = fileBase64.replace(/^data:.*?;base64,/, '');
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      parsed = parseTorrent(bytes);
    } else if (magnetUri || infoHashParam) {
      const magUri = magnetUri || `magnet:?xt=urn:btih:${infoHashParam}`;
      const parsedMag = parseMagnetUri(magUri);
      const enhancedMagnet = buildMagnetUri(
        parsedMag.infoHash,
        parsedMag.name || 'Torrent Task',
        [...parsedMag.trackers, ...POPULAR_TRACKERS.best]
      );

      parsed = {
        infoHash: parsedMag.infoHash,
        name: parsedMag.name || `Task_${parsedMag.infoHash.substring(0, 8)}`,
        totalSize: 0,
        formattedTotalSize: '未知大小 (磁力链)',
        files: [{ path: parsedMag.name || 'Download_File', size: 0, formattedSize: '未知大小' }],
        magnetUri: enhancedMagnet,
        trackers: parsedMag.trackers
      };
    } else if (fileUrl) {
      const response = await fetch(fileUrl.trim());
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        parsed = parseTorrent(new Uint8Array(arrayBuffer));
      }
    }

    if (!parsed) {
      return NextResponse.json({ error: '未提供有效的 Torrent 文件或 Magnet 磁力链接' }, { status: 400 });
    }

    const fullMagnet = parsed.magnetUri || buildMagnetUri(parsed.infoHash, parsed.name, POPULAR_TRACKERS.best);
    const encodedMag = encodeURIComponent(fullMagnet);

    const directDownloadUrls = (parsed.files || []).map((file: any, index: number) => {
      const filename = file.path || `File_${index + 1}`;
      const directHttpUrl = `${baseUrl}/api/v1/stream?infoHash=${parsed.infoHash}&file=${index}&name=${encodeURIComponent(filename)}&magnet=${encodedMag}`;
      const webTorrentGatewayUrl = `https://instant.io/#${encodedMag}`;

      return {
        index,
        name: filename,
        size: file.formattedSize || formatBytes(file.size || 0),
        bytes: file.size || 0,
        directHttpUrl,
        webTorrentGatewayUrl,
        curlCommand: `curl -L "${directHttpUrl}" -o "${filename.split('/').pop() || 'file'}"`
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        infoHash: parsed.infoHash,
        name: parsed.name,
        totalSize: parsed.formattedTotalSize || formatBytes(parsed.totalSize || 0),
        fileCount: parsed.files?.length || 1,
        magnetUri: fullMagnet,
        webTorrentPlayUrl: `https://instant.io/#${encodedMag}`,
        cloudSeedrUrl: `https://www.seedr.cc/files?magnet=${encodedMag}`,
        directDownloadUrls,
        curlCommandAll: directDownloadUrls.length > 0 ? directDownloadUrls[0].curlCommand : `curl -L "${baseUrl}/api/v1/stream?infoHash=${parsed.infoHash}&magnet=${encodedMag}"`
      }
    });

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || '转直链失败'
    }, { status: 400 });
  }
}
