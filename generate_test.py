import asyncio
import edge_tts

TEXT = "Hello, this is a test audio message to verify the transcription using Whisper."
OUTPUT_FILE = "sample.mp3"

async def generate():
    communicate = edge_tts.Communicate(TEXT, voice="en-US-GuyNeural")
    await communicate.save(OUTPUT_FILE)

asyncio.run(generate())
