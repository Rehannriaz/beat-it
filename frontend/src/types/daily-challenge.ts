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
