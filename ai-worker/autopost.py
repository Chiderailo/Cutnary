import requests

def upload_to_tiktok(video_path, access_token):

    url = "https://open.tiktokapis.com/v2/post/publish/"

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    files = {
        "video": open(video_path, "rb")
    }

    response = requests.post(url, headers=headers, files=files)

    return response.json()