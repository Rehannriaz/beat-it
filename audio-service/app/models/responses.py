from pydantic import BaseModel
from typing import Optional, Literal
from .audio_features import AudioFeatures


class AnalyzeResponse(BaseModel):
    success: bool
    features: Optional[AudioFeatures] = None
    error: Optional[str] = None


class TileData(BaseModel):
    id: str
    time: float
    lane: int
    type: Literal["normal", "hold", "rapid"]
    beatStrength: float
    holdDuration: Optional[float] = None
    rapidCount: Optional[int] = None
    rapidInterval: Optional[float] = None


class PatternMetadata(BaseModel):
    songId: str
    songTitle: str
    artist: str
    duration: float
    bpm: float
    difficulty: str
    generatedAt: str
    generatorVersion: str


class PatternSettings(BaseModel):
    laneCount: int = 4
    hitZoneY: float = -8
    hitTolerance: float = 0.15
    tileSpeed: float = 8
    spawnOffset: float = 12
    playbackSpeed: float = 1.0


class GamePattern(BaseModel):
    version: str = "1.0"
    metadata: PatternMetadata
    settings: PatternSettings
    tiles: list[TileData]


class GeneratePatternResponse(BaseModel):
    success: bool
    pattern: Optional[GamePattern] = None
    error: Optional[str] = None
