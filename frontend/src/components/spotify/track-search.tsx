'use client'

import { useState, useCallback } from 'react'
import { spotifyApi } from '@/lib/spotify/api'
import { Button } from '@/components/ui/button'
import { Search, Music, Loader2 } from 'lucide-react'

interface Track {
  id: string
  name: string
  artists: Array<{ name: string }>
  album: {
    name: string
    images: Array<{ url: string }>
  }
  duration_ms: number
  uri: string
}

interface TrackSearchProps {
  onTrackSelect: (track: Track) => void
}

export function TrackSearch({ onTrackSelect }: TrackSearchProps) {
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<Track[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchTracks = useCallback(async () => {
    if (!query.trim()) return

    setIsSearching(true)
    setError(null)

    try {
      const response = await spotifyApi.searchTracks(query, 20)
      setTracks(response.tracks.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search tracks')
      setTracks([])
    } finally {
      setIsSearching(false)
    }
  }, [query])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    searchTracks()
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-full max-w-4xl">
      <form onSubmit={handleSubmit} className="flex gap-2 mb-3 sm:mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a song..."
            className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm sm:text-base bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-md placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white/15"
          />
        </div>
        <Button 
          type="submit" 
          disabled={isSearching || !query.trim()} 
          size="icon" 
          variant="default"
          className="flex-shrink-0 h-[2.5rem] bg-blue-600 hover:bg-blue-500 text-white transition-all duration-200 hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:opacity-50 cursor-pointer"
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </form>

      {error && (
        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs sm:text-sm">
          {error}
        </div>
      )}

      {tracks.length > 0 && (
        <div className="space-y-1 sm:space-y-2 max-h-64 sm:max-h-96 overflow-y-auto">
          {tracks.map((track) => (
            <button
              key={track.id}
              onClick={() => onTrackSelect(track)}
              className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-blue-500/20 rounded-md transition-colors text-left group cursor-pointer"
            >
              {track.album.images[0] ? (
                <img
                  src={track.album.images[0].url}
                  alt={track.album.name}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <Music className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm sm:text-base text-white group-hover:text-white">{track.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {track.artists.map(a => a.name).join(', ')}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {track.album.name} • {formatDuration(track.duration_ms)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {tracks.length === 0 && !isSearching && query && (
        <div className="text-center py-8 text-muted-foreground">
          <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No tracks found</p>
        </div>
      )}
    </div>
  )
}
