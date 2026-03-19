from openai import OpenAI
import json

client = OpenAI(api_key="YOUR_API_KEY")


def detect_emotional_hooks(transcript):

    prompt = f"""
Analyze this transcript and find the most viral moments.

Score each segment using:

- emotional intensity
- curiosity
- surprise
- storytelling hook

Return JSON like:

[
  {{"start":10,"end":20,"emotion_score":92}},
  {{"start":35,"end":48,"emotion_score":88}},
  {{"start":60,"end":75,"emotion_score":85}}
]

Transcript:
{transcript}
"""

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt
    )

    text = response.output_text

    try:
        return json.loads(text)

    except:
        return [{"start":5,"end":15,"emotion_score":70}]