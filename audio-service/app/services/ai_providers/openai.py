import json
from datetime import datetime, timezone
from openai import AsyncOpenAI
from .base import AIProvider
from ...models import AudioFeatures, GamePattern
from ...config import get_settings


class OpenAIProvider(AIProvider):
    def __init__(self):
        settings = get_settings()
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def generate_pattern(
        self,
        features: AudioFeatures,
        song_id: str,
        title: str,
        artist: str,
        difficulty: str,
    ) -> GamePattern:
        prompt = self._build_prompt(features, title, artist, difficulty)

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a rhythm game pattern generator. Generate precise, playable patterns that sync with the music. Output valid JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "game_pattern",
                    "strict": True,
                    "schema": self._get_json_schema(),
                },
            },
            temperature=0.7,
            max_tokens=16000,
        )

        content = response.choices[0].message.content
        data = json.loads(content)

        # Ensure metadata is correct
        data["metadata"]["songId"] = song_id
        data["metadata"]["songTitle"] = title
        data["metadata"]["artist"] = artist
        data["metadata"]["duration"] = features.duration
        data["metadata"]["bpm"] = features.bpm
        data["metadata"]["difficulty"] = difficulty
        data["metadata"]["generatedAt"] = datetime.now(timezone.utc).isoformat()
        data["metadata"]["generatorVersion"] = "ai-openai-v1"

        return GamePattern(**data)
