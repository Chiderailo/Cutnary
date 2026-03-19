import multiprocessing


def run_parallel(tasks, worker_fn):

    pool = multiprocessing.Pool(
        processes=min(len(tasks), multiprocessing.cpu_count())
    )

    results = pool.map(worker_fn, tasks)

    pool.close()
    pool.join()

    return results