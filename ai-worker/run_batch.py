from batch_processor import process_batch

videos = [

    "https://youtube.com/video1",
    "https://youtube.com/video2",
    "https://youtube.com/video3",
    "https://youtube.com/video4"

]

process_batch(videos, workers=4)