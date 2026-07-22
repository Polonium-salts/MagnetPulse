import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: '1.0.0',
    service: 'Torrent to Magnet Parser API',
    timestamp: new Date().toISOString()
  });
}
