import { NextResponse } from 'next/server';
import { route } from '@/server/http/route';
import { storageService } from '@/server/services/storageService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/images/<folder>/<uuid>.<ext> — serves an uploaded image from R2.
 * Used when the bucket has no public URL. Keys are random and never reused,
 * so the response can be cached for a long time.
 */
export const GET = route<{ key: string[] }>(async (_request, { params }) => {
  const image = await storageService.read(params.key.join('/'));
  if (!image) return new NextResponse(null, { status: 404 });
  return new NextResponse(image.body as ReadableStream, {
    headers: {
      'Content-Type': image.contentType,
      ...(image.size ? { 'Content-Length': String(image.size) } : {}),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
