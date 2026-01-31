'use client'

import { useEffect } from 'react'

/**
 * Client component that loads the Spotify Web Playback SDK
 * This ensures the callback is available when the script executes
 */
export function SpotifySDKLoader() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    console.log('[SpotifySDKLoader] ========== INITIALIZATION START ==========')
    console.log('[SpotifySDKLoader] window.Spotify exists:', !!window.Spotify)
    console.log('[SpotifySDKLoader] Callback exists:', typeof window.onSpotifyWebPlaybackSDKReady)
    console.log('[SpotifySDKLoader] Callback function:', window.onSpotifyWebPlaybackSDKReady?.toString().substring(0, 100))

    // Check if SDK is already loaded
    if (window.Spotify) {
      console.log('[SpotifySDKLoader] ✅ SDK already loaded!')
      console.log('[SpotifySDKLoader] window.Spotify.Player:', typeof window.Spotify?.Player)
      return
    }

    // Define functions before import so they're available in the then() callback
    function proceedWithScriptLoad() {
      // Create and load script
      const script = document.createElement('script')
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.async = false // Load synchronously
      script.id = 'spotify-sdk-script'
      script.setAttribute('data-debug', 'true')

      // Store callback reference before script loads
      const callbackBeforeLoad = window.onSpotifyWebPlaybackSDKReady
      console.log('[SpotifySDKLoader] Callback before script load:', typeof callbackBeforeLoad)

      script.onload = () => {
        console.log('[SpotifySDKLoader] ✅ Script onload event fired')
        console.log('[SpotifySDKLoader] Script readyState:', (script as any).readyState)
        console.log('[SpotifySDKLoader] Script complete:', (script as any).complete)
        console.log('[SpotifySDKLoader] window.Spotify immediately after onload:', !!window.Spotify)
        console.log('[SpotifySDKLoader] Callback after script load:', typeof window.onSpotifyWebPlaybackSDKReady)
        console.log('[SpotifySDKLoader] Callback changed?', callbackBeforeLoad !== window.onSpotifyWebPlaybackSDKReady)
        
        // Check if callback was called by inspecting if window.Spotify exists
        // The Spotify SDK should call the callback synchronously when script loads
        // If it doesn't, we need to wait or check for errors
        
        // Give it a small delay to allow callback to execute
        setTimeout(() => {
          console.log('[SpotifySDKLoader] Checking after 200ms delay...')
          console.log('[SpotifySDKLoader] window.Spotify:', !!window.Spotify)
          
          if (window.Spotify) {
            console.log('[SpotifySDKLoader] ✅ SUCCESS! window.Spotify is available')
            try {
              const playerExists = typeof window.Spotify.Player === 'function'
              console.log('[SpotifySDKLoader] window.Spotify.Player:', playerExists ? '✅ available' : '❌ not available')
              if (playerExists) {
                console.log('[SpotifySDKLoader] ✅✅✅ Spotify SDK fully loaded and ready!')
              }
            } catch (e) {
              console.error('[SpotifySDKLoader] Error accessing Player:', e)
            }
          } else {
            console.error('[SpotifySDKLoader] ❌ window.Spotify not set after script load')
            console.log('[SpotifySDKLoader] Possible reasons:')
            console.log('  1. Callback was not called by Spotify SDK')
            console.log('  2. Callback was called but with invalid parameter')
            console.log('  3. Script loaded but SDK initialization failed')
            console.log('[SpotifySDKLoader] Checking script execution...')
            
            // Check if script actually executed
            const scriptInDOM = document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]')
            console.log('[SpotifySDKLoader] Script still in DOM:', !!scriptInDOM)
            
            // Check if there are any global Spotify-related objects
            console.log('[SpotifySDKLoader] Checking for alternative SDK locations...')
            const checks = [
              { name: 'window.Spotify', value: (window as any).Spotify },
              { name: 'window.SpotifyPlayer', value: (window as any).SpotifyPlayer },
              { name: 'window.SPOTIFY', value: (window as any).SPOTIFY },
            ]
            checks.forEach(check => {
              if (check.value) {
                console.log(`[SpotifySDKLoader] Found ${check.name}:`, typeof check.value)
              }
            })
            
            // Start polling as fallback
            let checkCount = 0
            const maxChecks = 50 // 10 seconds
            const checkInterval = setInterval(() => {
              checkCount++
              
              if (window.Spotify) {
                console.log('[SpotifySDKLoader] ✅ window.Spotify is now available!')
                clearInterval(checkInterval)
              } else if (checkCount >= maxChecks) {
                console.error('[SpotifySDKLoader] ❌ window.Spotify still not available after 10 seconds')
                console.log('[SpotifySDKLoader] Final diagnostic state:')
                console.log('  - Callback exists:', typeof window.onSpotifyWebPlaybackSDKReady)
                console.log('  - Callback function:', window.onSpotifyWebPlaybackSDKReady?.toString().substring(0, 100))
                console.log('  - Script in DOM:', !!document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]'))
                console.log('  - Script complete:', ((document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]') as HTMLScriptElement) as any)?.complete)
                console.log('  - window.Spotify:', !!window.Spotify)
                console.log('[SpotifySDKLoader] ⚠️ The Spotify SDK script may have failed to initialize')
                console.log('[SpotifySDKLoader] ⚠️ Check network tab to ensure script loaded successfully')
                clearInterval(checkInterval)
              } else if (checkCount % 10 === 0) {
                // Log every 2 seconds
                console.log(`[SpotifySDKLoader] Still waiting... (${checkCount * 200}ms elapsed)`)
              }
            }, 200)
          }
        }, 200) // Increased delay to 200ms
      }

      script.onerror = (e) => {
        console.error('[SpotifySDKLoader] ❌ Script failed to load:', e)
        const errorEvent = e as ErrorEvent
        console.error('[SpotifySDKLoader] Error details:', {
          type: errorEvent.type,
          target: errorEvent.target,
          currentTarget: errorEvent.currentTarget
        })
        console.error('[SpotifySDKLoader] This usually means:')
        console.error('  1. Network error - check internet connection')
        console.error('  2. CORS issue - check browser console for CORS errors')
        console.error('  3. Script URL is incorrect or blocked')
      }

      // Insert script at the beginning of head to ensure it loads early
      const firstScript = document.head.querySelector('script')
      if (firstScript) {
        document.head.insertBefore(script, firstScript)
        console.log('[SpotifySDKLoader] Script inserted before first script in head')
      } else {
        document.head.appendChild(script)
        console.log('[SpotifySDKLoader] Script appended to head')
      }
      
      // Also start a general polling check
      let generalCheckCount = 0
      const generalCheckInterval = setInterval(() => {
        generalCheckCount++
        if (window.Spotify) {
          console.log('[SpotifySDKLoader] ✅ General check: window.Spotify is available!')
          clearInterval(generalCheckInterval)
        } else if (generalCheckCount > 100) {
          console.error('[SpotifySDKLoader] ❌ General check: window.Spotify never became available after 20 seconds')
          console.error('[SpotifySDKLoader] Diagnostic information:')
          console.error('  - Callback exists:', typeof window.onSpotifyWebPlaybackSDKReady)
          console.error('  - Script loaded:', (script as any).complete)
          console.error('  - Script in DOM:', !!document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]'))
          clearInterval(generalCheckInterval)
        }
      }, 200)
    }

    function loadScript() {
      console.log('[SpotifySDKLoader] Creating and loading script...')
      
      // CRITICAL: Ensure callback is set and is a function on window
      // The Spotify SDK looks for window.onSpotifyWebPlaybackSDKReady as a global function
      if (!window.onSpotifyWebPlaybackSDKReady || typeof window.onSpotifyWebPlaybackSDKReady !== 'function') {
        console.error('[SpotifySDKLoader] ❌ CRITICAL: Callback not set or not a function before loading script!')
        console.error('[SpotifySDKLoader] Current value:', window.onSpotifyWebPlaybackSDKReady)
        console.error('[SpotifySDKLoader] Type:', typeof window.onSpotifyWebPlaybackSDKReady)
        console.error('[SpotifySDKLoader] This will cause the Spotify SDK to not call the callback!')
        console.error('[SpotifySDKLoader] Waiting a moment and re-checking...')
        
        // Wait a bit and check again - sdk-loader.ts might still be loading
        setTimeout(() => {
          if (!window.onSpotifyWebPlaybackSDKReady || typeof window.onSpotifyWebPlaybackSDKReady !== 'function') {
            console.error('[SpotifySDKLoader] ❌ Callback still not set after delay!')
            console.error('[SpotifySDKLoader] Setting minimal fallback callback...')
            // Set a minimal callback that will be replaced by sdk-loader.ts if it loads
            window.onSpotifyWebPlaybackSDKReady = function(spotify: any) {
              console.log('[SpotifySDKLoader] Fallback callback called:', spotify)
              if (spotify && typeof spotify === 'object' && spotify.Player) {
                window.Spotify = spotify
                console.log('[SpotifySDKLoader] window.Spotify set via fallback:', !!window.Spotify)
              } else {
                console.error('[SpotifySDKLoader] Fallback callback received invalid spotify:', spotify)
              }
            }
          } else {
            console.log('[SpotifySDKLoader] ✅ Callback is now set after delay')
          }
          // Proceed with script loading
          proceedWithScriptLoad()
        }, 100)
        return // Don't load script yet
      }
      
      console.log('[SpotifySDKLoader] ✅ Callback is properly set before script load')
      console.log('[SpotifySDKLoader] Callback type:', typeof window.onSpotifyWebPlaybackSDKReady)
      console.log('[SpotifySDKLoader] Callback is function:', typeof window.onSpotifyWebPlaybackSDKReady === 'function')
      
      proceedWithScriptLoad()
    }

    // Ensure callback is set BEFORE loading script
    // Import the sdk-loader to ensure callback is registered
    import('@/lib/spotify/sdk-loader').then(() => {
      console.log('[SpotifySDKLoader] sdk-loader.ts imported, callback should be set')
      console.log('[SpotifySDKLoader] Callback after import:', typeof window.onSpotifyWebPlaybackSDKReady)
      
      // DON'T wrap the callback - let sdk-loader.ts handle it
      // The callback from sdk-loader.ts already has validation
      // Wrapping it again could cause issues
      console.log('[SpotifySDKLoader] Callback is set by sdk-loader.ts, not wrapping it')
      
      if (!window.onSpotifyWebPlaybackSDKReady) {
        console.error('[SpotifySDKLoader] ❌ CRITICAL: Callback not set after importing sdk-loader!')
        console.error('[SpotifySDKLoader] This should not happen - sdk-loader.ts should set the callback')
        // Don't set a manual callback - let the script handle it when it loads
      }

      // Check if script is already in DOM
      const existingScript = document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]') as HTMLScriptElement
      if (existingScript) {
        console.log('[SpotifySDKLoader] Script already in DOM')
        const scriptAny = existingScript as any
        console.log('[SpotifySDKLoader] Script complete:', scriptAny.complete)
        console.log('[SpotifySDKLoader] Script readyState:', scriptAny.readyState)
        
        // Check if script has already executed
        if (scriptAny.complete || scriptAny.readyState === 'complete' || scriptAny.readyState === 'loaded') {
          console.log('[SpotifySDKLoader] Script appears to be loaded')
          // Script might have executed before callback was set
          // Check if SDK is available via other means
          setTimeout(() => {
            if (window.Spotify) {
              console.log('[SpotifySDKLoader] ✅ SDK available after script load check')
            } else {
              console.error('[SpotifySDKLoader] ❌ Script loaded but SDK not available')
              console.log('[SpotifySDKLoader] Checking for alternative SDK locations...')
              
              // Check various possible locations
              const checks = [
                () => (window as any).SpotifyPlayer,
                () => (window as any).Spotify?.Player,
                () => (window as any).SPOTIFY,
              ]
              
              for (const check of checks) {
                const result = check()
                if (result) {
                  console.log('[SpotifySDKLoader] Found alternative SDK location:', result)
                  try {
                    window.Spotify = result
                    console.log('[SpotifySDKLoader] ✅ Set window.Spotify from alternative location')
                    break
                  } catch (e) {
                    console.error('[SpotifySDKLoader] Failed to set from alternative:', e)
                  }
                }
              }
              
              // If still not available, the script might have executed before callback was ready
              // Try to manually trigger by checking if there's a way to re-initialize
              console.log('[SpotifySDKLoader] Attempting to reload script...')
              existingScript.remove()
              loadScript()
            }
          }, 500)
        } else {
          // Script is loading, wait for it
          console.log('[SpotifySDKLoader] Script is still loading, adding load listener')
          existingScript.addEventListener('load', () => {
            console.log('[SpotifySDKLoader] Script load event fired')
            setTimeout(() => {
              if (window.Spotify) {
                console.log('[SpotifySDKLoader] ✅ SDK available after script load event')
              } else {
                console.error('[SpotifySDKLoader] ❌ Script loaded but SDK not available after load event')
              }
            }, 1000)
          })
          
          existingScript.addEventListener('error', (e) => {
            console.error('[SpotifySDKLoader] ❌ Script load error:', e)
          })
        }
        return
      }

      // Script not in DOM, load it
      loadScript()
    })
  }, []) // End of useEffect

  return null // This component doesn't render anything
}
