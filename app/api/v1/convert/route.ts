import { NextRequest, NextResponse } from 'next/server';
import { parseTorrent } from '@/src/lib/torrentParser';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    const results: any[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const files = formData.getAll('files');
      
      for (const file of files) {
        if (file instanceof File) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const parsed = parseTorrent(new Uint8Array(arrayBuffer));
            results.push({
              filename: file.name,
              success: true,
              data: parsed
            });
          } catch (e: any) {
            results.push({
              filename: file.name,
              success: false,
              error: e.message
            });
          }
        }
      }

      // Check if there are urls
      const urlsStr = formData.get('urls') as string;
      if (urlsStr) {
        try {
          const urls = JSON.parse(urlsStr);
          if (Array.isArray(urls)) {
            for (const url of urls) {
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
        } catch {
          // ignore parsing error
        }
      }
    } else {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body.urls)) {
        for (const url of body.urls) {
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
    }

    return NextResponse.json({
      success: true,
      totalProcessed: results.length,
      results
    });

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || '批量转换过程出错'
    }, { status: 500 });
  }
}
