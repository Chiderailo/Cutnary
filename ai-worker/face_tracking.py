import cv2

def detect_face_center(video_path):

    cap = cv2.VideoCapture(video_path)

    face = cv2.CascadeClassifier(
        cv2.data.haarcascades +
        "haarcascade_frontalface_default.xml"
    )

    centers = []

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

        for (x, y, w, h) in faces:

            center_x = x + w/2
            centers.append(center_x)

    cap.release()

    if not centers:
        return None

    return sum(centers) / len(centers)