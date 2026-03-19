/*
|--------------------------------------------------------------------------
| Cloudflare R2 Storage Service
|--------------------------------------------------------------------------
|
| R2 is Cloudflare's S3-compatible object storage. It uses the same API as
| AWS S3, so we use @aws-sdk/client-s3 with R2-specific endpoint and credentials.
|
| HOW R2 WORKS:
| - Endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
| - Region: "auto" (required by SDK, R2 is global)
| - Credentials: Access Key ID + Secret Access Key (from Cloudflare R2 API tokens)
| - Bucket: Your R2 bucket name
| - Public URL: Enable "Public access" on the bucket, then use the provided
|   R2 dev URL (pub-xxx.r2.dev) or a custom domain you attach.
|
| HOW TO GET R2 CREDENTIALS (Cloudflare Dashboard):
| 1. Log in at https://dash.cloudflare.com
| 2. Go to R2 Object Storage (left sidebar)
| 3. Click "Manage R2 API Tokens"
| 4. Create API token → select "Object Read & Write" for your bucket
| 5. Copy the Access Key ID and Secret Access Key (secret is shown once only!)
| 6. Account ID: Dashboard → R2 → right sidebar or URL (between / and /r2)
| 7. Bucket name: Create or select a bucket
| 8. Public URL: Bucket Settings → Public access → enable and copy the URL
|
*/

import { createReadStream } from 'node:fs'
import type { ReadStream } from 'node:fs'
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import env from '#start/env'

let _s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!_s3Client) {
    const accountId = env.get('R2_ACCOUNT_ID')
    const accessKey = env.get('R2_ACCESS_KEY')
    const secretKey = env.get('R2_SECRET_KEY')
    if (!accountId || !accessKey || !secretKey) {
      throw new Error(
        'R2 storage not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY in .env'
      )
    }
    _s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    })
  }
  return _s3Client
}

/**
 * Upload a file from disk to R2 and return its public URL.
 *
 * @param filePath - Local filesystem path to the file
 * @param fileName - Key/name to store in R2 (use for public URL)
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(
  filePath: string,
  fileName: string
): Promise<string> {
  const bucket = env.get('R2_BUCKET_NAME')
  const publicUrl = env.get('R2_PUBLIC_URL')
  if (!bucket || !publicUrl) {
    throw new Error(
      'R2 storage not configured. Set R2_BUCKET_NAME and R2_PUBLIC_URL in .env'
    )
  }

  const body = createReadStream(filePath) as ReadStream & { size?: number }

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: body,
    })
  )

  const base = publicUrl.replace(/\/$/, '')
  return `${base}/${fileName}`
}

/**
 * Delete a file from R2 by its key.
 *
 * @param fileName - Key/name of the file in R2
 */
export async function deleteFile(fileName: string): Promise<void> {
  const bucket = env.get('R2_BUCKET_NAME')
  if (!bucket) {
    throw new Error(
      'R2 storage not configured. Set R2_BUCKET_NAME in .env'
    )
  }
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: fileName,
    })
  )
}
