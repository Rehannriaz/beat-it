import { NextRequest, NextResponse } from 'next/server'

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || ''
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || ''
const REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || 
  `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/spotify/callback`

/**
 * Exchange authorization code for access token
 * This route must be server-side to keep CLIENT_SECRET secure
 */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: { message: 'Authorization code is required' } },
        { status: 400 }
      )
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.json(
        { error: { message: 'Spotify credentials not configured' } },
        { status: 500 }
      )
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json().catch(() => ({ error: { message: 'Token exchange failed' } }))
      return NextResponse.json(
        { error: error.error || { message: 'Failed to exchange authorization code' } },
        { status: tokenResponse.status }
      )
    }

    const tokenData = await tokenResponse.json()

    // Return tokens to client (they will be stored in localStorage)
    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
    })
  } catch (error) {
    console.error('Token exchange error:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
