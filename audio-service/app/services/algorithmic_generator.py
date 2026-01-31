from datetime import datetime, timezone
from typing import Literal
import random

from ..models import AudioFeatures, GamePattern, TileData, PatternMetadata, PatternSettings


DIFFICULTY_CONFIG = {
    "easy": {
        "min_spacing": 0.5,
        "intensity_threshold": 0.3,
        "onset_threshold": 0.7,
        "tile_speed": 6,
        "allow_holds": False,
        "allow_rapids": False,
    },
    "medium": {
        "min_spacing": 0.3,
        "intensity_threshold": 0.2,
        "onset_threshold": 0.5,
        "tile_speed": 8,
        "allow_holds": True,
        "allow_rapids": False,
    },
    "hard": {
        "min_spacing": 0.15,
        "intensity_threshold": 0.1,
        "onset_threshold": 0.3,
        "tile_speed": 10,
        "allow_holds": True,
        "allow_rapids": True,
    },
    "expert": {
        "min_spacing": 0.08,
        "intensity_threshold": 0.0,
        "onset_threshold": 0.2,
        "tile_speed": 12,
        "allow_holds": True,
        "allow_rapids": True,
    },
}

SEGMENT_MODIFIERS = {
    "intro": {"density": 0.5, "complexity": "simple"},
    "verse": {"density": 0.7, "complexity": "normal"},
    "chorus": {"density": 1.2, "complexity": "complex"},
    "bridge": {"density": 0.6, "complexity": "normal"},
    "outro": {"density": 0.4, "complexity": "simple"},
}


class AlgorithmicPatternGenerator:
    def __init__(self, features: AudioFeatures, difficulty: str):
        self.features = features
        self.difficulty = difficulty
        self.config = DIFFICULTY_CONFIG.get(difficulty, DIFFICULTY_CONFIG["medium"])
        self.duration = features.duration

    def generate(
        self,
        song_id: str,
        title: str,
        artist: str,
    ) -> GamePattern:
        candidates = self._build_candidates()
        filtered = self._filter_candidates(candidates)
        tiles = self._create_tiles(filtered)

        metadata = PatternMetadata(
            songId=song_id,
            songTitle=title,
            artist=artist,
            duration=self.duration,
            bpm=self.features.bpm,
            difficulty=self.difficulty,
            generatedAt=datetime.now(timezone.utc).isoformat(),
            generatorVersion="algorithmic-v1",
        )

        settings = PatternSettings(
            laneCount=4,
            hitZoneY=-8,
            hitTolerance=0.15,
            tileSpeed=self.config["tile_speed"],
            spawnOffset=12,
            playbackSpeed=1.0,
        )

        return GamePattern(
            version="1.0",
            metadata=metadata,
            settings=settings,
            tiles=tiles,
        )

    def _build_candidates(self) -> list[dict]:
        candidates = []

        for t in self.features.beat_times:
            is_downbeat = any(abs(t - db) < 0.05 for db in self.features.downbeat_times)
            candidates.append({
                "time": t,
                "source": "beat",
                "strength": 0.8 if is_downbeat else 0.6,
                "is_downbeat": is_downbeat,
            })

        for t, strength in zip(self.features.onset_times, self.features.onset_strengths):
            if not any(abs(t - c["time"]) < 0.05 for c in candidates):
                candidates.append({
                    "time": t,
                    "source": "onset",
                    "strength": strength,
                    "is_downbeat": False,
                })

        candidates.sort(key=lambda x: x["time"])
        return candidates

    def _get_intensity_at(self, time: float) -> float:
        if not self.features.intensity_curve:
            return 0.5
        idx = int(time / self.duration * len(self.features.intensity_curve))
        idx = max(0, min(idx, len(self.features.intensity_curve) - 1))
        return self.features.intensity_curve[idx]

    def _get_segment_at(self, time: float) -> str:
        for seg in self.features.segments:
            if seg["start"] <= time <= seg["end"]:
                return seg["label"]
        return "verse"

    def _get_effective_thresholds(self, time: float) -> dict:
        segment = self._get_segment_at(time)
        modifier = SEGMENT_MODIFIERS.get(segment, SEGMENT_MODIFIERS["verse"])

        base_intensity = self.config["intensity_threshold"]
        effective_intensity = base_intensity / modifier["density"] if modifier["density"] > 0 else base_intensity

        return {
            "intensity_threshold": effective_intensity,
            "allow_holds": self.config["allow_holds"] and modifier["complexity"] != "simple",
            "allow_rapids": self.config["allow_rapids"] and modifier["complexity"] == "complex",
        }

    def _filter_candidates(self, candidates: list[dict]) -> list[dict]:
        filtered = []
        last_time = -999

        for c in candidates:
            if c["time"] - last_time < self.config["min_spacing"]:
                if not c.get("is_downbeat"):
                    continue

            intensity = self._get_intensity_at(c["time"])
            thresholds = self._get_effective_thresholds(c["time"])

            if c.get("is_downbeat"):
                filtered.append({**c, "intensity": intensity, **thresholds})
                last_time = c["time"]
                continue

            if c["source"] == "beat" and intensity >= thresholds["intensity_threshold"]:
                filtered.append({**c, "intensity": intensity, **thresholds})
                last_time = c["time"]
                continue

            if c["source"] == "onset":
                if c["strength"] >= self.config["onset_threshold"] and intensity >= thresholds["intensity_threshold"]:
                    filtered.append({**c, "intensity": intensity, **thresholds})
                    last_time = c["time"]

        return filtered

    def _get_lane(self, time: float, recent_lanes: list[int]) -> int:
        if not self.features.bass_energy:
            return random.randint(0, 3)

        idx = int(time / self.duration * len(self.features.bass_energy))
        idx = max(0, min(idx, len(self.features.bass_energy) - 1))

        bass = self.features.bass_energy[idx]
        mid = self.features.mid_energy[idx] if self.features.mid_energy else 0
        high = self.features.high_energy[idx] if self.features.high_energy else 0

        total = bass + mid + high + 0.001
        bass_ratio = bass / total
        mid_ratio = mid / total
        high_ratio = high / total

        if bass_ratio > 0.5:
            lane = 0
        elif high_ratio > 0.4:
            lane = 3
        elif mid_ratio > 0.4:
            lane = random.choice([1, 2])
        else:
            lane = int(time * 7) % 4

        if len(recent_lanes) >= 2 and recent_lanes[-1] == recent_lanes[-2] == lane:
            available = [l for l in range(4) if l != lane]
            lane = random.choice(available)

        return lane

    def _get_tile_type(self, time: float, allow_holds: bool, allow_rapids: bool) -> tuple[str, dict]:
        intensity_now = self._get_intensity_at(time)
        intensity_before = self._get_intensity_at(max(0, time - 0.3))
        intensity_after = self._get_intensity_at(min(self.duration, time + 0.3))

        if allow_rapids and intensity_now > intensity_before + 0.3 and intensity_now > 0.7:
            return "rapid", {
                "rapidCount": random.randint(2, 4),
                "rapidInterval": 0.1,
            }

        if allow_holds and intensity_now > 0.5 and intensity_after > 0.5:
            hold_duration = 0.3
            for offset in [0.4, 0.6, 0.8, 1.0, 1.2, 1.5, 2.0]:
                future_intensity = self._get_intensity_at(min(self.duration, time + offset))
                if future_intensity > 0.4:
                    hold_duration = offset
                else:
                    break

            if hold_duration >= 0.4:
                return "hold", {
                    "holdDuration": min(hold_duration, 2.0),
                }

        return "normal", {}

    def _create_tiles(self, candidates: list[dict]) -> list[TileData]:
        tiles = []
        recent_lanes = []

        for i, c in enumerate(candidates):
            lane = self._get_lane(c["time"], recent_lanes)
            recent_lanes.append(lane)
            if len(recent_lanes) > 3:
                recent_lanes.pop(0)

            tile_type, type_extras = self._get_tile_type(
                c["time"],
                c.get("allow_holds", False),
                c.get("allow_rapids", False),
            )

            beat_strength = min(1.0, max(0.3, c["intensity"] * 0.7 + c["strength"] * 0.3))

            tile = TileData(
                id=f"tile-{i}",
                time=round(c["time"], 3),
                lane=lane,
                type=tile_type,
                beatStrength=round(beat_strength, 2),
                holdDuration=type_extras.get("holdDuration"),
                rapidCount=type_extras.get("rapidCount"),
                rapidInterval=type_extras.get("rapidInterval"),
            )
            tiles.append(tile)

        return tiles


def generate_algorithmic_pattern(
    features: AudioFeatures,
    song_id: str,
    title: str,
    artist: str,
    difficulty: str,
) -> GamePattern:
    generator = AlgorithmicPatternGenerator(features, difficulty)
    return generator.generate(song_id, title, artist)
