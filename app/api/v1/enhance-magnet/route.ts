import { NextRequest, NextResponse } from 'next/server';
import { parseMagnetUri, buildMagnetUri, POPULAR_TRACKERS } from '@/src/lib/torrentParser';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { magnetUri, customTrackers, preset } = body;

    if (!magnetUri) {
      return NextResponse.json({ error: '缺少 magnetUri 参数' }, { status: 400 });
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

    return NextResponse.json({
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
    return NextResponse.json({
      success: false,
      error: err.message || '磁力链接处理失败'
    }, { status: 400 });
  }
}
