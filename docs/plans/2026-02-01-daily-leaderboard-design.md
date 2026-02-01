# Daily Leaderboard Feature Design

## Overview

A daily challenge feature where all players compete on the same randomly-selected song from Spotify's Top 100. The leaderboard resets at midnight UTC.

## User Stories

- As a player, I can see today's challenge song and play it
- As a player, I can submit my score with my account or as a guest with a nickname
- As a player, I can view the leaderboard and see where I rank
- As a player, I can sign up/login with just my email (OTP, no password)

## Architecture

### Flow Diagram

```
User opens app → Tabs: [Home] [Daily Challenge]
                              ↓
                   Fetches today's song (deterministic)
                              ↓
            ┌─────────────────┴─────────────────┐
            ↓                                   ↓
    [Play Challenge]                    [View Leaderboard]
            ↓                                   ↓
      Game plays                      Shows top scores
            ↓                                   for today
      Game ends
            ↓
    Score submission modal
    (login or enter nickname)
            ↓
    Score saved → Leaderboard updates
```

### Key Decisions

- **Song Selection**: Deterministic algorithm using date as seed (no server-side cron needed)
- **Authentication**: Supabase email OTP (magic link, no password)
- **Guest Support**: Nickname entry for users who don't want to create an account
- **Reset Time**: Midnight UTC globally
- **Leaderboard Display**: Rank, name, score, accuracy %, max combo

## Database Schema (Supabase)

```sql
-- User profiles (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily challenge scores
CREATE TABLE daily_scores (
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

-- Row Level Security
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

-- Guest scores via Edge Function (separate policy)
```

## Daily Song Selection Algorithm

```typescript
// lib/daily-challenge.ts
function getDailySongIndex(date: Date): number {
  const dateString = date.toISOString().split('T')[0] // YYYY-MM-DD UTC

  let hash = 0
  for (const char of dateString) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0)
    hash = hash & hash
  }

  return Math.abs(hash) % 100
}

function getTodaysSong(): { index: number; date: string } {
  const now = new Date()
  const utcDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ))
  return {
    index: getDailySongIndex(utcDate),
    date: utcDate.toISOString().split('T')[0]
  }
}
```

**Fetching the Track:**
- Use Spotify API to fetch Top 100 playlist (e.g., "Today's Top Hits")
- Cache playlist in localStorage with 1-hour TTL
- Select track at computed index (wrap with modulo if needed)

## UI Components

### Tab Navigation (StartScreen3D)

```
┌─────────────────────────────────────────┐
│           RHYTHM RUSH                   │
│            3D Edition                   │
│                                         │
│    ┌──────────┐  ┌──────────────────┐   │
│    │   Home   │  │  Daily Challenge │   │
│    └──────────┘  └──────────────────┘   │
└─────────────────────────────────────────┘
```

### Daily Challenge Tab

```
┌─────────────────────────────────────────┐
│  TODAY'S CHALLENGE                      │
│  ─────────────────────                  │
│  Song: "Track Name"                     │
│  Artist: Artist Name                    │
│  Resets in: 14:32:05                    │
│                                         │
│  [ PLAY CHALLENGE ]                     │
│                                         │
│  ─────── LEADERBOARD ───────            │
│  #1  PlayerName    12,450  98%  245x    │
│  #2  GuestUser     11,200  95%  198x    │
│  #3  Another       10,800  92%  187x    │
│  ...                                    │
│  ─────────────────────────              │
│  Your Best: #15 - 8,200                 │
└─────────────────────────────────────────┘
```

### Score Submit Modal

```
┌───────────────────────────────┐
│      CHALLENGE COMPLETE!      │
│                               │
│   Score: 12,450               │
│   Accuracy: 94.2%             │
│   Max Combo: 187x             │
│                               │
│   ─── Submit Your Score ───   │
│                               │
│   [Sign in with Email]        │
│          - or -               │
│   Nickname: [___________]     │
│                               │
│   [Submit as Guest]           │
│   [Skip]                      │
└───────────────────────────────┘
```

### Auth Modal (Email OTP)

```
┌───────────────────────────────┐
│   Enter your email            │
│   [email@example.com    ]     │
│   [Send Code]                 │
│                               │
│   --- after code sent ---     │
│                               │
│   Enter the code sent to      │
│   email@example.com           │
│   [______]                    │
│   [Verify & Submit Score]     │
└───────────────────────────────┘
```

## File Structure

### New Files

```
frontend/src/
├── components/
│   ├── daily-challenge/
│   │   ├── daily-challenge-tab.tsx    # Main tab content
│   │   ├── leaderboard-list.tsx       # Score list component
│   │   ├── score-submit-modal.tsx     # Post-game submission
│   │   └── countdown-timer.tsx        # Reset countdown
│   └── auth/
│       └── auth-modal.tsx             # Email OTP flow
├── hooks/
│   ├── use-daily-challenge.ts         # Song selection + state
│   ├── use-leaderboard.ts             # Fetch/submit scores
│   └── use-auth.ts                    # Supabase auth wrapper
├── lib/
│   ├── daily-challenge.ts             # Date→song algorithm
│   └── supabase.ts                    # Supabase client
└── types/
    └── daily-challenge.ts             # Types for scores, etc.

supabase/
└── migrations/
    └── 001_daily_challenge.sql        # Tables + RLS policies
```

### Modified Files

- `overlays-3d.tsx` - Add tab navigation to StartScreen3D
- `rhythm-game-3d.tsx` - Track daily challenge mode, show submit modal

## Implementation Order

1. **Supabase Setup** - Auth configuration + database tables + RLS policies
2. **Daily Song Selection** - Deterministic algorithm + Spotify playlist fetch
3. **Tab UI** - Add tab navigation to StartScreen3D
4. **Daily Challenge Tab** - Song display + countdown timer
5. **Leaderboard Display** - Fetch and display scores (read-only)
6. **Score Submission** - Submit modal + guest nickname flow
7. **Auth Modal** - Email OTP signup/login
8. **Polish** - Animations, your-rank highlight, error handling
