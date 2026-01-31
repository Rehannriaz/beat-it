from pydantic import BaseModel
from typing import Optional


class AudioFeatures(BaseModel):
    bpm: float
    duration: float
    beat_times: list[float]
    downbeat_times: list[float]
    onset_times: list[float]
    onset_strengths: list[float]
    energy_curve: list[float]
    energy_segments: list[dict]  # {start, end, level}
    bass_energy: list[float]
    mid_energy: list[float]
    high_energy: list[float]
    segments: list[dict]  # {start, end, label}
    intensity_curve: list[float]
