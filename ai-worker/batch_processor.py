import multiprocessing
from worker import process_video


def process_batch(video_urls, workers=3):

    print("\nStarting batch processing...")
    print("Total videos:", len(video_urls))

    pool = multiprocessing.Pool(workers)

    pool.map(process_video, video_urls)

    pool.close()
    pool.join()

    print("\nBatch processing finished.")