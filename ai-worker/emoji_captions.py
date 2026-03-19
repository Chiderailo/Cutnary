from openai import OpenAI

client = OpenAI(api_key="YOUR_API_KEY")

def add_emojis_to_transcript(transcript):

    prompt = f"""
Add appropriate emojis to this transcript to increase engagement
for short-form video captions.

Transcript:
{transcript}
"""

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt
    )

    return response.output_text