'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  isAuthenticated,
  getStoredAccessToken,
  loginWithSpotify,
  clearTokens,
  isCallbackUrl,
  getAuthCodeFromUrl,
} from '@/lib/spotify/auth'

interface SpotifyUser {
  id: string
  display_name: string
  email: string
  images: Array<{ url: string }>
}

export function useSpotifyAuth() {
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<SpotifyUser | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = isAuthenticated()
        setIsLoggedIn(authenticated)

        if (authenticated) {
          // Try to fetch user profile
          const token = getStoredAccessToken()
          if (token) {
            try {
              const response = await fetch('https://api.spotify.com/v1/me', {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              })

              if (response.ok) {
                const userData = await response.json()
                setUser({
                  id: userData.id,
                  display_name: userData.display_name || 'User',
                  email: userData.email || '',
                  images: userData.images || [],
                })
              } else {
                // Token might be invalid
                clearTokens()
                setIsLoggedIn(false)
              }
            } catch (err) {
              console.error('Failed to fetch user profile:', err)
              clearTokens()
              setIsLoggedIn(false)
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication check failed')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Handle OAuth callback - check for code in URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const code = getAuthCodeFromUrl()
      if (code) {
        handleCallback(code)
      }
    }
  }, [])

  const handleCallback = async (code: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Exchange code for tokens via backend API
      // Detect if we're on ngrok and use appropriate backend URL
      let apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
      
      // If we're on ngrok, we need the backend to also be accessible
      // Check if we have a ngrok backend URL in env, otherwise use localhost
      if (typeof window !== 'undefined' && window.location.hostname.includes('ngrok')) {
        // If NEXT_PUBLIC_API_URL is still localhost, we need to expose backend via ngrok
        if (apiBaseUrl.includes('localhost')) {
          console.error('Backend must be exposed via ngrok when frontend is on ngrok. Set NEXT_PUBLIC_API_URL to your ngrok backend URL.')
          throw new Error('Backend not accessible. Please expose backend via ngrok and set NEXT_PUBLIC_API_URL in .env.local')
        }
      }
      
      // Ensure it ends with /api
      if (!apiBaseUrl.endsWith('/api')) {
        apiBaseUrl = apiBaseUrl.endsWith('/') ? `${apiBaseUrl}api` : `${apiBaseUrl}/api`
      }
      const tokenUrl = `${apiBaseUrl}/auth/spotify/token`
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to exchange authorization code')
      }

      const data = await response.json()
      
      // Store tokens in localStorage
      if (data.access_token && data.refresh_token && data.expires_in) {
        const expiresAt = Date.now() + data.expires_in * 1000
        localStorage.setItem('spotify_access_token', data.access_token)
        localStorage.setItem('spotify_refresh_token', data.refresh_token)
        localStorage.setItem('spotify_token_expires_at', expiresAt.toString())
      }
      
      setIsLoggedIn(true)
      
      // Get the state parameter (original path) or default to /spotify-test
      const urlParams = new URLSearchParams(window.location.search)
      const state = urlParams.get('state')
      const redirectPath = state ? decodeURIComponent(state) : '/spotify-test'
      
      // Redirect to remove code from URL and go back to original page
      window.history.replaceState({}, '', redirectPath)
      
      // Reload to fetch user profile
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
      setIsLoggedIn(false)
    } finally {
      setIsLoading(false)
    }
  }

  const login = useCallback(() => {
    setError(null)
    try {
      loginWithSpotify()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate login')
    }
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    setIsLoggedIn(false)
    setUser(null)
    setError(null)
  }, [])

  return {
    isLoading,
    isLoggedIn,
    user,
    error,
    login,
    logout,
  }
}
