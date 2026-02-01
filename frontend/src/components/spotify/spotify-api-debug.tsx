'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { spotifyApi } from '@/lib/spotify/api'
import { transformSpotifyAnalysis, generateFeaturesFromTrack } from '@/lib/spotify/transform'
import type { SpotifyTrack } from '@/lib/spotify/types'

interface SpotifyAPIDebugProps {
  trackId?: string
  track?: SpotifyTrack
}

export function SpotifyAPIDebug({ trackId, track }: SpotifyAPIDebugProps) {
  const [loading, setLoading] = useState(false)
  const [audioAnalysis, setAudioAnalysis] = useState<any>(null)
  const [audioFeatures, setAudioFeatures] = useState<any>(null)
  const [transformedFeatures, setTransformedFeatures] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTest = async () => {
    if (!trackId && !track?.id) {
      setError('No track ID provided')
      return
    }

    const id = trackId || track?.id
    setLoading(true)
    setError(null)
    setAudioAnalysis(null)
    setAudioFeatures(null)
    setTransformedFeatures(null)

    try {
      // Test Audio Analysis API
      try {
        console.log('[Debug] Fetching Audio Analysis for track:', id)
        const analysis = await spotifyApi.getAudioAnalysis(id!)
        console.log('[Debug] Audio Analysis response:', analysis)
        setAudioAnalysis(analysis)

        // Transform it
        const features = transformSpotifyAnalysis(analysis)
        console.log('[Debug] Transformed features:', features)
        setTransformedFeatures(features)
      } catch (analysisError: any) {
        console.error('[Debug] Audio Analysis failed:', analysisError)
        setError(`Audio Analysis failed: ${analysisError.message || analysisError}`)
      }

      // Test Audio Features API
      try {
        console.log('[Debug] Fetching Audio Features for track:', id)
        const features = await spotifyApi.getAudioFeatures(id!)
        console.log('[Debug] Audio Features response:', features)
        setAudioFeatures(features)
      } catch (featuresError: any) {
        console.error('[Debug] Audio Features failed:', featuresError)
        // Don't set error if this fails, it's optional
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 p-4 bg-black/50 rounded-lg">
      <div className="flex items-center gap-2">
        <Button
          onClick={handleTest}
          disabled={loading || (!trackId && !track?.id)}
          className="bg-green-600 hover:bg-green-700"
        >
          {loading ? 'Testing...' : 'Test Spotify APIs'}
        </Button>
        {track && (
          <span className="text-sm text-gray-400">
            Track: {track.name} ({track.id})
          </span>
        )}
        {trackId && (
          <span className="text-sm text-gray-400">
            Track ID: {trackId}
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
          {error}
        </div>
      )}

      {audioAnalysis && (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-green-400">Audio Analysis (Raw)</h3>
          <div className="bg-gray-900 p-3 rounded text-xs overflow-auto max-h-96">
            <div className="mb-2">
              <strong>Track Info:</strong>
              <pre className="mt-1 text-green-300">
                {JSON.stringify(audioAnalysis.track, null, 2)}
              </pre>
            </div>
            <div className="mb-2">
              <strong>Beats:</strong> {audioAnalysis.beats?.length ?? 0} beats
              <pre className="mt-1 text-yellow-300 max-h-32 overflow-auto">
                {JSON.stringify(audioAnalysis.beats?.slice(0, 10), null, 2)}
                {audioAnalysis.beats?.length > 10 && `\n... and ${audioAnalysis.beats.length - 10} more`}
              </pre>
            </div>
            <div className="mb-2">
              <strong>Tatums:</strong> {audioAnalysis.tatums?.length ?? 0} tatums
              <pre className="mt-1 text-yellow-300 max-h-32 overflow-auto">
                {JSON.stringify(audioAnalysis.tatums?.slice(0, 10), null, 2)}
                {audioAnalysis.tatums?.length > 10 && `\n... and ${audioAnalysis.tatums.length - 10} more`}
              </pre>
            </div>
            <div className="mb-2">
              <strong>Bars:</strong> {audioAnalysis.bars?.length ?? 0} bars
              <pre className="mt-1 text-yellow-300 max-h-32 overflow-auto">
                {JSON.stringify(audioAnalysis.bars?.slice(0, 5), null, 2)}
                {audioAnalysis.bars?.length > 5 && `\n... and ${audioAnalysis.bars.length - 5} more`}
              </pre>
            </div>
            <div className="mb-2">
              <strong>Segments:</strong> {audioAnalysis.segments?.length ?? 0} segments
              <pre className="mt-1 text-yellow-300 max-h-32 overflow-auto">
                {JSON.stringify(audioAnalysis.segments?.slice(0, 5), null, 2)}
                {audioAnalysis.segments?.length > 5 && `\n... and ${audioAnalysis.segments.length - 5} more`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {audioFeatures && (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-blue-400">Audio Features (Raw)</h3>
          <div className="bg-gray-900 p-3 rounded text-xs overflow-auto">
            <pre className="text-blue-300">
              {JSON.stringify(audioFeatures, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {transformedFeatures && (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-purple-400">Transformed Features</h3>
          <div className="bg-gray-900 p-3 rounded text-xs overflow-auto max-h-96">
            <div className="mb-2">
              <strong>Summary:</strong>
              <ul className="list-disc list-inside text-purple-300 ml-2">
                <li>BPM: {transformedFeatures.bpm}</li>
                <li>Duration: {transformedFeatures.duration.toFixed(2)}s</li>
                <li>Beat times: {transformedFeatures.beat_times.length}</li>
                <li>Onset times: {transformedFeatures.onset_times.length}</li>
                <li>Downbeat times: {transformedFeatures.downbeat_times.length}</li>
              </ul>
            </div>
            <div className="mb-2">
              <strong>First 20 Beat Times:</strong>
              <pre className="mt-1 text-yellow-300">
                {JSON.stringify(transformedFeatures.beat_times.slice(0, 20), null, 2)}
              </pre>
            </div>
            <div className="mb-2">
              <strong>First 20 Onset Times:</strong>
              <pre className="mt-1 text-yellow-300">
                {JSON.stringify(transformedFeatures.onset_times.slice(0, 20), null, 2)}
              </pre>
            </div>
            <div className="mb-2">
              <strong>First 10 Downbeat Times:</strong>
              <pre className="mt-1 text-yellow-300">
                {JSON.stringify(transformedFeatures.downbeat_times.slice(0, 10), null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
