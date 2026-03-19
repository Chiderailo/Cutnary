from openai import OpenAI

client = OpenAI(api_key="YOUR_API_KEY")

def generate_title(transcript):

    prompt = f"""
Create a viral short-form video title
and caption for this transcript.

Transcript:
{transcript}
"""

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt
    )

    return response.output_text