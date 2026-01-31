from pydantic import BaseModel
from typing import Optional, Literal


class AnalyzeRequest(BaseModel):
    audio_url: str


class GeneratePatternRequest(BaseModel):
    audio_url: str
    title: str
    artist: str
    difficulty: Literal["easy", "medium", "hard", "expert"]
    song_id: str
    provider: Optional[Literal["openai", "gemini"]] = None
