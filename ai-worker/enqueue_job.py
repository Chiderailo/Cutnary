import redis
from rq import Queue
from worker import process_video

redis_conn = redis.Redis()
q = Queue("videos", connection=redis_conn)

url = input("Video URL: ")

job = q.enqueue(process_video, url)

print("Job queued:", job.id)