import json
from datetime import datetime, timezone
import google.generativeai as genai
from .base import AIProvider
from ...models import AudioFeatures, GamePattern
from ...config import get_settings


class GeminiProvider(AIProvider):
    def __init__(self):
        settings = get_settings()
        genai.configure(api_key=settings.gemini_api_key)
        self.model = genai.GenerativeModel("gemini-1.5-pro")

    async def generate_pattern(
        self,
        features: AudioFeatures,
        song_id: str,
        title: str,
        artist: str,
        difficulty: str,
    ) -> GamePattern:
        prompt = self._build_prompt(features, title, artist, difficulty)

        system_instruction = "You are a rhythm game pattern generator. Generate precise, playable patterns that sync with the music. Output valid JSON only, no markdown formatting."

        full_prompt = f"{system_instruction}\n\n{prompt}\n\nRespond with ONLY the JSON object, no code blocks or explanation."

        response = await self.model.generate_content_async(
            full_prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.7,
                max_output_tokens=16000,
            ),
        )

        content = response.text
        data = json.loads(content)

        # Ensure metadata is correct
        data["metadata"]["songId"] = song_id
        data["metadata"]["songTitle"] = title
        data["metadata"]["artist"] = artist
        data["metadata"]["duration"] = features.duration
        data["metadata"]["bpm"] = features.bpm
        data["metadata"]["difficulty"] = difficulty
        data["metadata"]["generatedAt"] = datetime.now(timezone.utc).isoformat()
        data["metadata"]["generatorVersion"] = "ai-gemini-v1"

        return GamePattern(**data)
