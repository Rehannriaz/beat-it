# Rhythm Rush

A full-stack AI-powered rhythm music game with a stunning 3D interface. Hit tiles in sync with the music, build combos, and compete on leaderboards!

## Features

- **3D Rhythm Gameplay** - Four-lane rhythm game with immersive 3D visual effects and multiple themes (Vaporwave, Retro, Cyberpunk, Minimal)
- **AI-Powered Pattern Generation** - Upload your own music and let AI automatically generate game patterns synced to the beat
- **Spotify Integration** - Connect your Spotify account and play songs directly from your playlists
- **Daily Challenges** - Compete against other players on daily leaderboards
- **Multiple Game Modes** - Pattern Mode, Endless Mode, and Daily Challenge Mode
- **Combo System** - Build combos with perfect hits and celebrate milestones

## Tech Stack

### Frontend
- Next.js 16 with React 19
- TypeScript
- Three.js + React Three Fiber (3D graphics)
- Tailwind CSS + Framer Motion
- Supabase Auth

### Backend
- Express.js with TypeScript
- PostgreSQL via Supabase
- Swagger/OpenAPI documentation

### Audio Analysis Service
- FastAPI (Python)
- Librosa for audio processing
- OpenAI GPT-4o & Google Gemini for AI pattern generation

## Project Structure

```
beat-it/
├── frontend/          # Next.js web application
├── backend/           # Express.js API server
├── audio-service/     # FastAPI audio analysis service
└── supabase/          # Supabase configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- Docker (for PostgreSQL)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:3000

### Backend

```bash
cd backend
npm install
npm run db:up        # Start PostgreSQL container
npm run dev
```

Runs on http://localhost:3001
Swagger docs: http://localhost:3001/api/docs

### Audio Service

```bash
cd audio-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Configure API keys
uvicorn app.main:app --reload --port 8000
```

Runs on http://localhost:8000

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Backend (.env)
```
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=beat_it
DB_USER=postgres
DB_PASSWORD=postgres
```

### Audio Service (.env)
```
OPENAI_API_KEY=your-key
GEMINI_API_KEY=your-key
SUPABASE_URL=your-url
SUPABASE_KEY=your-key
```

## How to Play

1. **Upload a song** or **connect Spotify** to select a track
2. Wait for AI to analyze the audio and generate patterns
3. Use **D, F, J, K** keys to hit tiles as they reach the hit zone
4. Build combos by hitting notes accurately
5. Compete for high scores on the leaderboards!

## Contributors

- **Muhammad Rehan**
- **Yash Nitnaware**
- **Peter Stephen**
- **Camilla Copetti**

## License

This project is for educational purposes.
