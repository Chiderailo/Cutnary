# Transcript Worker – Video Transcript with Speaker Diarization

Processes transcript jobs from the `transcript_jobs` Redis queue. Downloads audio only (faster, smaller), transcribes with OpenAI Whisper API, and optionally runs AssemblyAI speaker diarization.

## Prerequisites

- Python 3.11+
- Redis running locally or via REDIS_HOST/REDIS_PORT
- ffmpeg
- yt-dlp

## Setup

```bash
cd ai-worker
pip install -r requirements.txt
```

## Environment (ai-worker/.env)

| Variable            | Required | Description                                    |
|---------------------|----------|------------------------------------------------|
| OPENAI_API_KEY      | Yes      | OpenAI API key for Whisper transcription       |
| ASSEMBLYAI_API_KEY  | Yes*     | AssemblyAI API key for speaker diarization (*required if speaker_separation=true) |
| BACKEND_URL         | Yes      | Backend base URL (e.g. http://localhost:3333)  |
| REDIS_HOST          | No       | Default: localhost                             |
| REDIS_PORT          | No       | Default: 6379                                  |

**AssemblyAI API key:** Get a free API key at [assemblyai.com](https://assemblyai.com). Add it to `ai-worker/.env` as `ASSEMBLYAI_API_KEY=your_key_here`.

## Run

```bash
cd ai-worker
py -3.11 transcript_worker.py
```

Or with `python`:

```bash
cd ai-worker
python transcript_worker.py
```

The worker listens on `bull:transcript_jobs:wait`. Ensure Redis is running and the backend is pushing jobs to the `transcript_jobs` queue.
