'use client'

import { useEffect, useState } from 'react'
import { getStoredAccessToken } from '@/lib/spotify/auth'

export function SpotifyPlayerDebug() {
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({})

  useEffect(() => {
    const checkStatus = () => {
      const info: Record<string, any> = {
        'window.Spotify exists': typeof window !== 'undefined' && !!window.Spotify,
        'Access token exists': !!getStoredAccessToken(),
        'onSpotifyWebPlaybackSDKReady': typeof window !== 'undefined' && typeof (window as any).onSpotifyWebPlaybackSDKReady === 'function',
      }

      if (typeof window !== 'undefined') {
        const script = document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]') as HTMLScriptElement
        info['SDK script in DOM'] = !!script
        
        // SDK is loaded if window.Spotify exists (script executed) OR script is complete
        // The most reliable indicator is window.Spotify existing, which means the script loaded and executed
        const scriptComplete = script ? (script as any).complete === true : false
        const sdkLoaded = !!(window as any).Spotify || scriptComplete
        info['SDK script loaded'] = sdkLoaded
        
        if (window.Spotify) {
          try {
            info['Spotify.Player exists'] = typeof window.Spotify.Player === 'function'
            info['Spotify type'] = typeof window.Spotify
            info['Spotify keys'] = Object.keys(window.Spotify).join(', ')
          } catch (e) {
            info['Spotify.Player error'] = (e as Error).message
          }
        }
      }

      setDebugInfo(info)
    }

    checkStatus()
    const interval = setInterval(checkStatus, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-4 bg-gray-100 rounded-md text-xs font-mono">
      <h3 className="font-bold mb-2">Debug Info:</h3>
      {Object.entries(debugInfo).map(([key, value]) => (
        <div key={key} className={value ? 'text-green-600' : 'text-red-600'}>
          {key}: {String(value)}
        </div>
      ))}
    </div>
  )
}
