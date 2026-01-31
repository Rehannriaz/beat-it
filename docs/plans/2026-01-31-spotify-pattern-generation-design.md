# Spotify Pattern Generation Design

## Overview

Add the ability to search for songs on Spotify, generate rhythm game patterns from Spotify's Audio Analysis API, and play the game synced to Spotify playback.

## Current State

- **Upload flow**: Upload MP3 → Python analyzes audio → AI/algorithmic generates pattern → Play with local audio
- **Spotify test page**: Login → Search → Play via SDK (no pattern generation)
- **Gap**: No way to generate patterns for Spotify tracks

## Solution

Reuse the existing Python algorithmic generator by transforming Spotify's Audio Analysis data into the `AudioFeatures` format the generator expects.

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND                                                                    │
│  1. User searches Spotify, selects track                                    │
│  2. spotifyApi.getAudioAnalysis(trackId)                                   │
│  3. Transform SpotifyAudioAnalysis → AudioFeatures                         │
│  4. POST /api/spotify/generate-pattern { features, trackId, difficulty }   │
├─────────────────────────────────────────────────────────────────────────────┤
│ BACKEND                                                                     │
│  5. Receive transformed features                                            │
│  6. POST to Python service /generate-pattern-from-features                 │
│  7. Return GamePattern to frontend                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ FRONTEND                                                                    │
│  8. Start game with pattern                                                 │
│  9. Play audio via Spotify Web Playback SDK                                │
│  10. Sync tiles with playbackPosition                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Section 1: Data Transformation

Transform Spotify's `AudioAnalysis` into `AudioFeatures` format.

**File:** `frontend/src/lib/spotify/transform.ts`

**Mapping:**

| Spotify AudioAnalysis | AudioFeatures |
|-----------------------|---------------|
| `track.tempo` | `bpm` |
| `track.duration` | `duration` |
| `beats[].start` | `beat_times[]` |
| `bars[].start` | `downbeat_times[]` |
| `segments[].start` | `onset_times[]` |
| `segments[].loudness_max` | `onset_strengths[]` (normalized 0-1) |
| `segments[].pitches[0-3]` avg | `bass_energy[]` |
| `segments[].pitches[4-7]` avg | `mid_energy[]` |
| `segments[].pitches[8-11]` avg | `high_energy[]` |
| `segments[].loudness_max` | `intensity_curve[]` (normalized) |
| `sections[]` | `segments[]` with inferred labels |

**Section label inference:**
- First section → "intro"
- Last section → "outro"
- Loudest sections → "chorus"
- Others → "verse" or "bridge"

## Section 2: Python Service - New Endpoint

Add endpoint that accepts pre-analyzed features, skipping audio download/analysis.

**Endpoint:** `POST /generate-pattern-from-features`

**Request:**
```json
{
  "features": {
    "bpm": 120,
    "duration": 210.5,
    "beat_times": [0.5, 1.0, 1.5],
    "downbeat_times": [0.5, 2.5, 4.5],
    "onset_times": [],
    "onset_strengths": [],
    "bass_energy": [],
    "mid_energy": [],
    "high_energy": [],
    "intensity_curve": [],
    "segments": [{"start": 0, "end": 30, "label": "intro"}]
  },
  "song_id": "spotify:track:abc123",
  "title": "Song Name",
  "artist": "Artist Name",
  "difficulty": "medium"
}
```

**Response:** Same `GeneratePatternResponse` as existing endpoint.

**Files:**
- `audio-service/app/models/responses.py` - Add `GenerateFromFeaturesRequest` model
- `audio-service/app/routers/analyze.py` - Add new endpoint

## Section 3: Backend - New Spotify Endpoint

New Express route that proxies to Python service.

**Endpoint:** `POST /api/spotify/generate-pattern`

**Request:**
```json
{
  "trackId": "abc123",
  "title": "Song Name",
  "artist": "Artist Name",
  "duration": 210.5,
  "difficulty": "medium",
  "features": { /* AudioFeatures */ }
}
```

**Response:**
```json
{
  "data": { /* GamePattern */ }
}
```

**Files:**
- `backend/src/routes/spotifyRoutes.ts` - New route file
- `backend/src/controllers/spotifyController.ts` - Handler
- `backend/src/services/spotifyService.ts` - Calls Python service
- `backend/src/types/spotify.ts` - Request/response types
- `backend/src/routes/index.ts` - Register routes

Note: Spotify tracks are NOT stored in database. Pattern is generated on-demand.

## Section 4: Frontend - Main Page Integration

Add Spotify search to main game screen with wizard flow.

**UI Changes:**
- Add "Search Spotify" button next to "Upload Song" on `StartScreen3D`
- New `SpotifyWizard` modal component

**Wizard Flow:**
1. **LOGIN** - `SpotifyLogin` component (if not authenticated)
2. **SEARCH** - `TrackSearch` component, user selects track
3. **GENERATE** - Fetch analysis, select difficulty, generate pattern
4. **COMPLETE** - Show stats, "Play Now" button

**Files:**
- `frontend/src/components/spotify-wizard/spotify-wizard.tsx`
- `frontend/src/components/spotify-wizard/step-search.tsx`
- `frontend/src/components/spotify-wizard/step-generate.tsx`
- `frontend/src/components/spotify-wizard/index.ts`
- `frontend/src/hooks/useSpotifyPattern.ts` - Mutation hook
- `frontend/src/components/game-3d/overlays-3d.tsx` - Add button

## Section 5: Playback Sync

Sync game tiles with Spotify playback position.

**Changes to `use-game-3d.ts`:**
```typescript
useGame3D({
  pattern: GamePattern,
  mode: 'pattern' | 'endless',
  // For uploaded songs:
  audioUrl?: string,
  // For Spotify:
  spotifyPlayer?: {
    isPlaying: boolean,
    position: number,  // seconds from SpotifyPlayer
  }
})
```

**Latency consideration:**
Spotify Web Playback SDK has ~200-500ms latency. May need calibration offset.

**Files:**
- `frontend/src/hooks/use-game-3d.ts` - Accept Spotify time source
- `frontend/src/components/game-3d/rhythm-game-3d.tsx` - Integrate Spotify flow

## Implementation Files

### Python Audio Service (2 files modified)
- `audio-service/app/models/responses.py` - Add request model
- `audio-service/app/routers/analyze.py` - Add endpoint

### Backend (5 files, 4 new)
- `backend/src/routes/spotifyRoutes.ts` - NEW
- `backend/src/controllers/spotifyController.ts` - NEW
- `backend/src/services/spotifyService.ts` - NEW
- `backend/src/types/spotify.ts` - NEW
- `backend/src/routes/index.ts` - MODIFY

### Frontend (8 files, 6 new)
- `frontend/src/lib/spotify/transform.ts` - NEW
- `frontend/src/components/spotify-wizard/spotify-wizard.tsx` - NEW
- `frontend/src/components/spotify-wizard/step-search.tsx` - NEW
- `frontend/src/components/spotify-wizard/step-generate.tsx` - NEW
- `frontend/src/components/spotify-wizard/index.ts` - NEW
- `frontend/src/hooks/useSpotifyPattern.ts` - NEW
- `frontend/src/hooks/use-game-3d.ts` - MODIFY
- `frontend/src/components/game-3d/rhythm-game-3d.tsx` - MODIFY
- `frontend/src/components/game-3d/overlays-3d.tsx` - MODIFY

**Total: ~15 files** (10 new, 5 modified)
