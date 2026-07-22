import express from 'express';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { parseTorrent, parseMagnetUri, buildMagnetUri, POPULAR_TRACKERS, formatBytes } from './src/lib/torrentParser.js';

const app = express();
const PORT = 3000;

// Configure body parsers & file upload middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size
});

// Enable CORS for API consumers
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// API Routes

/**
 * GET /api/v1/health
 * Server health check endpoint
 */
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    service: 'Torrent to Magnet Parser API',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/v1/parse
 * Parse a single .torrent file, URL, base64 data, or Magnet URI
 */
app.post('/api/v1/parse', upload.single('file'), async (req, res) => {
  try {
    let torrentBuffer: Uint8Array | null = null;

    // Case 1: Uploaded file via multipart/form-data
    if (req.file) {
      torrentBuffer = new Uint8Array(req.file.buffer);
    }
    // Case 2: Base64 string in JSON body
    else if (req.body?.fileBase64) {
      const base64Data = req.body.fileBase64.replace(/^data:.*?;base64,/, '');
      torrentBuffer = new Uint8Array(Buffer.from(base64Data, 'base64'));
    }
    // Case 3: Hex string in JSON body
    else if (req.body?.fileHex) {
      torrentBuffer = new Uint8Array(Buffer.from(req.body.fileHex, 'hex'));
    }
    // Case 4: Remote file URL
    else if (req.body?.fileUrl) {
      const url = String(req.body.fileUrl).trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return res.status(400).json({ error: '无效的 URL 协议，仅支持 http:// 或 https://' });
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TorrentMagnetParser/1.0'
        }
      });

      if (!response.ok) {
        return res.status(400).json({ error: `下载远程 Torrent 失败: HTTP ${response.status} ${response.statusText}` });
      }

      const arrayBuffer = await response.arrayBuffer();
      torrentBuffer = new Uint8Array(arrayBuffer);
    }
    // Case 5: Magnet URI directly passed in body
    else if (req.body?.magnetUri) {
      const parsedMag = parseMagnetUri(String(req.body.magnetUri));
      const enhancedMagnet = buildMagnetUri(
        parsedMag.infoHash,
        parsedMag.name,
        req.body?.appendBestTrackers ? [...parsedMag.trackers, ...POPULAR_TRACKERS.best] : parsedMag.trackers
      );

      return res.json({
        success: true,
        source: 'magnet',
        data: {
          infoHash: parsedMag.infoHash,
          name: parsedMag.name || 'Magnet Link',
          magnetUri: enhancedMagnet,
          trackers: parsedMag.trackers,
          addedTrackersCount: req.body?.appendBestTrackers ? POPULAR_TRACKERS.best.length : 0
        }
      });
    }

    if (!torrentBuffer || torrentBuffer.length === 0) {
      return res.status(400).json({
        error: '未提供有效的 Torrent 数据。请上传 file 文件、提供 fileBase64 / fileHex / fileUrl，或 magnetUri 参数。'
      });
    }

    const parsed = parseTorrent(torrentBuffer);

    // Optional: Append best trackers if requested in query or body
    if (req.body?.appendBestTrackers || req.query?.appendTrackers === 'true') {
      const allTrackers = Array.from(new Set([...parsed.trackers, ...POPULAR_TRACKERS.best]));
      parsed.magnetUri = buildMagnetUri(parsed.infoHash, parsed.name, allTrackers);
      parsed.trackers = allTrackers;
    }

    return res.json({
      success: true,
      source: 'file',
      data: parsed
    });

  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || '解析 Torrent 失败'
    });
  }
});

/**
 * POST /api/v1/convert
 * Batch parsing endpoint
 */
app.post('/api/v1/convert', upload.array('files', 20), async (req, res) => {
  try {
    const results: any[] = [];
    const files = (req.files as Express.Multer.File[]) || [];

    for (const file of files) {
      try {
        const parsed = parseTorrent(new Uint8Array(file.buffer));
        results.push({
          filename: file.originalname,
          success: true,
          data: parsed
        });
      } catch (e: any) {
        results.push({
          filename: file.originalname,
          success: false,
          error: e.message
        });
      }
    }

    // Also check for array of URLs or base64 items in body
    if (Array.isArray(req.body?.urls)) {
      for (const url of req.body.urls) {
        try {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const parsed = parseTorrent(new Uint8Array(arrayBuffer));
          results.push({
            url,
            success: true,
            data: parsed
          });
        } catch (e: any) {
          results.push({
            url,
            success: false,
            error: e.message
          });
        }
      }
    }

    return res.json({
      success: true,
      totalProcessed: results.length,
      results
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || '批量转换过程出错'
    });
  }
});

/**
 * POST /api/v1/enhance-magnet
 * Add public high-speed trackers to an existing Magnet link
 */
app.post('/api/v1/enhance-magnet', (req, res) => {
  try {
    const { magnetUri, customTrackers, preset } = req.body;
    if (!magnetUri) {
      return res.status(400).json({ error: '缺少 magnetUri 参数' });
    }

    const parsed = parseMagnetUri(String(magnetUri));
    let trackersToAdd: string[] = [];

    if (preset === 'all') {
      trackersToAdd = POPULAR_TRACKERS.all;
    } else {
      trackersToAdd = POPULAR_TRACKERS.best;
    }

    if (Array.isArray(customTrackers)) {
      trackersToAdd = [...trackersToAdd, ...customTrackers];
    }

    const enhancedTrackers = Array.from(new Set([...parsed.trackers, ...trackersToAdd]));
    const enhancedMagnetUri = buildMagnetUri(parsed.infoHash, parsed.name, enhancedTrackers);

    return res.json({
      success: true,
      data: {
        originalMagnetUri: magnetUri,
        enhancedMagnetUri,
        infoHash: parsed.infoHash,
        name: parsed.name,
        originalTrackersCount: parsed.trackers.length,
        totalTrackersCount: enhancedTrackers.length,
        addedTrackersCount: enhancedTrackers.length - parsed.trackers.length,
        trackers: enhancedTrackers
      }
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || '磁力链接处理失败'
    });
  }
});

/**
 * GET /api/v1/openapi.json
 * API documentation specification
 */
app.get('/api/v1/openapi.json', (req, res) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'http';
  const baseUrl = `${protocol}://${host}`;

  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Torrent to Magnet Parser API',
      version: '1.0.0',
      description: '高性能 Torrent 种子解析与磁力链接转换 API，方便个人应用与自动化脚本调用。'
    },
    servers: [{ url: `${baseUrl}/api/v1` }],
    endpoints: {
      parse: {
        method: 'POST',
        path: '/api/v1/parse',
        contentType: ['multipart/form-data', 'application/json'],
        description: '解析 Torrent 种子文件，提取 InfoHash、文件列表、Tracker、生成 Magnet 链接。'
      },
      convert: {
        method: 'POST',
        path: '/api/v1/convert',
        contentType: ['multipart/form-data', 'application/json'],
        description: '批量上传/处理多个 Torrent 文件或远程 URL。'
      },
      enhanceMagnet: {
        method: 'POST',
        path: '/api/v1/enhance-magnet',
        contentType: ['application/json'],
        description: '为已有的磁力链接注入优质公共 Tracker 服务器，加速 BitTorrent 节点发现。'
      }
    }
  });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
