# Cutnary Backend API

AdonisJS REST API for video processing with BullMQ and Redis.

## Quick Start

```bash
npm install
npm run dev
```

Server runs at http://localhost:3333

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/process-video` | Submit video for AI processing |
| GET | `/api/job/:id` | Get job status and details |
| GET | `/api/clips/:jobId` | Get clips for a completed job |
| POST | `/api/job/:id/complete` | Worker callback (Python AI worker) |

## Environment

Set in `.env`:

- `REDIS_HOST` - Redis host (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` - Cloudflare R2 (optional)

### Cloudflare R2 Credentials

1. Log in at https://dash.cloudflare.com
2. Go to **R2 Object Storage** (left sidebar)
3. Click **Manage R2 API Tokens**
4. **Create API token** → select "Object Read & Write" for your bucket
5. Copy the **Access Key ID** and **Secret Access Key** (secret is shown once only!)
6. **Account ID**: visible in the R2 dashboard URL or right sidebar
7. **Bucket name**: create or select a bucket
8. **Public URL**: Bucket Settings → Public access → enable and copy the URL (e.g. `https://pub-xxx.r2.dev`)

## Python AI Worker Integration

1. **Consume jobs**: Connect to the same Redis and listen to the `video_jobs` queue (BullMQ).
2. **Report completion**: Call `POST /api/job/:id/complete` when done:

```json
{
  "status": "completed",
  "clips": [
    {
      "url": "https://...",
      "start_time": 0,
      "end_time": 30,
      "description": "Clip description"
    }
  ]
}
```

For failures:

```json
{
  "status": "failed",
  "error": "Error message"
}
```
