import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const baseUrl = `${proto}://${host}`;

  return NextResponse.json({
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
}
