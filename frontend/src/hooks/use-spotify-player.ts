'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getStoredAccessToken } from '@/lib/spotify/auth'
import { waitForSpotifySDK } from '@/lib/spotify/sdk-loader'
import type { SpotifyTrack, SpotifyPlaybackState, SpotifyPlayer } from '@/lib/spotify/types'

interface PlayerState {
  isReady: boolean
  isPlaying: boolean
  currentTrack: SpotifyTrack | null
  position: number // in seconds
  duration: number // in seconds
  volume: number
  deviceId: string | null
}

export function useSpotifyPlayer() {
  const [playerState, setPlayerState] = useState<PlayerState>({
    isReady: false,
    isPlaying: false,
    currentTrack: null,
    position: 0,
    duration: 0,
    volume: 0.5,
    deviceId: null,
  })
  const [error, setError] = useState<string | null>(null)
  const playerRef = useRef<SpotifyPlayer | null>(null)
  const positionUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize player
  useEffect(() => {
    const token = getStoredAccessToken()
    if (!token) {
      setError('Not authenticated. Please log in to Spotify.')
      return
    }

    let isMounted = true
    let drmErrorDetected = false

    // Set up global error handler to catch DRM errors
    const handleGlobalError = (event: ErrorEvent) => {
      const errorMessage = event.message || event.error?.message || ''
      if (errorMessage.includes('keysystem') || 
          errorMessage.includes('EMEError') || 
          errorMessage.includes('No supported keysystem')) {
        drmErrorDetected = true
        console.warn('🔴 DRM Error detected:', errorMessage)
      }
    }

    window.addEventListener('error', handleGlobalError)
    
    // Also listen for unhandled promise rejections (where EMEError often appears)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || event.reason?.toString() || ''
      if (errorMessage.includes('keysystem') || 
          errorMessage.includes('EMEError') || 
          errorMessage.includes('No supported keysystem')) {
        drmErrorDetected = true
        console.warn('🔴 DRM Error detected in promise rejection:', errorMessage)
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // Wait for Spotify SDK to load
    console.log('Waiting for Spotify SDK to load...')
    waitForSpotifySDK().then((Spotify) => {
      if (!isMounted) return
      
      if (!Spotify) {
        console.error('Spotify SDK not loaded')
        setError('Failed to load Spotify Web Playback SDK. Please refresh the page.')
        return
      }

      // Verify SDK is truly ready - check that Player constructor exists and is a function
      if (!Spotify.Player || typeof Spotify.Player !== 'function') {
        console.error('Spotify SDK Player constructor not available')
        setError('Spotify SDK not fully loaded. Please refresh the page.')
        return
      }

      // Add a small delay to ensure SDK is fully initialized
      console.log('Spotify SDK loaded, waiting a moment before initializing player...')
      setTimeout(() => {
        if (!isMounted) return
        console.log('Initializing player...')
        initializePlayer()
      }, 500) // 500ms delay to ensure SDK is fully ready
    }).catch((err) => {
      console.error('Error waiting for Spotify SDK:', err)
      setError('Failed to load Spotify SDK')
    })

    function initializePlayer() {
      if (!window.Spotify) {
        console.error('window.Spotify is not available')
        setError('Spotify SDK not loaded')
        return
      }

      // Verify Player constructor exists and is callable
      if (!window.Spotify.Player || typeof window.Spotify.Player !== 'function') {
        console.error('window.Spotify.Player is not a function:', typeof window.Spotify.Player)
        setError('Spotify SDK Player not available. Please refresh the page.')
        return
      }

      // Check for secure context (required for DRM)
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname === '[::1]'
        if (!isLocalhost) {
          console.error('Not in a secure context. Spotify Web Playback SDK requires HTTPS.')
          setError('Spotify requires a secure connection (HTTPS). Please use HTTPS or localhost.')
          return
        }
      }

      // Check for EME/DRM support (optional check, but helpful for debugging)
      let hasEmeSupport = false
      if (typeof window !== 'undefined' && 'navigator' in window) {
        const nav = navigator as any
        if (nav.requestMediaKeySystemAccess) {
          console.log('✅ Browser supports EME (Encrypted Media Extensions)')
          hasEmeSupport = true
          
          // Try to detect if Widevine is available (most common DRM for Spotify)
          try {
            nav.requestMediaKeySystemAccess('com.widevine.alpha', [{
              initDataTypes: ['cenc'],
              audioCapabilities: [{ contentType: 'audio/mp4;codecs="mp4a.40.2"' }]
            }]).then(() => {
              console.log('✅ Widevine DRM support detected')
            }).catch((err: any) => {
              console.warn('⚠️ Widevine DRM not available:', err.message || err)
              drmErrorDetected = true // Pre-emptively mark as DRM issue
            })
          } catch (err: any) {
            console.warn('⚠️ Could not check for Widevine support:', err.message || err)
          }
        } else {
          console.warn('⚠️ Browser does not support EME (Encrypted Media Extensions) - DRM errors are likely')
          drmErrorDetected = true
          hasEmeSupport = false
        }
      }

      // Verify token is available before initializing
      const token = getStoredAccessToken()
      if (!token) {
        console.error('No access token available before player initialization')
        setError('Not authenticated. Please log in to Spotify.')
        return
      }
      
      console.log('Creating Spotify player instance...')
      try {
        const player = new window.Spotify!.Player({
          name: 'Beat It Rhythm Game',
          getOAuthToken: (cb: (token: string) => void) => {
            const currentToken = getStoredAccessToken()
            console.log('getOAuthToken called, token available:', !!currentToken)
            if (currentToken) {
              cb(currentToken)
            } else {
              console.error('No access token available in getOAuthToken')
              setError('No access token. Please log in again.')
            }
          },
          volume: 0.5,
        })

        playerRef.current = player

        // Ready event
        player.addListener('ready', ({ device_id }: { device_id: string }) => {
          console.log('✅ Spotify player ready, device ID:', device_id)
          setPlayerState(prev => ({
            ...prev,
            isReady: true,
            deviceId: device_id,
          }))
          setError(null)
          
          // Verify device is actually available
          const token = getStoredAccessToken()
          if (token) {
            fetch('https://api.spotify.com/v1/me/player/devices', {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            })
              .then(res => res.json())
              .then(data => {
                const device = data.devices?.find((d: any) => d.id === device_id)
                if (device) {
                  console.log('✅ Device verified in Spotify API:', device.name, device.id)
                } else {
                  console.warn('⚠️ Device ID not found in Spotify API devices list')
                }
              })
              .catch(err => console.warn('Could not verify device:', err))
          }
        })

        // Not ready event
        player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
          console.log('Spotify player not ready, device ID:', device_id)
          setPlayerState(prev => ({
            ...prev,
            isReady: false,
            deviceId: device_id,
          }))
        })

        // Playback state changed
        player.addListener('player_state_changed', (state: SpotifyPlaybackState | null) => {
          if (state) {
            setPlayerState(prev => ({
              ...prev,
              isPlaying: !state.paused,
              currentTrack: state.track_window.current_track,
              position: state.position / 1000, // Convert to seconds
              duration: state.duration / 1000, // Convert to seconds
            }))
          }
        })

        // Authentication error
        player.addListener('authentication_error', ({ message }: { message: string }) => {
          console.error('Spotify authentication error:', message)
          setError(`Authentication error: ${message}. Please log out and log in again.`)
        })

        // Playback error
        player.addListener('playback_error', ({ message }: { message: string }) => {
          console.error('Spotify playback error:', message)
          setError(`Playback error: ${message}`)
        })

        // Initialization error
        player.addListener('initialization_error', ({ message }: { message: string }) => {
          // Check for DRM/EME errors - check both message and global error state
          // If message is generic "Failed to initialize player", it's often a DRM issue
          const isGenericError = message.toLowerCase() === 'failed to initialize player' || 
                                 message.toLowerCase().includes('failed to initialize')
          const isDrmError = message.toLowerCase().includes('keysystem') || 
                           message.toLowerCase().includes('drm') ||
                           message.toLowerCase().includes('eme') ||
                           message.toLowerCase().includes('media key') ||
                           drmErrorDetected ||
                           (isGenericError && !hasEmeSupport) // Assume DRM if generic error and no EME support
          
          // Log error details in a single grouped message
          console.group('🔴 Spotify Player Initialization Error')
          console.error('Message:', message)
          if (drmErrorDetected) {
            console.warn('⚠️ DRM/EME error detected in console (EMEError: No supported keysystem)')
          }
          if (isGenericError && !hasEmeSupport) {
            console.warn('⚠️ Generic error with no EME support - likely a DRM issue')
          }
          if (isDrmError || drmErrorDetected || (isGenericError && !hasEmeSupport)) {
            console.warn('This is a DRM/EME (Encrypted Media Extensions) error.')
            console.warn('Common causes:')
            console.warn('  • Browser does not support required DRM (Widevine, PlayReady)')
            console.warn('  • Not running in a secure context (HTTPS or localhost)')
            console.warn('  • Browser extensions blocking DRM')
            console.warn('  • Incognito/private mode (some browsers disable DRM)')
            console.warn('  • Safari on Windows (limited DRM support)')
            console.warn('')
            console.warn('💡 Solutions:')
            console.warn('  1. Use Chrome, Firefox, or Edge (best DRM support)')
            console.warn('  2. Ensure you\'re on HTTPS or localhost')
            console.warn('  3. Disable browser extensions that might block DRM')
            console.warn('  4. Exit incognito/private mode')
            console.warn('  5. If on Safari, ensure you\'re on macOS/iOS')
          } else {
            console.warn('Common causes:')
            console.warn('  • User does not have Spotify Premium')
            console.warn('  • Access token is invalid or expired')
            console.warn('  • SDK not fully loaded')
            console.warn('  • Browser/network issues')
          }
          console.groupEnd()
          
          // Provide more helpful error message
          let errorMsg = `Initialization error: ${message}. `
          
          // If it's a generic error and we detected DRM issues or no EME support, treat as DRM error
          // Also treat generic errors as potential DRM issues since "Failed to initialize player" 
          // is often caused by DRM problems
          const treatAsDrmError = isDrmError || drmErrorDetected || (isGenericError && !hasEmeSupport) || isGenericError
          
          if (treatAsDrmError) {
            errorMsg += 'This is a DRM (Digital Rights Management) error. '
            const browserInfo = typeof navigator !== 'undefined' ? navigator.userAgent : ''
            const isSafari = browserInfo.includes('Safari') && !browserInfo.includes('Chrome')
            const isChrome = browserInfo.includes('Chrome')
            const isFirefox = browserInfo.includes('Firefox')
            const isEdge = browserInfo.includes('Edge')
            
            if (isSafari) {
              errorMsg += 'Safari has limited DRM support. Please try Chrome, Firefox, or Edge instead.'
            } else if (!isChrome && !isFirefox && !isEdge) {
              errorMsg += 'Your browser may not support the required DRM system. Please try Chrome, Firefox, or Edge.'
            } else {
              errorMsg += 'Your browser should support DRM, but it\'s not working. Try: 1) Disable browser extensions, 2) Exit incognito/private mode, 3) Ensure you\'re on HTTPS or localhost.'
            }
          } else if (message.includes('Premium') || message.toLowerCase().includes('premium')) {
            errorMsg += 'You need Spotify Premium to use the Web Playback SDK.'
          } else if (message.includes('token') || message.toLowerCase().includes('token')) {
            errorMsg += 'Your session may have expired. Please log out and log in again.'
          } else {
            // Generic error - but check if we detected DRM error
            if (drmErrorDetected) {
              errorMsg += 'This appears to be a DRM error. Please try Chrome, Firefox, or Edge. Make sure you\'re on HTTPS or localhost and not in incognito mode.'
            } else {
              errorMsg += 'Make sure you have Spotify Premium and try refreshing the page. If the issue persists, try a different browser.'
            }
          }
          
          setError(errorMsg)
        })

        // Connect to player
        console.log('Attempting to connect to Spotify player...')
        player.connect().then((success: boolean) => {
          console.log('Player connect result:', success)
          if (!success) {
            setError('Failed to connect to Spotify player. Make sure you have Spotify Premium and the Spotify app is open.')
          }
        }).catch((err: unknown) => {
          console.error('Failed to connect to Spotify player:', err)
          setError('Failed to connect to Spotify player. Make sure you have Spotify Premium.')
        })

        // Update position periodically
        positionUpdateIntervalRef.current = setInterval(async () => {
          try {
            const state = await player.getCurrentState()
            if (state) {
              setPlayerState(prev => ({
                ...prev,
                position: state.position / 1000,
                isPlaying: !state.paused,
              }))
            }
          } catch (err: unknown) {
            // Silently fail - state updates come from events
          }
        }, 100) // Update every 100ms for smooth progress
      } catch (err) {
        console.error('Failed to initialize Spotify player:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize player')
      }
    }

    return () => {
      isMounted = false
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      if (positionUpdateIntervalRef.current) {
        clearInterval(positionUpdateIntervalRef.current)
      }
      if (playerRef.current) {
        playerRef.current.disconnect()
      }
    }
  }, [])

  const play = useCallback(async (trackUri: string) => {
    console.log('Play called with URI:', trackUri)
    console.log('Player state:', { isReady: playerState.isReady, deviceId: playerState.deviceId })
    
    if (!playerRef.current) {
      throw new Error('Player not initialized')
    }

    // Wait for player to be ready and have a device ID
    let currentDeviceId = playerState.deviceId
    let playerReady = playerState.isReady

    // If not ready, wait for it (max 10 seconds)
    if (!playerReady || !currentDeviceId) {
      console.log('Waiting for player to be ready...', { playerReady, deviceId: currentDeviceId })
      let attempts = 0
      const maxAttempts = 100 // 10 seconds
      
      while ((!playerReady || !currentDeviceId) && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Check player state directly
        if (playerRef.current) {
          try {
            const state = await playerRef.current.getCurrentState()
            if (state) {
              // Player has state, so it's connected
              playerReady = true
              console.log('Player is connected (has state)')
            }
          } catch (err) {
            // Player not ready yet
          }
        }
        
        // Update from state (in case it changed)
        currentDeviceId = playerState.deviceId
        playerReady = playerState.isReady
        attempts++
        
        if (attempts % 10 === 0) {
          console.log(`Still waiting for player... (${attempts * 100}ms)`, { playerReady, deviceId: currentDeviceId })
        }
      }
      
      if (!playerReady) {
        throw new Error('Player is not ready. Make sure the player is connected and try again.')
      }
      
      if (!currentDeviceId) {
        // Try to get device ID from Spotify API as fallback
        console.warn('Device ID not in state, trying to get from Spotify API...')
        try {
          const token = getStoredAccessToken()
          if (token) {
            const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            })
            if (response.ok) {
              const data = await response.json()
              const webPlayerDevice = data.devices?.find((d: any) => d.type === 'Computer' || d.name?.includes('Beat It'))
              if (webPlayerDevice) {
                currentDeviceId = webPlayerDevice.id
                console.log('Found device ID from API:', currentDeviceId)
              }
            }
          }
        } catch (err) {
          console.warn('Could not get device ID from API:', err)
        }
        
        if (!currentDeviceId) {
          throw new Error('Player device not found. Make sure the player is connected and ready. Try refreshing the page.')
        }
      }
    }

    const token = getStoredAccessToken()
    if (!token) {
      throw new Error('Not authenticated')
    }

    try {
      console.log('Starting playback on device:', currentDeviceId || playerState.deviceId)
      // Use Spotify Web API to start playback
      const deviceId = currentDeviceId || playerState.deviceId
      
      // First, ensure the device is active by transferring playback to it
      // This is required if the device isn't already the active device
      try {
        const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            device_ids: [deviceId],
            play: false, // Don't start playing yet, just transfer
          }),
        })
        
        if (!transferResponse.ok && transferResponse.status !== 204) {
          // 204 is success for transfer, other statuses might be OK too
          console.warn('Device transfer response:', transferResponse.status)
        } else {
          console.log('✅ Transferred playback to device')
          // Give it a moment to register
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      } catch (transferErr) {
        console.warn('Could not transfer playback (might already be active):', transferErr)
        // Continue anyway - device might already be active
      }
      
      // Now start playback
      const response = await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: [trackUri],
          device_id: deviceId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Failed to play track' } }))
        const errorMessage = (errorData as { error?: { message?: string } }).error?.message || 'Failed to play track'
        console.error('Playback failed:', errorMessage, response.status)
        
        // Handle specific error cases
        if (errorMessage.includes('No active device') || errorMessage.includes('device not found')) {
          const betterError = 'Player device not active. Make sure the Spotify Web Player is connected and ready. Try: 1) Wait a few seconds for the player to connect, 2) Refresh the page, 3) Make sure you have Spotify Premium.'
          throw new Error(betterError)
        }
        
        throw new Error(errorMessage)
      }
      
      console.log('Playback started successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to play track'
      console.error('Play error:', errorMessage)
      setError(errorMessage)
      throw err
    }
  }, [playerState.isReady, playerState.deviceId])

  const pause = useCallback(async () => {
    if (!playerRef.current) {
      throw new Error('Player not ready')
    }
    await playerRef.current.pause()
  }, [])

  const resume = useCallback(async () => {
    if (!playerRef.current) {
      throw new Error('Player not ready')
    }
    await playerRef.current.resume()
  }, [])

  const togglePlay = useCallback(async () => {
    if (!playerRef.current) {
      throw new Error('Player not ready')
    }
    await playerRef.current.togglePlay()
  }, [])

  const seek = useCallback(async (positionSeconds: number) => {
    if (!playerRef.current) {
      throw new Error('Player not ready')
    }
    await playerRef.current.seek(positionSeconds * 1000) // Convert to milliseconds
  }, [])

  const setVolume = useCallback(async (volume: number) => {
    if (!playerRef.current) {
      throw new Error('Player not ready')
    }
    const clampedVolume = Math.max(0, Math.min(1, volume))
    await playerRef.current.setVolume(clampedVolume)
    setPlayerState(prev => ({ ...prev, volume: clampedVolume }))
  }, [])

  return {
    ...playerState,
    error,
    play,
    pause,
    resume,
    togglePlay,
    seek,
    setVolume,
  }
}
