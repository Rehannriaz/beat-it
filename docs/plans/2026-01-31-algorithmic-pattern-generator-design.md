# Algorithmic Pattern Generator Design

## Problem

The current OpenAI-based pattern generation has two issues:
1. Token limits prevent generating patterns for entire songs
2. AI calls are slow and costly

## Solution

Replace AI with a deterministic algorithm that uses the rich audio analysis data already extracted by the Python service.

---

## Algorithm Overview

```
AudioFeatures → PatternGenerator → GamePattern
```

### Core Flow

1. **Build candidate timeline** - merge beat_times and onset_times
2. **Filter candidates** - apply difficulty thresholds and segment modifiers
3. **Assign lanes** - map frequency bands (bass/mid/high) to lanes (0-3)
4. **Select tile types** - normal/hold/rapid based on energy patterns
5. **Post-process** - enforce spacing rules, sort, assign IDs

---

## Tile Placement Rules

### Candidate Merging

- All `beat_times` are candidates (strength = 0.7)
- All `onset_times` not within 50ms of a beat are candidates (use onset_strength)
- `downbeat_times` are always included regardless of thresholds

### Difficulty Thresholds

| Difficulty | Min Spacing | Intensity Threshold | Onset Strength Threshold |
|------------|-------------|---------------------|--------------------------|
| Easy       | 0.5s        | 0.3                 | 0.7                      |
| Medium     | 0.3s        | 0.2                 | 0.5                      |
| Hard       | 0.15s       | 0.1                 | 0.3                      |
| Expert     | 0.08s       | 0.0                 | 0.2                      |

### Selection Logic

- Beats: include if intensity >= threshold
- Onsets: include if strength >= threshold AND intensity >= threshold
- Downbeats: always include (anchor the rhythm)

---

## Lane Assignment

Map frequency energy to lanes for musical feel:

| Lane | Frequency Band |
|------|----------------|
| 0    | Bass (< 250Hz) |
| 1    | Low-mid        |
| 2    | High-mid       |
| 3    | High (> 4kHz)  |

### Logic

At each tile timestamp:
1. Sample bass_energy, mid_energy, high_energy
2. Find dominant frequency band
3. Map to corresponding lane
4. Anti-repetition: if last 2 tiles same lane, force different

---

## Tile Type Selection

Based on local energy pattern around the tile moment:

### Rapid Tiles
- Trigger: sharp energy spike (intensity jumps > 0.3, current > 0.7)
- Only on hard/expert difficulty
- rapid_count: 2-4, rapid_interval: 0.1s

### Hold Tiles
- Trigger: sustained energy plateau (stays > 0.5 for > 0.4s)
- hold_duration: 0.3s - 2.0s (clamped)
- Not on easy difficulty

### Normal Tiles
- Default for everything else

### Difficulty Distribution

| Difficulty | Normal | Hold | Rapid |
|------------|--------|------|-------|
| Easy       | 100%   | 0%   | 0%    |
| Medium     | 85%    | 15%  | 0%    |
| Hard       | 70%    | 20%  | 10%   |
| Expert     | 50%    | 30%  | 20%   |

---

## Segment-Aware Intensity

Use detected song segments to create musical arc:

| Segment | Density Modifier | Tile Types |
|---------|------------------|------------|
| intro   | 0.5x             | simple     |
| verse   | 0.7x             | normal     |
| chorus  | 1.2x             | complex    |
| bridge  | 0.6x             | normal     |
| outro   | 0.4x             | simple     |

- "simple" = normal tiles only
- "complex" = allows rapids
- Transitions smooth over 2 seconds

---

## Audio Playback & Sync

### Source of Truth

Use `audio.currentTime` as the game clock - not setInterval or requestAnimationFrame timers.

```typescript
function getGameTime(): number {
  return audioRef.current?.currentTime ?? 0;
}
```

### Sync Points

- Tiles spawn at: `tile.time - settings.spawnOffset`
- Hit window: `tile.time ± settings.hitTolerance`
- Audio preloads during countdown

### Audio Element

```tsx
<audio
  ref={audioRef}
  src={song.fileUrl}
  onPlay={() => startGameLoop()}
  onPause={() => pauseGameLoop()}
  onEnded={() => showResults()}
/>
```

---

## Implementation

### New Files

```
audio-service/app/services/pattern_generator.py  # NEW
```

### Integration

Add provider option to `/generate-pattern` endpoint:

```python
provider = "openai" | "gemini" | "algorithmic"
```

When `provider="algorithmic"`, use `DeterministicPatternGenerator` instead of AI.

### Frontend Changes

- Add audio element to game component
- Sync game loop to audio.currentTime
- Preload audio during countdown

---

## Benefits

- **Complete coverage** - no token limits, generates for entire song
- **Deterministic** - same input = same output
- **Fast** - milliseconds vs seconds
- **Free** - no API costs
- **Musical** - respects song structure and frequency content
