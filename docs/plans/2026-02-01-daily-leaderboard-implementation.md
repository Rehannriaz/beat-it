# Daily Leaderboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a daily challenge feature with leaderboard where players compete on the same Spotify song each day.

**Architecture:** Tab-based UI on StartScreen3D, deterministic song selection using date hash, Supabase for auth (email OTP) and score storage, guest nicknames for non-authenticated users.

**Tech Stack:** Supabase (auth + database), React Query, existing Spotify API, Radix UI components

---

## Task 1: Install and Configure Supabase Client

**Files:**
- Create: `frontend/src/lib/supabase.ts`
- Modify: `frontend/package.json`
- Create: `frontend/.env.local.example`

**Step 1: Install Supabase client**

Run:
```bash
cd frontend && npm install @supabase/supabase-js
```

**Step 2: Create Supabase client**

Create `frontend/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Step 3: Create env example file**

Create `frontend/.env.local.example`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Step 4: Commit**

```bash
git add frontend/src/lib/supabase.ts frontend/.env.local.example frontend/package.json frontend/package-lock.json
git commit -m "feat: add Supabase client configuration"
```

---

## Task 2: Create Database Schema

**Files:**
- Create: `supabase/migrations/001_daily_challenge.sql`

**Step 1: Create migration file**

Create `supabase/migrations/001_daily_challenge.sql`:

```sql
-- Profiles table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Daily scores table
CREATE TABLE IF NOT EXISTS daily_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  guest_name TEXT,
  challenge_date DATE NOT NULL,
  spotify_track_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  accuracy DECIMAL(5,2) NOT NULL,
  max_combo INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Either user_id or guest_name must be set
  CONSTRAINT user_or_guest CHECK (
    (user_id IS NOT NULL AND guest_name IS NULL) OR
    (user_id IS NULL AND guest_name IS NOT NULL)
  )
);

-- Index for fast leaderboard queries
CREATE INDEX idx_daily_scores_leaderboard
  ON daily_scores(challenge_date, score DESC);

-- Index for user's scores
CREATE INDEX idx_daily_scores_user
  ON daily_scores(user_id, challenge_date);

-- Enable RLS
ALTER TABLE daily_scores ENABLE ROW LEVEL SECURITY;

-- Anyone can read scores
CREATE POLICY "Scores are publicly readable"
  ON daily_scores FOR SELECT
  USING (true);

-- Authenticated users can insert their own scores
CREATE POLICY "Users can insert own scores"
  ON daily_scores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow guest score inserts (will be done via edge function or service role)
CREATE POLICY "Allow guest score inserts"
  ON daily_scores FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND guest_name IS NOT NULL);
```

**Step 2: Apply migration to Supabase**

Run this SQL in your Supabase dashboard SQL editor, or use the Supabase CLI:
```bash
supabase db push
```

**Step 3: Commit**

```bash
mkdir -p supabase/migrations
git add supabase/migrations/001_daily_challenge.sql
git commit -m "feat: add database schema for daily challenge"
```

---

## Task 3: Create Daily Challenge Types

**Files:**
- Create: `frontend/src/types/daily-challenge.ts`

**Step 1: Create types file**

Create `frontend/src/types/daily-challenge.ts`:

```typescript
export interface DailyScore {
  id: string
  user_id: string | null
  guest_name: string | null
  challenge_date: string
  spotify_track_id: string
  score: number
  accuracy: number
  max_combo: number
  created_at: string
  // Joined from profiles
  display_name?: string
}

export interface LeaderboardEntry {
  rank: number
  name: string
  score: number
  accuracy: number
  max_combo: number
  is_current_user: boolean
}

export interface DailyChallengeInfo {
  date: string
  songIndex: number
  trackId: string | null
  trackName: string | null
  artistName: string | null
  albumArt: string | null
}

export interface ScoreSubmission {
  challenge_date: string
  spotify_track_id: string
  score: number
  accuracy: number
  max_combo: number
}
```

**Step 2: Commit**

```bash
git add frontend/src/types/daily-challenge.ts
git commit -m "feat: add TypeScript types for daily challenge"
```

---

## Task 4: Create Daily Song Selection Logic

**Files:**
- Create: `frontend/src/lib/daily-challenge.ts`

**Step 1: Create daily challenge utility**

Create `frontend/src/lib/daily-challenge.ts`:

```typescript
/**
 * Deterministic daily song selection
 * Uses date as seed to always select the same song for a given day
 */

// Spotify's "Today's Top Hits" playlist ID
export const TOP_HITS_PLAYLIST_ID = '37i9dQZF1DXcBWIGoYBM5M'

/**
 * Hash a date string to get a deterministic index
 */
function hashDateToIndex(dateString: string, max: number): number {
  let hash = 0
  for (const char of dateString) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0)
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash) % max
}

/**
 * Get today's date in UTC as YYYY-MM-DD
 */
export function getTodayUTC(): string {
  const now = new Date()
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  )).toISOString().split('T')[0]
}

/**
 * Get the song index for a given date
 */
export function getDailySongIndex(date: string, playlistLength: number): number {
  return hashDateToIndex(date, playlistLength)
}

/**
 * Get time until next daily reset (midnight UTC)
 */
export function getTimeUntilReset(): { hours: number; minutes: number; seconds: number } {
  const now = new Date()
  const tomorrow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  ))

  const diff = tomorrow.getTime() - now.getTime()

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { hours, minutes, seconds }
}

/**
 * Format time until reset as HH:MM:SS
 */
export function formatTimeUntilReset(): string {
  const { hours, minutes, seconds } = getTimeUntilReset()
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
```

**Step 2: Commit**

```bash
git add frontend/src/lib/daily-challenge.ts
git commit -m "feat: add deterministic daily song selection logic"
```

---

## Task 5: Add Accuracy Tracking to Game State

**Files:**
- Modify: `frontend/src/hooks/use-game-3d.ts`

**Step 1: Add hit counters to GameState3D interface**

In `frontend/src/hooks/use-game-3d.ts`, find the `GameState3D` interface (around line 26) and add:

```typescript
export interface GameState3D {
  tiles: Tile3D[]
  score: number
  combo: number
  maxCombo: number
  isPlaying: boolean
  isPaused: boolean
  gameOver: boolean
  gameTime: number
  lastHitFeedback: { lane: number; type: 'perfect' | 'good' | 'miss'; time: number } | null
  // New accuracy tracking
  perfectHits: number
  goodHits: number
  misses: number
}
```

**Step 2: Initialize counters in initial state**

Find the initial state object and add the new fields:

```typescript
const initialState: GameState3D = {
  tiles: [],
  score: 0,
  combo: 0,
  maxCombo: 0,
  isPlaying: false,
  isPaused: false,
  gameOver: false,
  gameTime: 0,
  lastHitFeedback: null,
  perfectHits: 0,
  goodHits: 0,
  misses: 0,
}
```

**Step 3: Increment counters on hits/misses**

Find where `hitType === 'perfect'` and `hitType === 'good'` are used in score calculation and add counter increments. Also increment `misses` when a tile is marked as missed.

**Step 4: Add accuracy calculation helper**

Add this function to the hook's return or as a utility:

```typescript
const calculateAccuracy = useCallback(() => {
  const total = gameState.perfectHits + gameState.goodHits + gameState.misses
  if (total === 0) return 100
  return ((gameState.perfectHits + gameState.goodHits) / total) * 100
}, [gameState.perfectHits, gameState.goodHits, gameState.misses])
```

**Step 5: Return accuracy from hook**

Add to the hook's return object:

```typescript
return {
  gameState,
  startGame,
  pauseGame,
  endGame,
  hitTile,
  mode,
  speed,
  pressedKeys,
  debugInfo,
  accuracy: calculateAccuracy(),
}
```

**Step 6: Commit**

```bash
git add frontend/src/hooks/use-game-3d.ts
git commit -m "feat: add accuracy tracking to game state"
```

---

## Task 6: Create Auth Hook

**Files:**
- Create: `frontend/src/hooks/use-auth.ts`
- Modify: `frontend/src/hooks/index.ts`

**Step 1: Create auth hook**

Create `frontend/src/hooks/use-auth.ts`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  display_name: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('id', userId)
      .single()

    setProfile(data)
    setLoading(false)
  }

  const signInWithOtp = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })
    return { error }
  }, [])

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })
    return { data, error }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const updateDisplayName = useCallback(async (displayName: string) => {
    if (!user) return { error: new Error('Not authenticated') }

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', user.id)

    if (!error) {
      setProfile(prev => prev ? { ...prev, display_name: displayName } : null)
    }

    return { error }
  }, [user])

  return {
    user,
    profile,
    loading,
    signInWithOtp,
    verifyOtp,
    signOut,
    updateDisplayName,
    isAuthenticated: !!user,
  }
}
```

**Step 2: Export from hooks index**

Add to `frontend/src/hooks/index.ts`:

```typescript
export * from './use-auth';
```

**Step 3: Commit**

```bash
git add frontend/src/hooks/use-auth.ts frontend/src/hooks/index.ts
git commit -m "feat: add Supabase auth hook with email OTP"
```

---

## Task 7: Create Leaderboard Hook

**Files:**
- Create: `frontend/src/hooks/use-leaderboard.ts`
- Modify: `frontend/src/hooks/index.ts`

**Step 1: Create leaderboard hook**

Create `frontend/src/hooks/use-leaderboard.ts`:

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { LeaderboardEntry, ScoreSubmission, DailyScore } from '@/types/daily-challenge'
import { useAuth } from './use-auth'

export const leaderboardKeys = {
  all: ['leaderboard'] as const,
  daily: (date: string) => [...leaderboardKeys.all, 'daily', date] as const,
  userBest: (date: string, userId: string) => [...leaderboardKeys.all, 'userBest', date, userId] as const,
}

export function useLeaderboard(challengeDate: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: leaderboardKeys.daily(challengeDate),
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const { data, error } = await supabase
        .from('daily_scores')
        .select(`
          id,
          user_id,
          guest_name,
          score,
          accuracy,
          max_combo,
          profiles!left(display_name)
        `)
        .eq('challenge_date', challengeDate)
        .order('score', { ascending: false })
        .limit(50)

      if (error) throw error

      return (data || []).map((entry: DailyScore & { profiles?: { display_name: string } | null }, index: number) => ({
        rank: index + 1,
        name: entry.profiles?.display_name || entry.guest_name || 'Anonymous',
        score: entry.score,
        accuracy: entry.accuracy,
        max_combo: entry.max_combo,
        is_current_user: entry.user_id === user?.id,
      }))
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}

export function useUserBestScore(challengeDate: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: leaderboardKeys.userBest(challengeDate, user?.id || 'guest'),
    queryFn: async () => {
      if (!user) return null

      const { data, error } = await supabase
        .from('daily_scores')
        .select('score, accuracy, max_combo')
        .eq('challenge_date', challengeDate)
        .eq('user_id', user.id)
        .order('score', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
      return data
    },
    enabled: !!user,
  })
}

export function useSubmitScore() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (params: ScoreSubmission & { guest_name?: string }) => {
      const { challenge_date, spotify_track_id, score, accuracy, max_combo, guest_name } = params

      const insertData = user
        ? {
            user_id: user.id,
            challenge_date,
            spotify_track_id,
            score,
            accuracy,
            max_combo,
          }
        : {
            guest_name: guest_name!,
            challenge_date,
            spotify_track_id,
            score,
            accuracy,
            max_combo,
          }

      const { data, error } = await supabase
        .from('daily_scores')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: leaderboardKeys.daily(variables.challenge_date),
      })
      if (user) {
        queryClient.invalidateQueries({
          queryKey: leaderboardKeys.userBest(variables.challenge_date, user.id),
        })
      }
    },
  })
}
```

**Step 2: Export from hooks index**

Add to `frontend/src/hooks/index.ts`:

```typescript
export * from './use-leaderboard';
```

**Step 3: Commit**

```bash
git add frontend/src/hooks/use-leaderboard.ts frontend/src/hooks/index.ts
git commit -m "feat: add leaderboard hooks for fetching and submitting scores"
```

---

## Task 8: Create Daily Challenge Hook

**Files:**
- Create: `frontend/src/hooks/use-daily-challenge.ts`
- Modify: `frontend/src/hooks/index.ts`

**Step 1: Create daily challenge hook**

Create `frontend/src/hooks/use-daily-challenge.ts`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { spotifyApi } from '@/lib/spotify/api'
import { getStoredAccessToken } from '@/lib/spotify/auth'
import { getTodayUTC, getDailySongIndex, TOP_HITS_PLAYLIST_ID, getTimeUntilReset } from '@/lib/daily-challenge'
import type { DailyChallengeInfo } from '@/types/daily-challenge'
import type { SpotifyTrack } from '@/lib/spotify/types'

const PLAYLIST_CACHE_KEY = 'daily_challenge_playlist'
const PLAYLIST_CACHE_TTL = 60 * 60 * 1000 // 1 hour

interface CachedPlaylist {
  tracks: SpotifyTrack[]
  cachedAt: number
}

export function useDailyChallenge() {
  const [countdown, setCountdown] = useState(getTimeUntilReset())
  const today = getTodayUTC()

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getTimeUntilReset())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const { data: challengeInfo, isLoading, error, refetch } = useQuery({
    queryKey: ['dailyChallenge', today],
    queryFn: async (): Promise<DailyChallengeInfo> => {
      const token = getStoredAccessToken()
      if (!token) {
        return {
          date: today,
          songIndex: 0,
          trackId: null,
          trackName: null,
          artistName: null,
          albumArt: null,
        }
      }

      // Check cache first
      const cached = localStorage.getItem(PLAYLIST_CACHE_KEY)
      let tracks: SpotifyTrack[] = []

      if (cached) {
        const parsedCache: CachedPlaylist = JSON.parse(cached)
        if (Date.now() - parsedCache.cachedAt < PLAYLIST_CACHE_TTL) {
          tracks = parsedCache.tracks
        }
      }

      // Fetch if not cached
      if (tracks.length === 0) {
        const response = await spotifyApi.getPlaylistTracks(TOP_HITS_PLAYLIST_ID, 100)
        tracks = response.items.map(item => item.track)

        localStorage.setItem(PLAYLIST_CACHE_KEY, JSON.stringify({
          tracks,
          cachedAt: Date.now(),
        }))
      }

      const songIndex = getDailySongIndex(today, tracks.length)
      const track = tracks[songIndex]

      return {
        date: today,
        songIndex,
        trackId: track?.id || null,
        trackName: track?.name || null,
        artistName: track?.artists[0]?.name || null,
        albumArt: track?.album?.images[0]?.url || null,
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const hasSpotifyAuth = !!getStoredAccessToken()

  return {
    challengeInfo,
    isLoading,
    error,
    refetch,
    countdown,
    countdownFormatted: `${countdown.hours.toString().padStart(2, '0')}:${countdown.minutes.toString().padStart(2, '0')}:${countdown.seconds.toString().padStart(2, '0')}`,
    hasSpotifyAuth,
  }
}
```

**Step 2: Export from hooks index**

Add to `frontend/src/hooks/index.ts`:

```typescript
export * from './use-daily-challenge';
```

**Step 3: Commit**

```bash
git add frontend/src/hooks/use-daily-challenge.ts frontend/src/hooks/index.ts
git commit -m "feat: add daily challenge hook with song selection"
```

---

## Task 9: Create Countdown Timer Component

**Files:**
- Create: `frontend/src/components/daily-challenge/countdown-timer.tsx`

**Step 1: Create countdown component**

Create `frontend/src/components/daily-challenge/countdown-timer.tsx`:

```typescript
'use client'

import { Clock } from 'lucide-react'

interface CountdownTimerProps {
  timeFormatted: string
  textColor: string
  glowColor: string
}

export function CountdownTimer({ timeFormatted, textColor, glowColor }: CountdownTimerProps) {
  return (
    <div
      className="flex items-center gap-2 text-sm opacity-70"
      style={{ color: textColor }}
    >
      <Clock className="w-4 h-4" style={{ color: glowColor }} />
      <span>Resets in {timeFormatted}</span>
    </div>
  )
}
```

**Step 2: Commit**

```bash
mkdir -p frontend/src/components/daily-challenge
git add frontend/src/components/daily-challenge/countdown-timer.tsx
git commit -m "feat: add countdown timer component"
```

---

## Task 10: Create Leaderboard List Component

**Files:**
- Create: `frontend/src/components/daily-challenge/leaderboard-list.tsx`

**Step 1: Create leaderboard list component**

Create `frontend/src/components/daily-challenge/leaderboard-list.tsx`:

```typescript
'use client'

import { Trophy, Medal } from 'lucide-react'
import type { LeaderboardEntry } from '@/types/daily-challenge'

interface LeaderboardListProps {
  entries: LeaderboardEntry[]
  isLoading: boolean
  textColor: string
  glowColor: string
  laneColors: string[]
}

export function LeaderboardList({
  entries,
  isLoading,
  textColor,
  glowColor,
  laneColors
}: LeaderboardListProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8 opacity-60" style={{ color: textColor }}>
        Loading leaderboard...
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 opacity-60" style={{ color: textColor }}>
        No scores yet. Be the first to play!
      </div>
    )
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4" style={{ color: '#FFD700' }} />
    if (rank === 2) return <Medal className="w-4 h-4" style={{ color: '#C0C0C0' }} />
    if (rank === 3) return <Medal className="w-4 h-4" style={{ color: '#CD7F32' }} />
    return <span className="w-4 text-center text-xs opacity-60">#{rank}</span>
  }

  return (
    <div className="space-y-1 max-h-64 overflow-y-auto">
      {entries.map((entry) => (
        <div
          key={`${entry.rank}-${entry.name}`}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
            entry.is_current_user ? 'ring-2' : ''
          }`}
          style={{
            background: entry.is_current_user ? `${glowColor}20` : 'rgba(255,255,255,0.05)',
            color: textColor,
            ringColor: entry.is_current_user ? glowColor : undefined,
          }}
        >
          <div className="w-6 flex justify-center">
            {getRankIcon(entry.rank)}
          </div>

          <div className="flex-1 min-w-0">
            <span className="truncate font-medium text-sm">
              {entry.name}
              {entry.is_current_user && <span className="ml-1 opacity-60">(you)</span>}
            </span>
          </div>

          <div className="text-right text-sm">
            <div className="font-bold" style={{ color: laneColors[0] }}>
              {entry.score.toLocaleString()}
            </div>
            <div className="text-xs opacity-60">
              {entry.accuracy.toFixed(1)}% • {entry.max_combo}x
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/daily-challenge/leaderboard-list.tsx
git commit -m "feat: add leaderboard list component"
```

---

## Task 11: Create Auth Modal Component

**Files:**
- Create: `frontend/src/components/auth/auth-modal.tsx`

**Step 1: Create auth modal component**

Create `frontend/src/components/auth/auth-modal.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Loader2, CheckCircle } from 'lucide-react'
import { useAuth } from '@/hooks'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  textColor: string
  glowColor: string
}

type Step = 'email' | 'otp' | 'success'

export function AuthModal({ isOpen, onClose, onSuccess, textColor, glowColor }: AuthModalProps) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signInWithOtp, verifyOtp } = useAuth()

  const handleSendCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email')
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await signInWithOtp(email)

    if (error) {
      setError(error.message)
    } else {
      setStep('otp')
    }

    setLoading(false)
  }

  const handleVerifyCode = async () => {
    if (!otp.trim() || otp.length < 6) {
      setError('Please enter the 6-digit code')
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await verifyOtp(email, otp)

    if (error) {
      setError(error.message)
    } else {
      setStep('success')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1000)
    }

    setLoading(false)
  }

  const handleClose = () => {
    setStep('email')
    setEmail('')
    setOtp('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-sm rounded-2xl p-6"
        style={{
          background: 'rgba(20,20,30,0.95)',
          border: `1px solid ${glowColor}40`,
          boxShadow: `0 0 40px ${glowColor}20`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: textColor }}
        >
          <X className="w-5 h-5" />
        </button>

        <AnimatePresence mode="wait">
          {step === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-6 h-6" style={{ color: glowColor }} />
                <h3 className="text-lg font-bold" style={{ color: textColor }}>
                  Sign in with Email
                </h3>
              </div>

              <p className="text-sm opacity-60 mb-4" style={{ color: textColor }}>
                We'll send you a code to verify your email
              </p>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
                         focus:border-opacity-50 focus:outline-none transition-colors mb-4"
                style={{
                  color: textColor,
                  borderColor: error ? '#ef4444' : `${textColor}20`,
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
              />

              {error && (
                <p className="text-sm text-red-400 mb-4">{error}</p>
              )}

              <button
                onClick={handleSendCode}
                disabled={loading}
                className="w-full py-3 rounded-lg font-medium transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: glowColor,
                  color: '#000',
                }}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Send Code'
                )}
              </button>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <h3 className="text-lg font-bold mb-2" style={{ color: textColor }}>
                Enter Code
              </h3>

              <p className="text-sm opacity-60 mb-4" style={{ color: textColor }}>
                We sent a code to {email}
              </p>

              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
                         focus:border-opacity-50 focus:outline-none transition-colors mb-4
                         text-center text-2xl tracking-widest font-mono"
                style={{
                  color: textColor,
                  borderColor: error ? '#ef4444' : `${textColor}20`,
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
              />

              {error && (
                <p className="text-sm text-red-400 mb-4">{error}</p>
              )}

              <button
                onClick={handleVerifyCode}
                disabled={loading}
                className="w-full py-3 rounded-lg font-medium transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: glowColor,
                  color: '#000',
                }}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Verify'
                )}
              </button>

              <button
                onClick={() => setStep('email')}
                className="w-full mt-3 text-sm opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: textColor }}
              >
                Use a different email
              </button>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#22c55e' }} />
              <h3 className="text-lg font-bold" style={{ color: textColor }}>
                Signed in!
              </h3>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
```

**Step 2: Commit**

```bash
mkdir -p frontend/src/components/auth
git add frontend/src/components/auth/auth-modal.tsx
git commit -m "feat: add email OTP auth modal component"
```

---

## Task 12: Create Score Submit Modal Component

**Files:**
- Create: `frontend/src/components/daily-challenge/score-submit-modal.tsx`

**Step 1: Create score submit modal component**

Create `frontend/src/components/daily-challenge/score-submit-modal.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, User, Loader2, Trophy } from 'lucide-react'
import { useAuth, useSubmitScore } from '@/hooks'
import { AuthModal } from '@/components/auth/auth-modal'

interface ScoreSubmitModalProps {
  isOpen: boolean
  onClose: () => void
  score: number
  accuracy: number
  maxCombo: number
  challengeDate: string
  spotifyTrackId: string
  textColor: string
  glowColor: string
  laneColors: string[]
}

export function ScoreSubmitModal({
  isOpen,
  onClose,
  score,
  accuracy,
  maxCombo,
  challengeDate,
  spotifyTrackId,
  textColor,
  glowColor,
  laneColors,
}: ScoreSubmitModalProps) {
  const [showAuth, setShowAuth] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const { profile, isAuthenticated } = useAuth()
  const submitScore = useSubmitScore()

  const handleSubmitAsUser = async () => {
    if (!isAuthenticated) {
      setShowAuth(true)
      return
    }

    await submitScore.mutateAsync({
      challenge_date: challengeDate,
      spotify_track_id: spotifyTrackId,
      score,
      accuracy,
      max_combo: maxCombo,
    })
    setSubmitted(true)
  }

  const handleSubmitAsGuest = async () => {
    if (!guestName.trim() || guestName.length < 2) return

    await submitScore.mutateAsync({
      challenge_date: challengeDate,
      spotify_track_id: spotifyTrackId,
      score,
      accuracy,
      max_combo: maxCombo,
      guest_name: guestName.trim(),
    })
    setSubmitted(true)
  }

  const handleAuthSuccess = () => {
    setShowAuth(false)
  }

  if (!isOpen) return null

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.85)' }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-md rounded-2xl p-6"
          style={{
            background: 'rgba(20,20,30,0.95)',
            border: `1px solid ${glowColor}40`,
            boxShadow: `0 0 60px ${glowColor}30`,
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: textColor }}
          >
            <X className="w-5 h-5" />
          </button>

          {submitted ? (
            <div className="text-center py-8">
              <Trophy className="w-16 h-16 mx-auto mb-4" style={{ color: '#FFD700' }} />
              <h2 className="text-2xl font-bold mb-2" style={{ color: textColor }}>
                Score Submitted!
              </h2>
              <p className="opacity-60 mb-6" style={{ color: textColor }}>
                Check the leaderboard to see your rank
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-lg font-medium"
                style={{ background: glowColor, color: '#000' }}
              >
                View Leaderboard
              </button>
            </div>
          ) : (
            <>
              <h2
                className="text-2xl font-bold text-center mb-6"
                style={{ color: textColor }}
              >
                Challenge Complete!
              </h2>

              {/* Score display */}
              <div className="text-center mb-6 space-y-2">
                <div>
                  <div className="text-sm opacity-60" style={{ color: textColor }}>Score</div>
                  <div
                    className="text-4xl font-bold"
                    style={{ color: laneColors[0], textShadow: `0 0 20px ${laneColors[0]}60` }}
                  >
                    {score.toLocaleString()}
                  </div>
                </div>
                <div className="flex justify-center gap-8">
                  <div>
                    <div className="text-sm opacity-60" style={{ color: textColor }}>Accuracy</div>
                    <div className="text-xl font-bold" style={{ color: laneColors[1] }}>
                      {accuracy.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm opacity-60" style={{ color: textColor }}>Max Combo</div>
                    <div className="text-xl font-bold" style={{ color: laneColors[2] }}>
                      {maxCombo}x
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="border-t pt-6 space-y-4"
                style={{ borderColor: `${textColor}20` }}
              >
                <p className="text-center text-sm opacity-60" style={{ color: textColor }}>
                  Submit your score to the leaderboard
                </p>

                {/* Sign in option */}
                <button
                  onClick={handleSubmitAsUser}
                  disabled={submitScore.isPending}
                  className="w-full py-3 rounded-lg font-medium transition-all
                           disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: glowColor, color: '#000' }}
                >
                  {submitScore.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <User className="w-5 h-5" />
                      {isAuthenticated
                        ? `Submit as ${profile?.display_name || 'User'}`
                        : 'Sign in with Email'
                      }
                    </>
                  )}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" style={{ borderColor: `${textColor}20` }} />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2" style={{ background: 'rgba(20,20,30,0.95)', color: textColor }}>
                      or
                    </span>
                  </div>
                </div>

                {/* Guest option */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value.slice(0, 20))}
                    placeholder="Enter nickname"
                    className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10
                             focus:border-opacity-50 focus:outline-none transition-colors"
                    style={{ color: textColor }}
                  />
                  <button
                    onClick={handleSubmitAsGuest}
                    disabled={!guestName.trim() || guestName.length < 2 || submitScore.isPending}
                    className="px-4 py-3 rounded-lg font-medium transition-all
                             disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      color: textColor,
                      border: `1px solid ${textColor}30`,
                    }}
                  >
                    Submit
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="w-full text-sm opacity-60 hover:opacity-100 transition-opacity py-2"
                  style={{ color: textColor }}
                >
                  Skip
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={handleAuthSuccess}
        textColor={textColor}
        glowColor={glowColor}
      />
    </>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/daily-challenge/score-submit-modal.tsx
git commit -m "feat: add score submit modal with auth and guest options"
```

---

## Task 13: Create Daily Challenge Tab Component

**Files:**
- Create: `frontend/src/components/daily-challenge/daily-challenge-tab.tsx`

**Step 1: Create daily challenge tab component**

Create `frontend/src/components/daily-challenge/daily-challenge-tab.tsx`:

```typescript
'use client'

import { motion } from 'framer-motion'
import { Play, Music, Loader2, AlertCircle } from 'lucide-react'
import { useDailyChallenge, useLeaderboard, useUserBestScore } from '@/hooks'
import { CountdownTimer } from './countdown-timer'
import { LeaderboardList } from './leaderboard-list'
import type { Theme } from '@/lib/game-types'
import { themeStyles } from '@/lib/game-types'

interface DailyChallengeTabProps {
  theme: Theme
  onPlay: (trackId: string) => void
  onSpotifyAuth: () => void
}

export function DailyChallengeTab({ theme, onPlay, onSpotifyAuth }: DailyChallengeTabProps) {
  const styles = themeStyles[theme]
  const { challengeInfo, isLoading, countdownFormatted, hasSpotifyAuth } = useDailyChallenge()
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(
    challengeInfo?.date || ''
  )
  const { data: userBest } = useUserBestScore(challengeInfo?.date || '')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: styles.glowColor }} />
      </div>
    )
  }

  if (!hasSpotifyAuth) {
    return (
      <div className="text-center py-8 px-4">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-60" style={{ color: styles.textColor }} />
        <h3 className="text-lg font-bold mb-2" style={{ color: styles.textColor }}>
          Spotify Connection Required
        </h3>
        <p className="text-sm opacity-60 mb-6" style={{ color: styles.textColor }}>
          Connect your Spotify account to play the daily challenge
        </p>
        <button
          onClick={onSpotifyAuth}
          className="px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 mx-auto"
          style={{ background: '#1DB954', color: '#000' }}
        >
          <Music className="w-5 h-5" />
          Connect Spotify
        </button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg mx-auto px-4"
    >
      {/* Today's Challenge Header */}
      <div className="text-center mb-6">
        <h2
          className="text-xl font-bold mb-1"
          style={{ color: styles.textColor }}
        >
          Today's Challenge
        </h2>
        <CountdownTimer
          timeFormatted={countdownFormatted}
          textColor={styles.textColor}
          glowColor={styles.glowColor}
        />
      </div>

      {/* Song Card */}
      {challengeInfo?.trackId && (
        <div
          className="rounded-xl p-4 mb-6"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${styles.glowColor}30`,
          }}
        >
          <div className="flex items-center gap-4">
            {challengeInfo.albumArt && (
              <img
                src={challengeInfo.albumArt}
                alt="Album art"
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3
                className="font-bold truncate"
                style={{ color: styles.textColor }}
              >
                {challengeInfo.trackName}
              </h3>
              <p
                className="text-sm opacity-60 truncate"
                style={{ color: styles.textColor }}
              >
                {challengeInfo.artistName}
              </p>
            </div>
          </div>

          <button
            onClick={() => onPlay(challengeInfo.trackId!)}
            className="w-full mt-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
            style={{
              background: styles.glowColor,
              color: '#000',
              boxShadow: `0 0 20px ${styles.glowColor}40`,
            }}
          >
            <Play className="w-5 h-5" />
            Play Challenge
          </button>
        </div>
      )}

      {/* User's Best */}
      {userBest && (
        <div
          className="rounded-lg px-4 py-3 mb-4 text-center"
          style={{
            background: `${styles.glowColor}15`,
            border: `1px solid ${styles.glowColor}30`,
          }}
        >
          <span className="text-sm opacity-60" style={{ color: styles.textColor }}>
            Your Best Today:
          </span>
          <span className="ml-2 font-bold" style={{ color: styles.laneColors[0] }}>
            {userBest.score.toLocaleString()}
          </span>
          <span className="ml-2 text-sm opacity-60" style={{ color: styles.textColor }}>
            ({userBest.accuracy.toFixed(1)}% • {userBest.max_combo}x)
          </span>
        </div>
      )}

      {/* Leaderboard */}
      <div>
        <h3
          className="text-sm font-medium uppercase tracking-wider opacity-60 mb-3"
          style={{ color: styles.textColor }}
        >
          Leaderboard
        </h3>
        <LeaderboardList
          entries={leaderboard || []}
          isLoading={leaderboardLoading}
          textColor={styles.textColor}
          glowColor={styles.glowColor}
          laneColors={styles.laneColors}
        />
      </div>
    </motion.div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/daily-challenge/daily-challenge-tab.tsx
git commit -m "feat: add daily challenge tab component"
```

---

## Task 14: Add Tab Navigation to StartScreen3D

**Files:**
- Modify: `frontend/src/components/game-3d/overlays-3d.tsx`

**Step 1: Add tab state and TabNav component**

In `frontend/src/components/game-3d/overlays-3d.tsx`, add imports at the top:

```typescript
import { DailyChallengeTab } from '@/components/daily-challenge/daily-challenge-tab'
```

**Step 2: Create TabNav component**

Add this component before `StartScreen3D`:

```typescript
interface TabNavProps {
  activeTab: 'home' | 'daily'
  onTabChange: (tab: 'home' | 'daily') => void
  textColor: string
  glowColor: string
}

function TabNav({ activeTab, onTabChange, textColor, glowColor }: TabNavProps) {
  return (
    <div className="flex gap-2 mb-6">
      {(['home', 'daily'] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className="px-4 py-2 rounded-lg font-medium transition-all text-sm"
          style={{
            background: activeTab === tab ? glowColor : 'rgba(255,255,255,0.05)',
            color: activeTab === tab ? '#000' : textColor,
            opacity: activeTab === tab ? 1 : 0.6,
          }}
        >
          {tab === 'home' ? 'Home' : 'Daily Challenge'}
        </button>
      ))}
    </div>
  )
}
```

**Step 3: Modify StartScreen3DProps**

Add new props to `StartScreen3DProps`:

```typescript
interface StartScreen3DProps {
  theme: Theme
  onStart: () => void
  onThemeChange: (theme: Theme) => void
  pattern?: GamePattern | null
  patternLoading?: boolean
  usePattern?: boolean
  onToggleMode?: () => void
  onUploadClick?: () => void
  onSpotifyClick?: () => void
  // New props for daily challenge
  onDailyPlay?: (trackId: string) => void
}
```

**Step 4: Add tab state to StartScreen3D**

Inside `StartScreen3D`, add state:

```typescript
const [activeTab, setActiveTab] = useState<'home' | 'daily'>('home')
```

**Step 5: Render TabNav and conditionally show content**

In the JSX, after the title and before the mode selector, add the TabNav and wrap existing content in a conditional. The structure should be:

```tsx
{/* Tab Navigation */}
<motion.div
  initial={{ y: 20, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ delay: 0.35 }}
>
  <TabNav
    activeTab={activeTab}
    onTabChange={setActiveTab}
    textColor={styles.textColor}
    glowColor={styles.glowColor}
  />
</motion.div>

{activeTab === 'home' ? (
  {/* Existing home content */}
) : (
  <DailyChallengeTab
    theme={theme}
    onPlay={onDailyPlay || (() => {})}
    onSpotifyAuth={onSpotifyClick || (() => {})}
  />
)}
```

**Step 6: Commit**

```bash
git add frontend/src/components/game-3d/overlays-3d.tsx
git commit -m "feat: add tab navigation to StartScreen3D"
```

---

## Task 15: Integrate Daily Challenge in Main Game Component

**Files:**
- Modify: `frontend/src/components/game-3d/rhythm-game-3d.tsx`

**Step 1: Add imports**

Add at the top:

```typescript
import { ScoreSubmitModal } from '@/components/daily-challenge/score-submit-modal'
import { getTodayUTC } from '@/lib/daily-challenge'
```

**Step 2: Add state for daily challenge mode**

Add state variables:

```typescript
const [isDailyChallenge, setIsDailyChallenge] = useState(false)
const [dailyTrackId, setDailyTrackId] = useState<string | null>(null)
const [showScoreSubmit, setShowScoreSubmit] = useState(false)
```

**Step 3: Create handler for daily challenge play**

```typescript
const handleDailyPlay = async (trackId: string) => {
  setIsDailyChallenge(true)
  setDailyTrackId(trackId)
  // Fetch the track and pattern, then start
  // Similar to handleSpotifyComplete but for daily challenge
}
```

**Step 4: Modify game over handling**

When game ends, if `isDailyChallenge` is true, show the score submit modal:

```typescript
useEffect(() => {
  if (gameState.gameOver && isDailyChallenge && dailyTrackId) {
    setShowScoreSubmit(true)
  }
}, [gameState.gameOver, isDailyChallenge, dailyTrackId])
```

**Step 5: Add ScoreSubmitModal to JSX**

```typescript
{showScoreSubmit && dailyTrackId && (
  <ScoreSubmitModal
    isOpen={showScoreSubmit}
    onClose={() => {
      setShowScoreSubmit(false)
      setIsDailyChallenge(false)
    }}
    score={gameState.score}
    accuracy={accuracy}
    maxCombo={gameState.maxCombo}
    challengeDate={getTodayUTC()}
    spotifyTrackId={dailyTrackId}
    textColor={themeStyles[theme].textColor}
    glowColor={themeStyles[theme].glowColor}
    laneColors={themeStyles[theme].laneColors}
  />
)}
```

**Step 6: Pass onDailyPlay to StartScreen3D**

```typescript
<StartScreen3D
  // ... existing props
  onDailyPlay={handleDailyPlay}
/>
```

**Step 7: Commit**

```bash
git add frontend/src/components/game-3d/rhythm-game-3d.tsx
git commit -m "feat: integrate daily challenge mode in main game"
```

---

## Task 16: Test End-to-End Flow

**Step 1: Set up environment variables**

Create `.env.local` with your Supabase credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

**Step 2: Run the development server**

```bash
cd frontend && npm run dev
```

**Step 3: Manual testing checklist**

- [ ] Tab navigation switches between Home and Daily Challenge
- [ ] Daily Challenge tab shows Spotify auth prompt if not connected
- [ ] After Spotify auth, today's song appears with play button
- [ ] Countdown timer updates every second
- [ ] Playing the challenge starts the game
- [ ] After game over, score submit modal appears
- [ ] Can submit as guest with nickname
- [ ] Can sign in with email OTP
- [ ] Score appears on leaderboard after submission
- [ ] Your score is highlighted on leaderboard

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete daily leaderboard feature"
```

---

## Summary

This implementation adds:

1. **Supabase integration** - Client setup, auth with email OTP, database schema
2. **Daily song selection** - Deterministic algorithm using date as seed
3. **Game state enhancement** - Accuracy tracking (perfectHits, goodHits, misses)
4. **Auth system** - Email OTP login, guest nickname support
5. **Leaderboard** - Real-time scores display with user highlighting
6. **UI components** - Tab navigation, daily challenge tab, score submit modal
7. **Full integration** - Daily challenge mode flows through game to score submission

Total new files: 12
Modified files: 4
