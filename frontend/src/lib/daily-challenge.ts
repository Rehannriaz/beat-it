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
