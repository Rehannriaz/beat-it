/**
 * Spotify Web Playback SDK loader
 * Handles loading and initialization of the Spotify Web Playback SDK
 */

import type { SpotifyPlayer } from './types'

interface SpotifySDK {
  Player: new (options: {
    name: string
    getOAuthToken: (cb: (token: string) => void) => void
    volume?: number
  }) => SpotifyPlayer
}

let sdkReady = false;
let sdkReadyCallbacks: Array<(spotify: SpotifySDK) => void> = [];

/**
 * Initialize Spotify SDK callback
 * This function is called by the Spotify SDK when it loads
 * Note: The callback should be set in layout.tsx before the script loads
 */
if (typeof window !== 'undefined') {
  console.log('[sdk-loader] ========== SDK LOADER INITIALIZATION ==========')
  console.log('[sdk-loader] Setting up onSpotifyWebPlaybackSDKReady callback')
  
  // If callback is already set (from layout.tsx or SpotifySDKLoader), wrap it
  const existingCallback = window.onSpotifyWebPlaybackSDKReady;
  console.log('[sdk-loader] Existing callback:', typeof existingCallback)
  
  window.onSpotifyWebPlaybackSDKReady = (spotify: SpotifySDK) => {
    // CRITICAL: If spotify is null/undefined, this is NOT a valid call from Spotify SDK
    // The Spotify SDK ALWAYS passes the SDK object. If it's null/undefined, something else is calling this
    if (!spotify || (typeof spotify !== 'object') || !spotify.Player) {
      // Silently ignore invalid calls - this can happen during hot reload or if something else calls it
      // The Spotify SDK will call this with a valid object, so invalid calls are safe to ignore
      return
    }
    
    console.log('[sdk-loader] ========== CALLBACK CALLED ==========')
    console.log('[sdk-loader] 🔔 onSpotifyWebPlaybackSDKReady called!')
    
    console.log('[sdk-loader] spotify parameter:', spotify)
    console.log('[sdk-loader] spotify type:', typeof spotify)
    
    console.log('[sdk-loader] ✅ Valid Spotify SDK object received!')
    console.log('[sdk-loader] spotify keys:', Object.keys(spotify))
    console.log('[sdk-loader] spotify.Player:', typeof spotify.Player)
    console.log('[sdk-loader] spotify.Player is function:', typeof spotify.Player === 'function')
    
    console.log('[sdk-loader] window.Spotify BEFORE assignment:', !!window.Spotify)
    
    try {
      window.Spotify = spotify;
      console.log('[sdk-loader] ✅ Assignment successful')
      console.log('[sdk-loader] window.Spotify AFTER assignment:', !!window.Spotify)
      
      // Verify the assignment worked
      if (window.Spotify) {
        console.log('[sdk-loader] ✅ window.Spotify is set!')
        try {
          console.log('[sdk-loader] window.Spotify.Player:', typeof window.Spotify.Player)
          if (window.Spotify.Player) {
            console.log('[sdk-loader] ✅✅✅ SUCCESS! Spotify SDK is ready and Player is available!')
          } else {
            console.error('[sdk-loader] ❌ window.Spotify.Player is not available')
          }
        } catch (e) {
          console.error('[sdk-loader] ❌ Error accessing window.Spotify.Player:', e)
        }
      } else {
        console.error('[sdk-loader] ❌ CRITICAL: window.Spotify is still falsy after assignment!')
        console.log('[sdk-loader] spotify value:', spotify)
      }
    } catch (e) {
      console.error('[sdk-loader] ❌ FAILED to set window.Spotify:', e)
      console.error('[sdk-loader] Error details:', {
        message: (e as Error).message,
        stack: (e as Error).stack,
        name: (e as Error).name
      })
      return // Don't continue if assignment failed
    }
    
    sdkReady = true;
    console.log('[sdk-loader] sdkReady set to:', sdkReady)
    
    // Check if window.Spotify is still set after a delay
    setTimeout(() => {
      console.log('[sdk-loader] Delayed check (100ms): window.Spotify:', !!window.Spotify)
      if (!window.Spotify) {
        console.error('[sdk-loader] ❌ window.Spotify was cleared or never set!')
        // Try to set it again if spotify is still valid
        if (spotify && typeof spotify === 'object' && spotify.Player) {
          console.log('[sdk-loader] Attempting to re-assign window.Spotify...')
          try {
            window.Spotify = spotify
            console.log('[sdk-loader] Re-assignment result:', !!window.Spotify)
          } catch (e) {
            console.error('[sdk-loader] Re-assignment failed:', e)
          }
        }
      }
    }, 100);
    
    // Call existing callback if it was set elsewhere
    if (existingCallback && existingCallback !== window.onSpotifyWebPlaybackSDKReady) {
      console.log('[sdk-loader] Calling existing callback (wrapper)')
      try {
        existingCallback(spotify);
        console.log('[sdk-loader] Existing callback executed')
        console.log('[sdk-loader] window.Spotify after existing callback:', !!window.Spotify)
      } catch (e) {
        console.error('[sdk-loader] Error in existing callback:', e)
      }
    }
    
    // Call all pending callbacks
    console.log('[sdk-loader] Calling', sdkReadyCallbacks.length, 'pending callbacks')
    sdkReadyCallbacks.forEach((callback, index) => {
      try {
        callback(spotify)
        console.log('[sdk-loader] Pending callback', index, 'executed')
      } catch (e) {
        console.error('[sdk-loader] Error in pending callback', index, ':', e)
      }
    })
    sdkReadyCallbacks = [];
    
    console.log('[sdk-loader] ========== CALLBACK EXECUTION COMPLETE ==========')
  };
  
  console.log('[sdk-loader] Callback set. window.onSpotifyWebPlaybackSDKReady:', typeof window.onSpotifyWebPlaybackSDKReady)
  console.log('[sdk-loader] ========== SDK LOADER INITIALIZATION COMPLETE ==========')

  // Also check if SDK is already loaded (in case script loads before this code runs)
  const checkSDK = setInterval(() => {
    if (window.Spotify && !sdkReady) {
      console.log('sdk-loader: SDK already loaded, marking as ready');
      clearInterval(checkSDK);
      sdkReady = true;
      window.Spotify = window.Spotify; // Ensure it's set
      const spotify = window.Spotify;
      if (spotify && spotify.Player) {
        sdkReadyCallbacks.forEach(callback => callback(spotify));
        sdkReadyCallbacks = [];
      }
    }
  }, 100);

  // Stop checking after 10 seconds
  setTimeout(() => clearInterval(checkSDK), 10000);
}

/**
 * Wait for Spotify SDK to be ready
 */
export function waitForSpotifySDK(): Promise<SpotifySDK | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    // Check if SDK is already ready and verify it's actually usable
    if (sdkReady && window.Spotify && window.Spotify.Player && typeof window.Spotify.Player === 'function') {
      console.log('[sdk-loader] SDK already ready, resolving immediately')
      resolve(window.Spotify);
      return;
    }

    // If window.Spotify exists but sdkReady is false, wait a bit for it to be fully initialized
    if (window.Spotify && window.Spotify.Player && typeof window.Spotify.Player === 'function') {
      console.log('[sdk-loader] SDK detected but not marked ready, waiting briefly...')
      setTimeout(() => {
        if (window.Spotify && window.Spotify.Player && typeof window.Spotify.Player === 'function') {
          console.log('[sdk-loader] SDK verified after delay')
          sdkReady = true
          resolve(window.Spotify);
        } else {
          // Add to callbacks queue if still not ready
          sdkReadyCallbacks.push(resolve);
        }
      }, 200)
      return
    }

    // Add to callbacks queue
    sdkReadyCallbacks.push(resolve);

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!sdkReady) {
        console.error('Spotify SDK failed to load within 10 seconds');
        // Check one more time if window.Spotify exists
        if (window.Spotify && window.Spotify.Player && typeof window.Spotify.Player === 'function') {
          console.log('[sdk-loader] SDK found on timeout, resolving anyway')
          sdkReady = true
          resolve(window.Spotify);
        } else {
          resolve(null);
        }
      }
    }, 10000);
  });
}

/**
 * Check if Spotify SDK is loaded
 */
export function isSpotifySDKReady(): boolean {
  return typeof window !== 'undefined' && sdkReady && !!window.Spotify;
}
