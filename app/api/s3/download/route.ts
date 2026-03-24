import { GetObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { s3, S3_BUCKET } from '../_client'

export async function GET(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get('key')
    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 })
    }

    const range = req.headers.get('range') ?? undefined

    const result = await s3.send(new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ...(range ? { Range: range } : {}),
    }))

    const headers: Record<string, string> = {
      'Content-Type': result.ContentType ?? 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    }

    if (result.ContentRange)  headers['Content-Range']  = result.ContentRange
    if (result.ContentLength) headers['Content-Length'] = String(result.ContentLength)

    const filename = key.split('/').pop() ?? 'download'
    if (req.nextUrl.searchParams.has('dl')) {
      headers['Content-Disposition'] = `attachment; filename="${filename}"`
    }

    const status = range ? 206 : 200
    return new NextResponse(result.Body as ReadableStream, { status, headers })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Download failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
