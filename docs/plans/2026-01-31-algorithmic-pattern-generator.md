# Algorithmic Pattern Generator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace AI-based pattern generation with a deterministic algorithm that uses audio analysis data, and add audio playback synced to gameplay.

**Architecture:** Create a new `AlgorithmicPatternGenerator` class in the Python audio-service that transforms `AudioFeatures` into `GamePattern` using beats, onsets, energy, and frequency data. On the frontend, add an audio element to `RhythmGame3D` that syncs with the game loop.

**Tech Stack:** Python (audio-service), React/TypeScript (frontend), HTML5 Audio API

---

## Task 1: Create Algorithmic Pattern Generator

**Files:**
- Create: `audio-service/app/services/algorithmic_generator.py`

**Step 1: Create the generator module**

```python
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

        # Add all beats as candidates
        for t in self.features.beat_times:
            is_downbeat = any(abs(t - db) < 0.05 for db in self.features.downbeat_times)
            candidates.append({
                "time": t,
                "source": "beat",
                "strength": 0.8 if is_downbeat else 0.6,
                "is_downbeat": is_downbeat,
            })

        # Add onsets that aren't too close to beats
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
        return "verse"  # default

    def _get_effective_thresholds(self, time: float) -> dict:
        segment = self._get_segment_at(time)
        modifier = SEGMENT_MODIFIERS.get(segment, SEGMENT_MODIFIERS["verse"])

        base_intensity = self.config["intensity_threshold"]
        # Lower threshold = more tiles, so divide by density multiplier
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
            # Enforce minimum spacing
            if c["time"] - last_time < self.config["min_spacing"]:
                # But always include downbeats
                if not c.get("is_downbeat"):
                    continue

            intensity = self._get_intensity_at(c["time"])
            thresholds = self._get_effective_thresholds(c["time"])

            # Always include downbeats
            if c.get("is_downbeat"):
                filtered.append({**c, "intensity": intensity, **thresholds})
                last_time = c["time"]
                continue

            # Filter beats by intensity
            if c["source"] == "beat" and intensity >= thresholds["intensity_threshold"]:
                filtered.append({**c, "intensity": intensity, **thresholds})
                last_time = c["time"]
                continue

            # Filter onsets by strength and intensity
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

        # Determine lane based on dominant frequency
        if bass_ratio > 0.5:
            lane = 0
        elif high_ratio > 0.4:
            lane = 3
        elif mid_ratio > 0.4:
            lane = random.choice([1, 2])
        else:
            # Use time-based pseudo-random for variety
            lane = int(time * 7) % 4

        # Anti-repetition: if last 2 tiles were same lane, force different
        if len(recent_lanes) >= 2 and recent_lanes[-1] == recent_lanes[-2] == lane:
            available = [l for l in range(4) if l != lane]
            lane = random.choice(available)

        return lane

    def _get_tile_type(self, time: float, allow_holds: bool, allow_rapids: bool) -> tuple[str, dict]:
        intensity_now = self._get_intensity_at(time)
        intensity_before = self._get_intensity_at(max(0, time - 0.3))
        intensity_after = self._get_intensity_at(min(self.duration, time + 0.3))

        # Rapid: sharp spike
        if allow_rapids and intensity_now > intensity_before + 0.3 and intensity_now > 0.7:
            return "rapid", {
                "rapidCount": random.randint(2, 4),
                "rapidInterval": 0.1,
            }

        # Hold: sustained plateau
        if allow_holds and intensity_now > 0.5 and intensity_after > 0.5:
            # Find how long energy stays high
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
```

**Step 2: Verify module imports work**

Run: `cd /Users/mac/Desktop/hamburg-hackathon/audio-service && python -c "from app.services.algorithmic_generator import generate_algorithmic_pattern; print('OK')"`
Expected: `OK`

---

## Task 2: Integrate Algorithmic Generator into Pattern Service

**Files:**
- Modify: `audio-service/app/services/pattern_generator.py`

**Step 1: Update the pattern generator to support algorithmic provider**

Replace entire file content with:

```python
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

    # Use algorithmic generator (fast, no API calls)
    if provider_name == "algorithmic":
        return generate_algorithmic_pattern(
            features=features,
            song_id=song_id,
            title=title,
            artist=artist,
            difficulty=difficulty,
        )

    # Fall back to AI providers
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
```

**Step 2: Verify the service works**

Run: `cd /Users/mac/Desktop/hamburg-hackathon/audio-service && python -c "from app.services.pattern_generator import generate_pattern; print('OK')"`
Expected: `OK`

---

## Task 3: Update Request Model to Accept Algorithmic Provider

**Files:**
- Modify: `audio-service/app/models/requests.py`

**Step 1: Find and update the GeneratePatternRequest model**

Add `"algorithmic"` to the provider literal type:

```python
provider: Literal["openai", "gemini", "algorithmic"] | None = None
```

**Step 2: Verify model accepts new provider**

Run: `cd /Users/mac/Desktop/hamburg-hackathon/audio-service && python -c "from app.models import GeneratePatternRequest; r = GeneratePatternRequest(audio_url='http://test.com/a.mp3', song_id='1', title='T', artist='A', difficulty='easy', provider='algorithmic'); print('OK')"`
Expected: `OK`

---

## Task 4: Update Frontend Types to Accept Algorithmic Provider

**Files:**
- Modify: `frontend/src/types/api.ts`

**Step 1: Update GeneratePatternInput type**

Change line 68 from:
```typescript
provider?: 'openai' | 'gemini';
```
To:
```typescript
provider?: 'openai' | 'gemini' | 'algorithmic';
```

---

## Task 5: Add Audio Playback to Game Hook

**Files:**
- Modify: `frontend/src/hooks/use-game-3d.ts`

**Step 1: Add audioUrl to options and return audio ref**

Update the hook to accept `audioUrl` and return an audio ref that components can use:

Add to `UseGame3DOptions`:
```typescript
export type UseGame3DOptions = {
  pattern?: GamePattern | null
  mode?: 'pattern' | 'endless'
  audioUrl?: string | null
}
```

Add audio ref and sync logic inside the hook:
```typescript
const audioRef = useRef<HTMLAudioElement | null>(null)

// Create audio element when URL provided
useEffect(() => {
  if (options.audioUrl) {
    const audio = new Audio(options.audioUrl)
    audio.preload = 'auto'
    audioRef.current = audio

    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }
}, [options.audioUrl])
```

Modify `startGame` to play audio:
```typescript
const startGame = useCallback(() => {
  spawnedTilesRef.current = new Set()
  endlessTileIdRef.current = 0
  endlessSpawnTimerRef.current = 0

  // Start audio playback
  if (audioRef.current) {
    audioRef.current.currentTime = 0
    audioRef.current.play().catch(console.error)
  }

  setGameState({
    tiles: [],
    score: 0,
    combo: 0,
    maxCombo: 0,
    isPlaying: true,
    isPaused: false,
    gameOver: false,
    gameTime: 0,
    lastHitFeedback: null
  })
}, [])
```

Modify `pauseGame` to pause/resume audio:
```typescript
const pauseGame = useCallback(() => {
  setGameState(prev => {
    const newPaused = !prev.isPaused
    if (audioRef.current) {
      if (newPaused) {
        audioRef.current.pause()
      } else {
        audioRef.current.play().catch(console.error)
      }
    }
    return { ...prev, isPaused: newPaused }
  })
}, [])
```

Modify `endGame` to stop audio:
```typescript
const endGame = useCallback(() => {
  if (audioRef.current) {
    audioRef.current.pause()
    audioRef.current.currentTime = 0
  }
  setGameState(prev => ({ ...prev, isPlaying: false, gameOver: true }))
  if (animationFrameRef.current) {
    cancelAnimationFrame(animationFrameRef.current)
  }
}, [])
```

In game loop, sync game time with audio when available:
```typescript
// Inside gameLoop, after calculating newGameTime:
if (audioRef.current && !audioRef.current.paused) {
  // Use audio as source of truth for timing
  const audioTime = audioRef.current.currentTime
  // Only sync if difference is significant (avoid micro-corrections)
  if (Math.abs(audioTime - newGameTime) > 0.1) {
    newGameTime = audioTime
  }
}
```

Return audioRef:
```typescript
return {
  gameState,
  startGame,
  pauseGame,
  endGame,
  hitTile,
  pattern,
  mode,
  audioRef
}
```

---

## Task 6: Pass Audio URL to Game Component

**Files:**
- Modify: `frontend/src/components/game-3d/rhythm-game-3d.tsx`

**Step 1: Track uploaded song and pass audio URL to hook**

Add state for uploaded song:
```typescript
const [uploadedSong, setUploadedSong] = useState<Song | null>(null)
```

Update `handleUploadComplete`:
```typescript
const handleUploadComplete = (song: Song) => {
  setUploadedSong(song)
  if (song.pattern) {
    setUploadedPattern(song.pattern)
    setUsePattern(true)
  }
  setUploadWizardOpen(false)
}
```

Pass audioUrl to hook:
```typescript
const { gameState, startGame, pauseGame, endGame, mode } = useGame3D({
  pattern: usePattern ? activePattern : null,
  mode: usePattern ? 'pattern' : 'endless',
  audioUrl: uploadedSong?.fileUrl ?? null
})
```

---

## Task 7: Test End-to-End

**Step 1: Start audio service**

Run: `cd /Users/mac/Desktop/hamburg-hackathon/audio-service && uvicorn app.main:app --reload --port 8000`

**Step 2: Test algorithmic pattern generation**

```bash
curl -X POST http://localhost:8000/generate-pattern \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "YOUR_TEST_AUDIO_URL",
    "song_id": "test-1",
    "title": "Test Song",
    "artist": "Test Artist",
    "difficulty": "medium",
    "provider": "algorithmic"
  }'
```

Expected: JSON response with `success: true` and a complete `pattern` object with tiles spanning the entire song duration.

**Step 3: Test frontend**

Run: `cd /Users/mac/Desktop/hamburg-hackathon/frontend && npm run dev`

1. Open http://localhost:3000
2. Upload a song
3. Generate pattern with algorithmic provider
4. Start game
5. Verify audio plays in sync with tiles

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Create `algorithmic_generator.py` with full pattern generation logic |
| 2 | Integrate into `pattern_generator.py` service |
| 3 | Update request model to accept `"algorithmic"` provider |
| 4 | Update frontend types |
| 5 | Add audio playback to `use-game-3d.ts` hook |
| 6 | Pass audio URL through `rhythm-game-3d.tsx` |
| 7 | End-to-end testing |
