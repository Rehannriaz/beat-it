from typing import Literal
from ..models import AudioFeatures, GamePattern
from .ai_providers import OpenAIProvider, GeminiProvider
from .algorithmic_generator import generate_algorithmic_pattern
from ..config import get_settings


async def generate_pattern(
    features: AudioFeatures,
    song_id: str,
    title: str,
    artist: str,
    difficulty: str,
    provider: Literal["openai", "gemini", "algorithmic"] | None = None,
) -> GamePattern:
    """Generate a game pattern using the specified provider."""
    settings = get_settings()
    provider_name = provider or settings.default_ai_provider

    if provider_name == "algorithmic":
        return generate_algorithmic_pattern(
            features=features,
            song_id=song_id,
            title=title,
            artist=artist,
            difficulty=difficulty,
        )

    if provider_name == "openai":
        ai_provider = OpenAIProvider()
    elif provider_name == "gemini":
        ai_provider = GeminiProvider()
    else:
        raise ValueError(f"Unknown provider: {provider_name}")

    return await ai_provider.generate_pattern(
        features=features,
        song_id=song_id,
        title=title,
        artist=artist,
        difficulty=difficulty,
    )
