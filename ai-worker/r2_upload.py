"""
Cloudflare R2 upload using boto3 S3-compatible API.
Uploads generated clips and renders to R2 and returns public URLs.
"""

import logging
import os
from pathlib import Path

import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

logger = logging.getLogger(__name__)

R2_ENDPOINT = os.getenv("R2_ENDPOINT")
R2_ACCESS_KEY = os.getenv("R2_ACCESS_KEY")
R2_SECRET_KEY = os.getenv("R2_SECRET_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL")


def _get_client():
    """Get boto3 S3 client configured for R2."""
    if not all([R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL]):
        return None
    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        region_name="auto",
    )


def upload_to_r2(
    local_path: str,
    filename: str | None = None,
    content_type: str = "video/mp4",
) -> str | None:
    """
    Upload a file to Cloudflare R2 bucket.

    Args:
        local_path: Path to the local file
        filename: Object key in R2 (defaults to basename of local_path)

    Returns:
        Public URL of the uploaded file, or None if upload fails
    """
    client = _get_client()
    if not client:
        return None

    path = Path(local_path)
    if not path.exists():
        logger.warning("File not found for R2 upload: %s", local_path)
        return None

    key = filename or path.name
    public_base = R2_PUBLIC_URL.rstrip("/")

    try:
        client.upload_file(
            str(path),
            R2_BUCKET_NAME,
            key,
            ExtraArgs={"ContentType": content_type},
        )
        return f"{public_base}/{key}"
    except ClientError as e:
        logger.warning("R2 upload failed for %s: %s", local_path, e)
        return None
    except Exception as e:
        logger.warning("R2 upload error for %s: %s", local_path, e)
        return None
