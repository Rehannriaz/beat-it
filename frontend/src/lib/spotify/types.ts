/**
 * TypeScript types for Spotify Web API responses
 * These match the official Spotify Web API response formats
 */

export interface SpotifyUser {
  id: string
  display_name: string
  email: string
  images: Array<{ url: string; height: number | null; width: number | null }>
  country?: string
  product?: string
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: Array<{ id: string; name: string }>
  album: {
    id: string
    name: string
    images: Array<{ url: string; height: number | null; width: number | null }>
  }
  duration_ms: number
  uri: string
  preview_url: string | null
  external_urls: {
    spotify: string
  }
}

export interface SpotifySearchResponse {
  tracks: {
    href: string
    items: SpotifyTrack[]
    limit: number
    next: string | null
    offset: number
    previous: string | null
    total: number
  }
}

export interface SpotifyAudioFeatures {
  danceability: number
  energy: number
  key: number
  loudness: number
  mode: number
  speechiness: number
  acousticness: number
  instrumentalness: number
  liveness: number
  valence: number
  tempo: number
  type: string
  id: string
  uri: string
  track_href: string
  analysis_url: string
  duration_ms: number
  time_signature: number
}

export interface SpotifyAudioAnalysis {
  bars: Array<{
    start: number
    duration: number
    confidence: number
  }>
  beats: Array<{
    start: number
    duration: number
    confidence: number
  }>
  sections: Array<{
    start: number
    duration: number
    confidence: number
    loudness: number
    tempo: number
    key: number
    mode: number
    time_signature: number
  }>
  segments: Array<{
    start: number
    duration: number
    confidence: number
    loudness_start: number
    loudness_max: number
    pitches: number[]
    timbre: number[]
  }>
  tatums: Array<{
    start: number
    duration: number
    confidence: number
  }>
  track: {
    duration: number
    sample_md5: string
    offset_seconds: number
    window_seconds: number
    analysis_sample_rate: number
    analysis_channels: number
    end_of_fade_in: number
    start_of_fade_out: number
    loudness: number
    tempo: number
    tempo_confidence: number
    time_signature: number
    time_signature_confidence: number
    key: number
    key_confidence: number
    mode: number
    mode_confidence: number
    codestring: string
    code_version: number
    echoprintstring: string
    echoprint_version: number
    synchstring: string
    synch_version: number
    rhythmstring: string
    rhythm_version: number
  }
}

// Spotify Web Playback SDK types
export interface SpotifyPlayer {
  connect(): Promise<boolean>
  disconnect(): void
  addListener(event: string, callback: (state: any) => void): void
  removeListener(event: string, callback?: (state: any) => void): void
  getCurrentState(): Promise<SpotifyPlaybackState | null>
  setVolume(volume: number): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
  togglePlay(): Promise<void>
  seek(positionMs: number): Promise<void>
  nextTrack(): Promise<void>
  previousTrack(): Promise<void>
}

export interface SpotifyPlaybackState {
  paused: boolean
  position: number
  duration: number
  track_window: {
    current_track: SpotifyTrack
    next_tracks: SpotifyTrack[]
    previous_tracks: SpotifyTrack[]
  }
}

// Extend the global Window interface for Spotify Web Playback SDK
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: (spotify: {
      Player: new (options: {
        name: string
        getOAuthToken: (cb: (token: string) => void) => void
        volume?: number
      }) => SpotifyPlayer
    }) => void
    Spotify?: {
      Player: new (options: {
        name: string
        getOAuthToken: (cb: (token: string) => void) => void
        volume?: number
      }) => SpotifyPlayer
    }
  }
}
