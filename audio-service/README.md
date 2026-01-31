# Audio Analysis Service

Python FastAPI service for audio analysis and AI-powered pattern generation.

## Setup

1. Create a virtual environment:
```bash
cd audio-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create `.env` file:
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Run the service:
```bash
uvicorn app.main:app --reload --port 8000
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o |
| `GEMINI_API_KEY` | Google Gemini API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon/service key |

## API Endpoints

### `POST /analyze`
Extract audio features from an MP3 file.

**Request:**
```json
{
  "audio_url": "https://..."
}
```

**Response:**
```json
{
  "success": true,
  "features": {
    "bpm": 128,
    "duration": 180.5,
    "beat_times": [0.5, 1.0, 1.5, ...],
    "onset_times": [...],
    "energy_curve": [...],
    ...
  }
}
```

### `POST /generate-pattern`
Analyze audio and generate a game pattern using AI.

**Request:**
```json
{
  "audio_url": "https://...",
  "title": "Song Title",
  "artist": "Artist Name",
  "difficulty": "medium",
  "song_id": "uuid",
  "provider": "openai"
}
```

**Response:**
```json
{
  "success": true,
  "pattern": {
    "version": "1.0",
    "metadata": {...},
    "settings": {...},
    "tiles": [...]
  }
}
```

### `GET /health`
Health check endpoint.

## Docker

Build and run with Docker:
```bash
docker build -t audio-service .
docker run -p 8000:8000 --env-file .env audio-service
```

## Audio Features Extracted

- **BPM** - Detected tempo
- **Beat times** - Timestamps of beats
- **Onset times** - When sounds start
- **Energy curve** - Loudness over time
- **Frequency bands** - Bass, mid, high energy
- **Segments** - Song structure (intro, verse, chorus, etc.)
- **Intensity curve** - Combined intensity metric
