import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function handleStreamRequest(req: NextRequest, params: any) {
  const infoHash = params.infoHash;
  const file = params.file;
  const magnet = params.magnet;
  const name = params.name;

  if (!infoHash && !magnet) {
    return NextResponse.json({ error: 'Missing infoHash or magnet parameter' }, { status: 400 });
  }

  const magnetUri = magnet ? String(magnet) : `magnet:?xt=urn:btih:${infoHash}`;
  const fileName = name ? String(name) : `torrent_file_${file || 0}`;

  // Redirect or proxy to WebTorrent instant stream gateway for direct HTTP download
  const gatewayStreamUrl = `https://instant.io/#${encodeURIComponent(magnetUri)}`;

  // Construct a redirect response with headers
  const headers = new Headers();
  headers.set('Content-Type', 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  headers.set('X-Magnet-InfoHash', String(infoHash || ''));
  headers.set('X-WebTorrent-Gateway', gatewayStreamUrl);
  headers.set('Location', gatewayStreamUrl);

  return new NextResponse(null, {
    status: 302,
    headers,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const params = {
    infoHash: searchParams.get('infoHash'),
    file: searchParams.get('file'),
    magnet: searchParams.get('magnet'),
    name: searchParams.get('name'),
  };
  return handleStreamRequest(req, params);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { searchParams } = req.nextUrl;
  const params = {
    infoHash: body.infoHash || searchParams.get('infoHash'),
    file: body.file || searchParams.get('file'),
    magnet: body.magnet || searchParams.get('magnet'),
    name: body.name || searchParams.get('name'),
  };
  return handleStreamRequest(req, params);
}
