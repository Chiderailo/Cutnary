"""
Social media auto-posting: YouTube Shorts, TikTok, Instagram Reels, Facebook Reels.
"""

import json
import logging
import os
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

logger = logging.getLogger(__name__)


def post_to_youtube(
    video_path: str,
    title: str,
    description: str,
    tags: list[str],
    access_token: str,
) -> dict:
    """Post video to YouTube as a Short."""
    init_url = "https://www.googleapis.com/youtube/v3/videos"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/mp4",
    }

    metadata = {
        "snippet": {
            "title": title[:100],
            "description": description[:5000],
            "tags": tags[:10],
            "categoryId": "22",
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False,
        },
    }

    init_response = requests.post(
        f"{init_url}?part=snippet,status&uploadType=resumable",
        headers=headers,
        json=metadata,
        timeout=30,
    )

    if not init_response.ok:
        raise Exception(f"YouTube init failed: {init_response.text}")

    upload_url = init_response.headers.get("Location")
    if not upload_url:
        raise Exception("YouTube init did not return upload URL")

    with open(video_path, "rb") as f:
        video_data = f.read()

    upload_response = requests.put(
        upload_url,
        headers={"Content-Type": "video/mp4"},
        data=video_data,
        timeout=600,
    )

    if not upload_response.ok:
        raise Exception(f"YouTube upload failed: {upload_response.text}")

    result = upload_response.json()
    video_id = result.get("id")

    return {
        "platform": "youtube",
        "video_id": video_id,
        "url": f"https://www.youtube.com/shorts/{video_id}",
        "status": "published",
    }


def post_to_tiktok(
    video_path: str,
    title: str,
    access_token: str,
) -> dict:
    """Post video to TikTok."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    init_url = "https://open.tiktokapis.com/v2/post/publish/video/init/"
    file_size = os.path.getsize(video_path)

    init_data = {
        "post_info": {
            "title": title[:150],
            "privacy_level": "PUBLIC_TO_EVERYONE",
            "disable_duet": False,
            "disable_comment": False,
            "disable_stitch": False,
        },
        "source_info": {
            "source": "FILE_UPLOAD",
            "video_size": file_size,
            "chunk_size": file_size,
            "total_chunk_count": 1,
        },
    }

    init_response = requests.post(init_url, headers=headers, json=init_data, timeout=30)

    if not init_response.ok:
        raise Exception(f"TikTok init failed: {init_response.text}")

    data = init_response.json().get("data", {})
    upload_url = data.get("upload_url")
    publish_id = data.get("publish_id")

    if not upload_url:
        raise Exception("TikTok init did not return upload URL")

    with open(video_path, "rb") as f:
        upload_response = requests.put(
            upload_url,
            headers={
                "Content-Type": "video/mp4",
                "Content-Range": f"bytes 0-{file_size - 1}/{file_size}",
            },
            data=f,
            timeout=600,
        )

    if not upload_response.ok:
        raise Exception(f"TikTok upload failed: {upload_response.text}")

    return {
        "platform": "tiktok",
        "publish_id": publish_id,
        "status": "published",
    }


def post_to_instagram(
    video_url: str,
    caption: str,
    access_token: str,
    instagram_account_id: str,
) -> dict:
    """Post video to Instagram as a Reel. Video must be publicly accessible URL."""
    import time

    base_url = f"https://graph.facebook.com/v18.0/{instagram_account_id}"

    container_response = requests.post(
        f"{base_url}/media",
        data={
            "media_type": "REELS",
            "video_url": video_url,
            "caption": caption[:2200],
            "access_token": access_token,
        },
        timeout=30,
    )

    if not container_response.ok:
        raise Exception(f"Instagram container failed: {container_response.text}")

    container_id = container_response.json().get("id")
    if not container_id:
        raise Exception("Instagram container did not return id")

    for _ in range(10):
        status_response = requests.get(
            f"https://graph.facebook.com/v18.0/{container_id}",
            params={"fields": "status_code", "access_token": access_token},
            timeout=10,
        )
        status = status_response.json().get("status_code")
        if status == "FINISHED":
            break
        time.sleep(3)

    publish_response = requests.post(
        f"{base_url}/media_publish",
        data={"creation_id": container_id, "access_token": access_token},
        timeout=30,
    )

    if not publish_response.ok:
        raise Exception(f"Instagram publish failed: {publish_response.text}")

    media_id = publish_response.json().get("id")

    return {
        "platform": "instagram",
        "media_id": media_id,
        "status": "published",
    }


def post_to_facebook(
    video_path: str,
    description: str,
    access_token: str,
    page_id: str,
) -> dict:
    """Post video to Facebook as a Reel."""
    init_response = requests.post(
        f"https://graph.facebook.com/v18.0/{page_id}/video_reels",
        data={"upload_phase": "start", "access_token": access_token},
        timeout=30,
    )

    if not init_response.ok:
        raise Exception(f"Facebook init failed: {init_response.text}")

    data = init_response.json()
    upload_session_id = data.get("upload_session_id")
    video_id = data.get("video_id")

    if not upload_session_id or not video_id:
        raise Exception("Facebook init did not return upload_session_id or video_id")

    file_size = os.path.getsize(video_path)

    with open(video_path, "rb") as f:
        upload_response = requests.post(
            f"https://rupload.facebook.com/video-upload/v18.0/{upload_session_id}",
            headers={
                "Authorization": f"OAuth {access_token}",
                "offset": "0",
                "file_size": str(file_size),
            },
            data=f,
            timeout=600,
        )

    if not upload_response.ok:
        raise Exception(f"Facebook upload failed: {upload_response.text}")

    publish_response = requests.post(
        f"https://graph.facebook.com/v18.0/{page_id}/video_reels",
        data={
            "video_id": video_id,
            "upload_phase": "finish",
            "video_state": "PUBLISHED",
            "description": description[:63206],
            "access_token": access_token,
        },
        timeout=30,
    )

    if not publish_response.ok:
        raise Exception(f"Facebook publish failed: {publish_response.text}")

    return {
        "platform": "facebook",
        "video_id": video_id,
        "status": "published",
    }


def generate_hashtags(script: str, platform: str) -> list[str]:
    """Use Gemini to generate viral hashtags."""
    import google.generativeai as genai

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return ["viral", "trending", "fyp", "reels", "shorts"]

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    limits = {"tiktok": 5, "instagram": 30, "youtube": 10, "facebook": 10}
    limit = limits.get(platform, 10)

    try:
        response = model.generate_content(
            f"""Generate {limit} viral hashtags for this {platform} video content.
Content: {script[:300]}
Return ONLY a JSON array of hashtags without # symbol.
Example: ["viral", "trending", "fyp"]""",
            timeout=15,
        )
        text = response.text.strip()
        if "```" in text:
            for part in text.split("```"):
                part = part.replace("json", "").strip()
                if part.startswith("["):
                    return json.loads(part)
        return json.loads(text)
    except Exception as e:
        logger.warning("Hashtag generation failed: %s", e)
        return ["viral", "trending", "fyp", "reels", "shorts"]
