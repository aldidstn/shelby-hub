import { PutObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { s3, S3_BUCKET } from '../_client'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file              = formData.get('file') as File | null
    const key               = formData.get('key') as string | null
    const expirationSeconds = formData.get('expirationSeconds') as string | null

    if (!file || !key || !expirationSeconds) {
      return NextResponse.json({ error: 'Missing file, key, or expirationSeconds' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
      Metadata: { 'expiration-seconds': expirationSeconds },
    }))

    return NextResponse.json({ bucket: S3_BUCKET, key })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
