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
