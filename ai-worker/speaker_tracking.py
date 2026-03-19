import cv2

def detect_speaker_positions(video_path):

    cap = cv2.VideoCapture(video_path)

    face = cv2.CascadeClassifier(
        cv2.data.haarcascades +
        "haarcascade_frontalface_default.xml"
    )

    frame_positions = []

    frame_index = 0

    while True:

        ret, frame = cap.read()

        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        faces = face.detectMultiScale(
            gray,
            scaleFactor=1.3,
            minNeighbors=5
        )

        centers = []

        for (x, y, w, h) in faces:

            center_x = x + w / 2
            centers.append(center_x)

        if centers:
            frame_positions.append((frame_index, centers))

        frame_index += 1

    cap.release()

    return frame_positions