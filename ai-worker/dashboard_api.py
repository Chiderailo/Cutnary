from fastapi import FastAPI
import redis
from rq import Queue
from worker import process_video

app = FastAPI()

redis_conn = redis.Redis()
queue = Queue("videos", connection=redis_conn)

@app.post("/submit")

def submit_video(url: str):

    job = queue.enqueue(process_video, url)

    return {
        "job_id": job.id,
        "status": "queued"
    }