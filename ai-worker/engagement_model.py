import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).parent / ".env")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def predict_engagement(transcript):

    prompt = f"""
Score how likely this clip is to go viral on TikTok.

Consider:
- emotional intensity
- curiosity
- relatability
- storytelling hook

Return JSON:

{{
  "score": number_between_0_and_100,
  "reason": "short explanation"
}}

Transcript:
{transcript}
"""

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt
    )

    return response.output_text