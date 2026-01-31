# Audio Analysis & AI Pattern Generation

## Overview

Add a complete flow for users to upload MP3 files, analyze audio features, and generate game patterns using AI. This involves a new Python microservice for audio analysis and AI integration, plus frontend wizard UI.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────┐
│   Frontend   │────▶│   Node.js    │────▶│   Python Audio Service       │
│   (Next.js)  │     │   Backend    │     │   (FastAPI + librosa)        │
└──────────────┘     └──────────────┘     │                              │
                            │             │  ┌─────────────────────────┐ │
                            │             │  │ Audio Analysis (librosa)│ │
                            ▼             │  └───────────┬─────────────┘ │
                     ┌──────────────┐     │              ▼               │
                     │   Supabase   │     │  ┌─────────────────────────┐ │
                     │   (Storage)  │◀────┼──│ AI Pattern Generation   │ │
                     └──────────────┘     │  │ (OpenAI / Gemini)       │ │
                            │             │  └─────────────────────────┘ │
                            ▼             └──────────────────────────────┘
                     ┌──────────────┐
                     │  PostgreSQL  │
                     │  (Patterns)  │
                     └──────────────┘
```

## User Flow

1. User clicks "Upload Song" in game menu
2. **Wizard Step 1:** Select MP3 file, enter title/artist → uploads to Supabase
3. **Wizard Step 2:** Python service analyzes audio → shows BPM, duration
4. **Wizard Step 3:** User selects difficulty → AI generates pattern
5. **Wizard Step 4:** Success → user can play immediately

## Python Audio Service

### Structure

```
audio-service/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI entry point
│   ├── config.py                # Environment variables
│   ├── routers/
│   │   └── analyze.py           # /analyze, /generate-pattern endpoints
│   ├── services/
│   │   ├── audio_analyzer.py    # librosa feature extraction
│   │   ├── pattern_generator.py # AI prompt + response parsing
│   │   └── ai_providers/
│   │       ├── base.py          # Abstract provider interface
│   │       ├── openai.py        # OpenAI GPT-4o implementation
│   │       └── gemini.py        # Google Gemini implementation
│   ├── models/
│   │   ├── requests.py          # Pydantic request schemas
│   │   ├── responses.py         # Pydantic response schemas
│   │   └── audio_features.py    # Audio analysis data structures
│   └── utils/
│       └── file_handler.py      # Download audio from URL
├── requirements.txt
├── Dockerfile
├── .env.example
└── README.md
```

### Endpoints

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| `POST` | `/analyze` | `{ audio_url: string }` | Audio features object |
| `POST` | `/generate-pattern` | `{ audio_url, title, artist, difficulty, song_id, provider? }` | Complete GamePattern |
| `GET` | `/health` | - | `{ status: "ok" }` |

### Audio Features Extracted

**Core Timing**
- `bpm` - Detected tempo
- `beat_times` - Array of beat timestamps (seconds)
- `downbeat_times` - First beat of each measure
- `duration` - Total song length

**Onset Detection**
- `onset_times` - When new sounds begin
- `onset_strengths` - Strength of each onset (0-1)

**Energy Analysis**
- `energy_curve` - Loudness over time (sampled every 0.1s)
- `energy_segments` - Sections labeled low/medium/high/peak

**Frequency Bands**
- `bass_energy` - Low frequency energy over time
- `mid_energy` - Mid frequency energy
- `high_energy` - High frequency energy

**Structural Features**
- `segments` - Detected sections (intro, verse, chorus, drop, outro)
- `intensity_curve` - Combined intensity metric

### AI Pattern Generation

Both OpenAI (GPT-4o) and Gemini are supported, selectable via `provider` parameter.

**Structured Output Schema:**

```json
{
  "version": "1.0",
  "metadata": {
    "songId": "uuid",
    "songTitle": "string",
    "artist": "string",
    "duration": 180,
    "bpm": 120,
    "difficulty": "medium",
    "generatedAt": "2026-01-31T12:00:00Z",
    "generatorVersion": "ai-v1"
  },
  "settings": {
    "laneCount": 4,
    "hitZoneY": -8,
    "hitTolerance": 0.15,
    "tileSpeed": 8,
    "spawnOffset": 12,
    "playbackSpeed": 1.0
  },
  "tiles": [
    {
      "id": "tile-0",
      "time": 0.5,
      "lane": 0,
      "type": "normal",
      "beatStrength": 0.7
    },
    {
      "id": "tile-1",
      "time": 1.0,
      "lane": 2,
      "type": "hold",
      "beatStrength": 0.9,
      "holdDuration": 0.8
    },
    {
      "id": "tile-2",
      "time": 1.5,
      "lane": 1,
      "type": "rapid",
      "beatStrength": 1.0,
      "rapidCount": 3,
      "rapidInterval": 0.12
    }
  ]
}
```

**Tile Types:**
- `normal` - Single tap
- `hold` - Hold for duration (requires `holdDuration`)
- `rapid` - Quick successive taps (requires `rapidCount`, `rapidInterval`)

**Difficulty Scaling:**
- Easy: Lower tile density, slower speed, mostly normal tiles
- Medium: Moderate density, some holds
- Hard: Higher density, holds and rapids
- Expert: Maximum density, complex patterns

## Node.js Backend Changes

### New Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/songs/{id}/analyze` | Proxy to Python /analyze, cache result |
| `POST` | `/api/songs/{id}/generate-pattern` | Call Python service, save pattern to DB |

### Why Proxy Through Node.js

- Frontend only talks to one backend (simpler CORS, auth)
- Node.js validates song ownership and adds song_id
- Pattern saved to PostgreSQL automatically
- Python service URL stays internal

## Frontend Changes

### New Components

```
frontend/src/components/upload-wizard/
├── upload-wizard.tsx    # Main wizard container
├── step-upload.tsx      # File picker, title/artist inputs
├── step-analysis.tsx    # Shows BPM, duration, progress
├── step-generate.tsx    # Difficulty selector
└── step-complete.tsx    # Success, play now button
```

### Wizard Steps

**Step 1: Upload**
- File picker (MP3 only)
- Title and artist text inputs
- Upload progress bar
- Calls existing `/api/songs/upload`

**Step 2: Analysis**
- Auto-triggers on upload complete
- Shows spinner during analysis
- Displays: BPM, duration, detected sections
- Continue button

**Step 3: Generate**
- Difficulty selector (Easy/Medium/Hard/Expert)
- Description of each difficulty level
- Generate button with progress indicator

**Step 4: Complete**
- Success message
- Song info summary (title, artist, BPM, tile count)
- "Play Now" and "Back to Menu" buttons

### Menu Integration

Add "Upload Song" button to `overlays-3d.tsx` start screen.

### New Hooks

Add to `useSongs.ts`:
- `useAnalyzeSong(songId)` - Trigger audio analysis
- `useGeneratePattern(songId, difficulty)` - Trigger pattern generation

## Environment Variables

### Python Service

```bash
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=...
```

### Node.js Backend (add)

```bash
AUDIO_SERVICE_URL=http://localhost:8000
```

## Dependencies

### Python (requirements.txt)

```
fastapi>=0.109.0
uvicorn>=0.27.0
librosa>=0.10.1
pydantic>=2.5.0
openai>=1.10.0
google-generativeai>=0.3.0
httpx>=0.26.0
python-multipart>=0.0.6
numpy>=1.26.0
```

### Node.js

No new dependencies (uses native fetch).

## File Changes Summary

### New

- `audio-service/` - Entire Python service

### Modified

- `backend/src/routes/songRoutes.ts` - Add analyze/generate endpoints
- `backend/src/controllers/songController.ts` - New controller methods
- `backend/src/services/songService.ts` - Audio service client
- `frontend/src/components/upload-wizard/*` - New wizard components
- `frontend/src/components/game-3d/overlays-3d.tsx` - Add upload button
- `frontend/src/hooks/useSongs.ts` - Add analysis/generation hooks
