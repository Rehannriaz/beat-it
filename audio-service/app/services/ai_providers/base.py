from abc import ABC, abstractmethod
from ...models import AudioFeatures, GamePattern


class AIProvider(ABC):
    @abstractmethod
    async def generate_pattern(
        self,
        features: AudioFeatures,
        song_id: str,
        title: str,
        artist: str,
        difficulty: str,
    ) -> GamePattern:
        """Generate a game pattern from audio features."""
        pass

    def _build_prompt(
        self,
        features: AudioFeatures,
        title: str,
        artist: str,
        difficulty: str,
    ) -> str:
        """Build the prompt for pattern generation."""

        difficulty_guidelines = {
            "easy": {
                "density": "Place tiles on every 2nd or 4th beat. Keep it sparse.",
                "types": "Use only 'normal' tiles. No holds or rapids.",
                "speed": "tileSpeed should be 6.",
                "lanes": "Prefer lanes 1 and 2 (middle lanes). Avoid rapid lane changes.",
            },
            "medium": {
                "density": "Place tiles on most beats. Moderate density.",
                "types": "Mostly 'normal' tiles. Use 'hold' tiles occasionally on sustained notes.",
                "speed": "tileSpeed should be 8.",
                "lanes": "Use all 4 lanes but group nearby tiles in adjacent lanes.",
            },
            "hard": {
                "density": "Place tiles on beats and some offbeats. Higher density.",
                "types": "Mix of 'normal' and 'hold' tiles. Use 'rapid' tiles on high-energy peaks.",
                "speed": "tileSpeed should be 10.",
                "lanes": "Use all 4 lanes freely. Include some cross-lane patterns.",
            },
            "expert": {
                "density": "Dense patterns on beats, offbeats, and onsets. Maximum intensity.",
                "types": "All tile types. Frequent holds and rapids during intense sections.",
                "speed": "tileSpeed should be 12.",
                "lanes": "Complex patterns across all lanes. Include rapid lane switches.",
            },
        }

        guidelines = difficulty_guidelines.get(difficulty, difficulty_guidelines["medium"])

        # Sample some beat times for the prompt (don't send all of them)
        sample_beats = features.beat_times[:50] if len(features.beat_times) > 50 else features.beat_times
        sample_onsets = features.onset_times[:100] if len(features.onset_times) > 100 else features.onset_times

        prompt = f"""Generate a rhythm game pattern for the song "{title}" by {artist}.

SONG ANALYSIS:
- BPM: {features.bpm:.1f}
- Duration: {features.duration:.1f} seconds
- Beat timestamps (first 50): {sample_beats}
- Onset timestamps (first 100): {sample_onsets}
- Energy segments: {features.energy_segments}
- Song segments: {features.segments}

DIFFICULTY: {difficulty.upper()}
- Density: {guidelines['density']}
- Tile types: {guidelines['types']}
- Speed: {guidelines['speed']}
- Lane usage: {guidelines['lanes']}

RULES:
1. Tiles must be placed at timestamps from beat_times or onset_times
2. Lane numbers are 0, 1, 2, or 3
3. Tile types: "normal" (single tap), "hold" (requires holdDuration 0.3-2.0), "rapid" (requires rapidCount 2-5 and rapidInterval 0.08-0.15)
4. beatStrength should be 0.3-1.0 based on energy level at that moment
5. During "low" energy segments, reduce tile density
6. During "peak" energy segments, increase density and use more holds/rapids
7. Generate tile IDs as "tile-0", "tile-1", etc.
8. Tiles should span the entire song duration
9. Never place two tiles at the exact same time in the same lane

Generate a complete GamePattern JSON object."""

        return prompt

    def _get_json_schema(self) -> dict:
        """Return the JSON schema for structured output."""
        return {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "version": {"type": "string"},
                "metadata": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "songId": {"type": "string"},
                        "songTitle": {"type": "string"},
                        "artist": {"type": "string"},
                        "duration": {"type": "number"},
                        "bpm": {"type": "number"},
                        "difficulty": {"type": "string"},
                        "generatedAt": {"type": "string"},
                        "generatorVersion": {"type": "string"},
                    },
                    "required": ["songId", "songTitle", "artist", "duration", "bpm", "difficulty", "generatedAt", "generatorVersion"],
                },
                "settings": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "laneCount": {"type": "integer"},
                        "hitZoneY": {"type": "number"},
                        "hitTolerance": {"type": "number"},
                        "tileSpeed": {"type": "number"},
                        "spawnOffset": {"type": "number"},
                        "playbackSpeed": {"type": "number"},
                    },
                    "required": ["laneCount", "hitZoneY", "hitTolerance", "tileSpeed", "spawnOffset", "playbackSpeed"],
                },
                "tiles": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "id": {"type": "string"},
                            "time": {"type": "number"},
                            "lane": {"type": "integer"},
                            "type": {"type": "string", "enum": ["normal", "hold", "rapid"]},
                            "beatStrength": {"type": "number"},
                            "holdDuration": {"type": ["number", "null"]},
                            "rapidCount": {"type": ["integer", "null"]},
                            "rapidInterval": {"type": ["number", "null"]},
                        },
                        "required": ["id", "time", "lane", "type", "beatStrength", "holdDuration", "rapidCount", "rapidInterval"],
                    },
                },
            },
            "required": ["version", "metadata", "settings", "tiles"],
        }
