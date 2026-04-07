"""
API utilities: retry with exponential backoff and rate limiting.
"""

import logging
import time

logger = logging.getLogger(__name__)

_LAST_API_CALL = 0.0
MIN_API_INTERVAL = 0.5  # seconds between calls


def call_with_retry(func, max_retries=3, base_delay=2):
    """Execute func with retry on failure. Exponential backoff between retries."""
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            delay = base_delay * (2**attempt)
            logger.warning(
                "API call failed (attempt %d/%d): %s. Retrying in %ds...",
                attempt + 1,
                max_retries,
                e,
                delay,
            )
            time.sleep(delay)
    return None


def rate_limited_call(func):
    """Ensure minimum interval between API calls to avoid rate limits."""
    global _LAST_API_CALL
    elapsed = time.time() - _LAST_API_CALL
    if elapsed < MIN_API_INTERVAL:
        sleep_time = MIN_API_INTERVAL - elapsed
        time.sleep(sleep_time)
    result = func()
    _LAST_API_CALL = time.time()
    return result
