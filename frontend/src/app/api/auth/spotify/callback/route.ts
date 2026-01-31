import { NextRequest, NextResponse } from 'next/server'

/**
 * OAuth callback route - redirects to home with code
 * The actual token exchange happens client-side via /api/auth/spotify/token
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const baseUrl = new URL('/', request.url)

  if (error) {
    // Redirect to home with error
    baseUrl.searchParams.set('error', error)
    return NextResponse.redirect(baseUrl.toString())
  }

  if (code) {
    // Redirect to home with code - client will handle token exchange
    baseUrl.searchParams.set('code', code)
    return NextResponse.redirect(baseUrl.toString())
  }

  // No code or error, just redirect home
  return NextResponse.redirect(baseUrl.toString())
}
