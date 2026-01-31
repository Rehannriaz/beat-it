# Spotify Pattern Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to search Spotify, generate rhythm game patterns from Spotify's Audio Analysis API, and play synced to Spotify playback.

**Architecture:** Frontend fetches Spotify audio analysis, transforms it to AudioFeatures format, sends to backend which proxies to Python service. Existing algorithmic generator creates GamePattern. Game plays via Spotify Web Playback SDK with position sync.

**Tech Stack:** TypeScript (Next.js frontend, Express backend), Python (FastAPI audio-service), Spotify Web API, Spotify Web Playback SDK

---

## Task 1: Python Service - Request Model

**Files:**
- Modify: `audio-service/app/models/responses.py`

**Step 1: Add the new request model**

Add `GenerateFromFeaturesRequest` model to handle pre-analyzed audio features.

```python
# Add after existing imports and models

class AudioFeaturesInput(BaseModel):
    """Audio features input for pattern generation."""
    bpm: float
    duration: float
    beat_times: list[float]
    downbeat_times: list[float]
    onset_times: list[float]
    onset_strengths: list[float]
    energy_curve: list[float]
    energy_segments: list[dict]
    bass_energy: list[float]
    mid_energy: list[float]
    high_energy: list[float]
    segments: list[dict]
    intensity_curve: list[float]


class GenerateFromFeaturesRequest(BaseModel):
    """Request to generate pattern from pre-analyzed features."""
    features: AudioFeaturesInput
    song_id: str
    title: str
    artist: str
    difficulty: str
```

**Step 2: Update model exports**

Ensure the new models are exported from `models/__init__.py`.

**Step 3: Commit**

```bash
git add audio-service/app/models/
git commit -m "feat(audio-service): add request model for pre-analyzed features"
```

---

## Task 2: Python Service - New Endpoint

**Files:**
- Modify: `audio-service/app/routers/analyze.py`
- Modify: `audio-service/app/models/__init__.py`

**Step 1: Update model imports in __init__.py**

```python
# In audio-service/app/models/__init__.py, add to exports:
from .responses import (
    AnalyzeRequest,
    AnalyzeResponse,
    GeneratePatternRequest,
    GeneratePatternResponse,
    AudioFeaturesInput,
    GenerateFromFeaturesRequest,
)
```

**Step 2: Add the new endpoint**

Add to `audio-service/app/routers/analyze.py`:

```python
# Add import at top
from ..models import (
    AnalyzeRequest,
    AnalyzeResponse,
    GeneratePatternRequest,
    GeneratePatternResponse,
    GenerateFromFeaturesRequest,
    AudioFeaturesInput,
)
from ..models.audio_features import AudioFeatures


@router.post("/generate-pattern-from-features", response_model=GeneratePatternResponse)
async def generate_pattern_from_features_endpoint(request: GenerateFromFeaturesRequest):
    """Generate a game pattern from pre-analyzed audio features (e.g., from Spotify)."""
    try:
        # Convert input to AudioFeatures model
        features = AudioFeatures(
            bpm=request.features.bpm,
            duration=request.features.duration,
            beat_times=request.features.beat_times,
            downbeat_times=request.features.downbeat_times,
            onset_times=request.features.onset_times,
            onset_strengths=request.features.onset_strengths,
            energy_curve=request.features.energy_curve,
            energy_segments=request.features.energy_segments,
            bass_energy=request.features.bass_energy,
            mid_energy=request.features.mid_energy,
            high_energy=request.features.high_energy,
            segments=request.features.segments,
            intensity_curve=request.features.intensity_curve,
        )

        # Generate pattern using existing generator
        pattern = await generate_pattern(
            features=features,
            song_id=request.song_id,
            title=request.title,
            artist=request.artist,
            difficulty=request.difficulty,
            provider="algorithmic",
        )

        return GeneratePatternResponse(success=True, pattern=pattern)
    except Exception as e:
        return GeneratePatternResponse(success=False, error=str(e))
```

**Step 3: Verify service starts**

```bash
cd audio-service
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
# Should start without errors
```

**Step 4: Test endpoint with curl**

```bash
curl -X POST http://localhost:8000/generate-pattern-from-features \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "bpm": 120,
      "duration": 180,
      "beat_times": [0.5, 1.0, 1.5, 2.0],
      "downbeat_times": [0.5, 2.5],
      "onset_times": [],
      "onset_strengths": [],
      "energy_curve": [0.5, 0.6, 0.7],
      "energy_segments": [],
      "bass_energy": [0.5, 0.5, 0.5],
      "mid_energy": [0.5, 0.5, 0.5],
      "high_energy": [0.5, 0.5, 0.5],
      "segments": [{"start": 0, "end": 180, "label": "verse"}],
      "intensity_curve": [0.5, 0.6, 0.7]
    },
    "song_id": "test-123",
    "title": "Test Song",
    "artist": "Test Artist",
    "difficulty": "medium"
  }'
# Expected: {"success": true, "pattern": {...}}
```

**Step 5: Commit**

```bash
git add audio-service/
git commit -m "feat(audio-service): add endpoint for pattern generation from pre-analyzed features"
```

---

## Task 3: Backend - Types

**Files:**
- Create: `backend/src/types/spotify.ts`

**Step 1: Create Spotify types file**

```typescript
// backend/src/types/spotify.ts

export interface AudioFeaturesInput {
  bpm: number;
  duration: number;
  beat_times: number[];
  downbeat_times: number[];
  onset_times: number[];
  onset_strengths: number[];
  energy_curve: number[];
  energy_segments: { start: number; end: number; level: string }[];
  bass_energy: number[];
  mid_energy: number[];
  high_energy: number[];
  segments: { start: number; end: number; label: string }[];
  intensity_curve: number[];
}

export interface GenerateSpotifyPatternRequest {
  trackId: string;
  title: string;
  artist: string;
  duration: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  features: AudioFeaturesInput;
}

export interface GenerateSpotifyPatternResponse {
  success: boolean;
  pattern?: import('./song').GamePattern;
  error?: string;
}
```

**Step 2: Export from types index**

Add to `backend/src/types/index.ts`:

```typescript
export * from './spotify';
```

**Step 3: Commit**

```bash
git add backend/src/types/
git commit -m "feat(backend): add Spotify pattern generation types"
```

---

## Task 4: Backend - Spotify Service

**Files:**
- Create: `backend/src/services/spotifyService.ts`

**Step 1: Create the service**

```typescript
// backend/src/services/spotifyService.ts

import { config } from '../config';
import { AppError } from '../utils/AppError';
import type { AudioFeaturesInput, GenerateSpotifyPatternResponse } from '../types/spotify';
import type { GamePattern } from '../types/song';

export const spotifyService = {
  async generatePattern(
    trackId: string,
    title: string,
    artist: string,
    difficulty: string,
    features: AudioFeaturesInput
  ): Promise<GamePattern> {
    const response = await fetch(
      `${config.audioService.url}/generate-pattern-from-features`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features,
          song_id: `spotify:${trackId}`,
          title,
          artist,
          difficulty,
        }),
      }
    );

    const data = (await response.json()) as GenerateSpotifyPatternResponse;

    if (!data.success || !data.pattern) {
      throw new AppError(data.error || 'Pattern generation failed', 500);
    }

    return data.pattern;
  },
};
```

**Step 2: Export from services index**

Add to `backend/src/services/index.ts`:

```typescript
export * from './spotifyService';
```

**Step 3: Commit**

```bash
git add backend/src/services/
git commit -m "feat(backend): add Spotify service for pattern generation"
```

---

## Task 5: Backend - Spotify Controller

**Files:**
- Create: `backend/src/controllers/spotifyController.ts`

**Step 1: Create the controller**

```typescript
// backend/src/controllers/spotifyController.ts

import { Request, Response, NextFunction } from 'express';
import { spotifyService } from '../services/spotifyService';
import type { GenerateSpotifyPatternRequest } from '../types/spotify';

export const spotifyController = {
  async generatePattern(
    req: Request<{}, {}, GenerateSpotifyPatternRequest>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { trackId, title, artist, difficulty, features } = req.body;

      if (!trackId || !title || !difficulty || !features) {
        return res.status(400).json({
          error: 'Missing required fields: trackId, title, difficulty, features',
        });
      }

      const pattern = await spotifyService.generatePattern(
        trackId,
        title,
        artist || 'Unknown Artist',
        difficulty,
        features
      );

      return res.json({ data: pattern });
    } catch (error) {
      next(error);
    }
  },
};
```

**Step 2: Export from controllers index**

Add to `backend/src/controllers/index.ts`:

```typescript
export * from './spotifyController';
```

**Step 3: Commit**

```bash
git add backend/src/controllers/
git commit -m "feat(backend): add Spotify controller"
```

---

## Task 6: Backend - Spotify Routes

**Files:**
- Create: `backend/src/routes/spotifyRoutes.ts`
- Modify: `backend/src/routes/index.ts`

**Step 1: Create the routes file**

```typescript
// backend/src/routes/spotifyRoutes.ts

import { Router } from 'express';
import { spotifyController } from '../controllers/spotifyController';

const router = Router();

/**
 * @swagger
 * /spotify/generate-pattern:
 *   post:
 *     summary: Generate pattern from Spotify audio analysis
 *     description: Generates a game pattern using pre-analyzed audio features from Spotify's Audio Analysis API
 *     tags:
 *       - Spotify
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - trackId
 *               - title
 *               - difficulty
 *               - features
 *             properties:
 *               trackId:
 *                 type: string
 *                 description: Spotify track ID
 *               title:
 *                 type: string
 *                 description: Song title
 *               artist:
 *                 type: string
 *                 description: Artist name
 *               duration:
 *                 type: number
 *                 description: Track duration in seconds
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard, expert]
 *               features:
 *                 type: object
 *                 description: Transformed audio features from Spotify
 *     responses:
 *       200:
 *         description: Pattern generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/GamePattern'
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Pattern generation failed
 */
router.post('/generate-pattern', spotifyController.generatePattern);

export const spotifyRoutes = router;
```

**Step 2: Register routes in index**

Modify `backend/src/routes/index.ts`:

```typescript
import { Router } from 'express';
import { songRoutes } from './songRoutes';
import { spotifyRoutes } from './spotifyRoutes';

const router = Router();

router.use('/songs', songRoutes);
router.use('/spotify', spotifyRoutes);

export default router;
```

**Step 3: Verify backend builds**

```bash
cd backend
npm run build
# Should complete without errors
```

**Step 4: Commit**

```bash
git add backend/src/routes/
git commit -m "feat(backend): add Spotify routes for pattern generation"
```

---

## Task 7: Frontend - Spotify Transform Utility

**Files:**
- Create: `frontend/src/lib/spotify/transform.ts`

**Step 1: Create the transformer**

```typescript
// frontend/src/lib/spotify/transform.ts

import type { SpotifyAudioAnalysis } from './types';
import type { AudioFeatures } from '@/types/api';

/**
 * Infer section labels based on position and loudness.
 * Spotify sections don't have labels, so we infer them.
 */
function inferSectionLabel(
  index: number,
  total: number,
  loudness: number,
  maxLoudness: number
): string {
  // First section is usually intro
  if (index === 0) return 'intro';
  // Last section is usually outro
  if (index === total - 1) return 'outro';
  // Loudest sections are likely chorus
  if (loudness > maxLoudness * 0.9) return 'chorus';
  // Second loudest could be chorus or bridge
  if (loudness > maxLoudness * 0.75) return 'chorus';
  // Everything else is verse or bridge
  return index % 3 === 0 ? 'bridge' : 'verse';
}

/**
 * Normalize loudness from dB (typically -60 to 0) to 0-1 range.
 */
function normalizeLoudness(loudness: number): number {
  // Spotify loudness is typically between -60 and 0 dB
  const normalized = (loudness + 60) / 60;
  return Math.max(0, Math.min(1, normalized));
}

/**
 * Transform Spotify Audio Analysis to AudioFeatures format.
 */
export function transformSpotifyAnalysis(
  analysis: SpotifyAudioAnalysis
): AudioFeatures {
  const { track, beats, bars, sections, segments } = analysis;

  // Extract beat times
  const beat_times = beats.map((b) => b.start);

  // Extract downbeat times (first beat of each bar)
  const downbeat_times = bars.map((b) => b.start);

  // Use segment boundaries as onset times
  const onset_times = segments.map((s) => s.start);

  // Normalize segment loudness for onset strengths
  const maxSegmentLoudness = Math.max(...segments.map((s) => s.loudness_max));
  const minSegmentLoudness = Math.min(...segments.map((s) => s.loudness_max));
  const loudnessRange = maxSegmentLoudness - minSegmentLoudness || 1;

  const onset_strengths = segments.map(
    (s) => (s.loudness_max - minSegmentLoudness) / loudnessRange
  );

  // Build energy arrays from segment pitches
  // Pitches are 12 values (C, C#, D, ..., B) with values 0-1
  // Group into bass (0-3), mid (4-7), high (8-11)
  const bass_energy: number[] = [];
  const mid_energy: number[] = [];
  const high_energy: number[] = [];

  segments.forEach((seg) => {
    const pitches = seg.pitches;
    const bass = (pitches[0] + pitches[1] + pitches[2] + pitches[3]) / 4;
    const mid = (pitches[4] + pitches[5] + pitches[6] + pitches[7]) / 4;
    const high = (pitches[8] + pitches[9] + pitches[10] + pitches[11]) / 4;
    bass_energy.push(bass);
    mid_energy.push(mid);
    high_energy.push(high);
  });

  // Build intensity curve from segment loudness
  const intensity_curve = segments.map((s) => normalizeLoudness(s.loudness_max));

  // Build energy curve (same as intensity for now)
  const energy_curve = [...intensity_curve];

  // Build energy segments (simplified)
  const energy_segments = sections.map((sec) => ({
    start: sec.start,
    end: sec.start + sec.duration,
    level: sec.loudness > -10 ? 'high' : sec.loudness > -20 ? 'medium' : 'low',
  }));

  // Build labeled segments from sections
  const maxSectionLoudness = Math.max(...sections.map((s) => s.loudness));
  const labeledSegments = sections.map((sec, i) => ({
    start: sec.start,
    end: sec.start + sec.duration,
    label: inferSectionLabel(i, sections.length, sec.loudness, maxSectionLoudness),
  }));

  return {
    bpm: track.tempo,
    duration: track.duration,
    beat_times,
    downbeat_times,
    onset_times,
    onset_strengths,
    energy_curve,
    energy_segments,
    bass_energy,
    mid_energy,
    high_energy,
    segments: labeledSegments,
    intensity_curve,
  };
}
```

**Step 2: Commit**

```bash
git add frontend/src/lib/spotify/
git commit -m "feat(frontend): add Spotify analysis to AudioFeatures transformer"
```

---

## Task 8: Frontend - Spotify Pattern Hook

**Files:**
- Create: `frontend/src/hooks/useSpotifyPattern.ts`
- Modify: `frontend/src/hooks/index.ts`

**Step 1: Create the hook**

```typescript
// frontend/src/hooks/useSpotifyPattern.ts

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { spotifyApi } from '@/lib/spotify/api';
import { transformSpotifyAnalysis } from '@/lib/spotify/transform';
import type { GamePattern } from '@/lib/pattern-types';
import type { SpotifyTrack } from '@/lib/spotify/types';

interface GenerateSpotifyPatternInput {
  track: SpotifyTrack;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

interface GeneratePatternResponse {
  data: GamePattern;
}

export function useSpotifyPattern() {
  return useMutation({
    mutationFn: async ({ track, difficulty }: GenerateSpotifyPatternInput) => {
      // 1. Fetch audio analysis from Spotify
      const analysis = await spotifyApi.getAudioAnalysis(track.id);

      // 2. Transform to AudioFeatures format
      const features = transformSpotifyAnalysis(analysis);

      // 3. Call backend to generate pattern
      const response = await api.post<GeneratePatternResponse>(
        '/spotify/generate-pattern',
        {
          trackId: track.id,
          title: track.name,
          artist: track.artists.map((a) => a.name).join(', '),
          duration: track.duration_ms / 1000,
          difficulty,
          features,
        }
      );

      return response.data;
    },
  });
}
```

**Step 2: Export from hooks index**

Add to `frontend/src/hooks/index.ts`:

```typescript
export * from './useSpotifyPattern';
```

**Step 3: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat(frontend): add useSpotifyPattern hook"
```

---

## Task 9: Frontend - Spotify Wizard Component

**Files:**
- Create: `frontend/src/components/spotify-wizard/spotify-wizard.tsx`
- Create: `frontend/src/components/spotify-wizard/step-search.tsx`
- Create: `frontend/src/components/spotify-wizard/step-generate.tsx`
- Create: `frontend/src/components/spotify-wizard/index.ts`

**Step 1: Create step-search.tsx**

```typescript
// frontend/src/components/spotify-wizard/step-search.tsx

'use client';

import { motion } from 'framer-motion';
import { TrackSearch } from '@/components/spotify/track-search';
import { SpotifyLogin } from '@/components/spotify/spotify-login';
import { useSpotifyAuth } from '@/hooks/use-spotify-auth';
import type { Theme } from '@/lib/game-types';
import type { SpotifyTrack } from '@/lib/spotify/types';
import { themeStyles } from '@/lib/game-types';

interface StepSearchProps {
  theme: Theme;
  onTrackSelect: (track: SpotifyTrack) => void;
}

export function StepSearch({ theme, onTrackSelect }: StepSearchProps) {
  const { isAuthenticated } = useSpotifyAuth();
  const styles = themeStyles[theme];

  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="text-center py-8"
      >
        <p className="mb-4" style={{ color: styles.textColor }}>
          Connect to Spotify to search for songs
        </p>
        <SpotifyLogin />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <TrackSearch onTrackSelect={onTrackSelect} />
    </motion.div>
  );
}
```

**Step 2: Create step-generate.tsx**

```typescript
// frontend/src/components/spotify-wizard/step-generate.tsx

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSpotifyPattern } from '@/hooks/useSpotifyPattern';
import type { Theme } from '@/lib/game-types';
import type { SpotifyTrack } from '@/lib/spotify/types';
import type { GamePattern } from '@/lib/pattern-types';
import { themeStyles } from '@/lib/game-types';

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

const difficultyInfo: Record<Difficulty, { label: string; description: string; color: string }> = {
  easy: { label: 'Easy', description: 'Relaxed pace, simple patterns', color: '#4ade80' },
  medium: { label: 'Medium', description: 'Moderate challenge, some holds', color: '#facc15' },
  hard: { label: 'Hard', description: 'Fast pace, complex patterns', color: '#f97316' },
  expert: { label: 'Expert', description: 'Maximum intensity, for pros', color: '#ef4444' },
};

interface StepGenerateProps {
  theme: Theme;
  track: SpotifyTrack;
  onComplete: (pattern: GamePattern) => void;
}

export function StepGenerate({ theme, track, onComplete }: StepGenerateProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const generateMutation = useSpotifyPattern();
  const styles = themeStyles[theme];

  const handleGenerate = async () => {
    try {
      const pattern = await generateMutation.mutateAsync({ track, difficulty });
      onComplete(pattern);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Selected track info */}
      <div
        className="flex items-center gap-3 p-3 rounded-lg"
        style={{ background: `${styles.glowColor}10` }}
      >
        {track.album.images[0] ? (
          <img
            src={track.album.images[0].url}
            alt={track.album.name}
            className="w-12 h-12 rounded"
          />
        ) : (
          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
            <Music className="w-6 h-6" />
          </div>
        )}
        <div>
          <p className="font-medium" style={{ color: styles.textColor }}>
            {track.name}
          </p>
          <p className="text-sm opacity-60" style={{ color: styles.textColor }}>
            {track.artists.map((a) => a.name).join(', ')}
          </p>
        </div>
      </div>

      {/* Difficulty selection */}
      <div>
        <p className="text-sm mb-3 opacity-60" style={{ color: styles.textColor }}>
          Select difficulty level
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(difficultyInfo) as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              disabled={generateMutation.isPending}
              className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                difficulty === d ? 'scale-[1.02]' : 'opacity-60 hover:opacity-80'
              }`}
              style={{
                borderColor: difficulty === d ? difficultyInfo[d].color : 'transparent',
                background: difficulty === d ? `${difficultyInfo[d].color}15` : 'rgba(255,255,255,0.05)',
              }}
            >
              <p className="font-bold text-lg" style={{ color: difficultyInfo[d].color }}>
                {difficultyInfo[d].label}
              </p>
              <p className="text-xs opacity-70" style={{ color: styles.textColor }}>
                {difficultyInfo[d].description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {generateMutation.isError && (
        <p className="text-red-400 text-sm text-center">
          Generation failed. Please try again.
        </p>
      )}

      <Button
        onClick={handleGenerate}
        disabled={generateMutation.isPending}
        className="w-full"
        style={{ background: styles.glowColor, color: '#000' }}
      >
        {generateMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyzing & Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Pattern
          </>
        )}
      </Button>
    </motion.div>
  );
}
```

**Step 3: Create spotify-wizard.tsx**

```typescript
// frontend/src/components/spotify-wizard/spotify-wizard.tsx

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StepSearch } from './step-search';
import { StepGenerate } from './step-generate';
import type { Theme } from '@/lib/game-types';
import type { SpotifyTrack } from '@/lib/spotify/types';
import type { GamePattern } from '@/lib/pattern-types';
import { themeStyles } from '@/lib/game-types';

type WizardStep = 'search' | 'generate';

interface SpotifyWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (track: SpotifyTrack, pattern: GamePattern) => void;
  theme: Theme;
}

export function SpotifyWizard({ isOpen, onClose, onComplete, theme }: SpotifyWizardProps) {
  const [step, setStep] = useState<WizardStep>('search');
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const styles = themeStyles[theme];

  const handleTrackSelect = (track: SpotifyTrack) => {
    setSelectedTrack(track);
    setStep('generate');
  };

  const handleGenerateComplete = (pattern: GamePattern) => {
    if (selectedTrack) {
      onComplete(selectedTrack, pattern);
    }
    handleClose();
  };

  const handleClose = () => {
    setStep('search');
    setSelectedTrack(null);
    onClose();
  };

  const handleBack = () => {
    setStep('search');
    setSelectedTrack(null);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.9)' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-lg mx-4 rounded-2xl p-6"
        style={{
          background: 'rgba(20,20,30,0.95)',
          border: `1px solid ${styles.glowColor}40`,
          boxShadow: `0 0 40px ${styles.glowColor}20`,
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4"
          onClick={handleClose}
          style={{ color: styles.textColor }}
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2" style={{ color: styles.textColor }}>
            {step === 'search' ? 'Search Spotify' : 'Generate Pattern'}
          </h2>
          <div className="flex gap-2">
            {(['search', 'generate'] as WizardStep[]).map((s, i) => (
              <div
                key={s}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{
                  background:
                    i <= ['search', 'generate'].indexOf(step)
                      ? styles.glowColor
                      : 'rgba(255,255,255,0.1)',
                }}
              />
            ))}
          </div>
        </div>

        {step === 'generate' && (
          <button
            onClick={handleBack}
            className="text-sm opacity-60 hover:opacity-100 mb-4"
            style={{ color: styles.textColor }}
          >
            ← Back to search
          </button>
        )}

        <AnimatePresence mode="wait">
          {step === 'search' && (
            <StepSearch key="search" theme={theme} onTrackSelect={handleTrackSelect} />
          )}
          {step === 'generate' && selectedTrack && (
            <StepGenerate
              key="generate"
              theme={theme}
              track={selectedTrack}
              onComplete={handleGenerateComplete}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
```

**Step 4: Create index.ts**

```typescript
// frontend/src/components/spotify-wizard/index.ts

export { SpotifyWizard } from './spotify-wizard';
export { StepSearch } from './step-search';
export { StepGenerate } from './step-generate';
```

**Step 5: Commit**

```bash
git add frontend/src/components/spotify-wizard/
git commit -m "feat(frontend): add SpotifyWizard component"
```

---

## Task 10: Frontend - Integrate into Main Game

**Files:**
- Modify: `frontend/src/components/game-3d/rhythm-game-3d.tsx`
- Modify: `frontend/src/components/game-3d/overlays-3d.tsx`

**Step 1: Update rhythm-game-3d.tsx**

Add imports and state for Spotify:

```typescript
// Add to imports
import { SpotifyWizard } from '@/components/spotify-wizard';
import { SpotifyPlayer } from '@/components/spotify/spotify-player';
import type { SpotifyTrack } from '@/lib/spotify/types';

// Add to state in RhythmGame3D component (after uploadedSong state)
const [spotifyWizardOpen, setSpotifyWizardOpen] = useState(false);
const [spotifyTrack, setSpotifyTrack] = useState<SpotifyTrack | null>(null);
const [spotifyPattern, setSpotifyPattern] = useState<GamePattern | null>(null);
const [spotifyPosition, setSpotifyPosition] = useState(0);

// Update activePattern to include spotify
const activePattern = spotifyPattern || uploadedPattern || examplePattern;

// Add handler for Spotify complete
const handleSpotifyComplete = (track: SpotifyTrack, pattern: GamePattern) => {
  setSpotifyTrack(track);
  setSpotifyPattern(pattern);
  setUploadedPattern(null); // Clear uploaded if any
  setUploadedSong(null);
  setUsePattern(true);
  setSpotifyWizardOpen(false);
};

// Update useGame3D call to handle Spotify
const { gameState, startGame, pauseGame, endGame, mode } = useGame3D({
  pattern: usePattern ? activePattern : null,
  mode: usePattern ? 'pattern' : 'endless',
  audioUrl: spotifyTrack ? null : (uploadedSong?.fileUrl ?? null),
  spotifyPosition: spotifyTrack ? spotifyPosition : undefined,
});
```

Add SpotifyWizard and SpotifyPlayer to JSX:

```typescript
// Add after UploadWizard component
<SpotifyWizard
  isOpen={spotifyWizardOpen}
  onClose={() => setSpotifyWizardOpen(false)}
  onComplete={handleSpotifyComplete}
  theme={theme}
/>

{/* Add Spotify player when playing Spotify track */}
{spotifyTrack && gameState.isPlaying && (
  <div className="hidden">
    <SpotifyPlayer
      trackUri={spotifyTrack.uri}
      onPositionChange={setSpotifyPosition}
      autoPlay={true}
    />
  </div>
)}
```

Update StartScreen3D props:

```typescript
<StartScreen3D
  // ... existing props
  onSpotifyClick={() => setSpotifyWizardOpen(true)}
/>
```

**Step 2: Update overlays-3d.tsx StartScreen3D**

Add Spotify button to the start screen. Find the StartScreen3D component and add:

```typescript
// Add to props interface
onSpotifyClick?: () => void;

// Add button next to Upload Song button in the JSX
<Button
  onClick={onSpotifyClick}
  className="px-6 py-3"
  style={{
    background: '#1DB954', // Spotify green
    color: '#fff',
  }}
>
  <Music className="w-5 h-5 mr-2" />
  Search Spotify
</Button>
```

**Step 3: Verify frontend builds**

```bash
cd frontend
npm run build
# Should complete without errors
```

**Step 4: Commit**

```bash
git add frontend/src/components/game-3d/
git commit -m "feat(frontend): integrate Spotify wizard into main game"
```

---

## Task 11: Frontend - Update Game Hook for Spotify Sync

**Files:**
- Modify: `frontend/src/hooks/use-game-3d.ts`

**Step 1: Update hook to accept Spotify position**

Add `spotifyPosition` to the hook options and use it for tile timing when playing Spotify tracks.

The hook should:
1. Accept optional `spotifyPosition: number`
2. Use `spotifyPosition` instead of audio element time when provided
3. Keep existing audio element logic for uploaded songs

This is a surgical change - find where `currentTime` is read from audio element and add conditional:

```typescript
const currentTime = spotifyPosition !== undefined
  ? spotifyPosition
  : audioRef.current?.currentTime ?? 0;
```

**Step 2: Verify functionality**

Test that:
- Uploaded songs still work with audio element
- Spotify tracks use the position prop for sync

**Step 3: Commit**

```bash
git add frontend/src/hooks/use-game-3d.ts
git commit -m "feat(frontend): add Spotify position sync to game hook"
```

---

## Task 12: End-to-End Testing

**Step 1: Start all services**

```bash
# Terminal 1: Python audio service
cd audio-service
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2: Backend
cd backend
npm run dev

# Terminal 3: Frontend
cd frontend
npm run dev
```

**Step 2: Test the flow**

1. Open http://localhost:3000
2. Click "Search Spotify" button
3. Log in to Spotify if needed
4. Search for a song
5. Select a track
6. Choose difficulty
7. Click "Generate Pattern"
8. Verify pattern generates
9. Click "Play Now"
10. Verify game plays synced to Spotify audio

**Step 3: Fix any issues found**

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Spotify pattern generation integration"
```

---

## Summary

| Task | Component | Files |
|------|-----------|-------|
| 1-2 | Python endpoint | 2 files |
| 3-6 | Backend API | 5 files |
| 7-8 | Frontend utilities | 2 files |
| 9 | Spotify Wizard | 4 files |
| 10-11 | Game integration | 3 files |
| 12 | Testing | - |

**Total: ~16 files across 12 tasks**
