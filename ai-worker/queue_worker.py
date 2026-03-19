from rq import Worker, Queue, Connection
import redis
from worker import process_video

redis_conn = redis.Redis()

with Connection(redis_conn):

    worker = Worker(
        [Queue("videos")]
    )

    worker.work()