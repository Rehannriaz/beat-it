'use client'

import { useSpotifyAuth } from '@/hooks/use-spotify-auth'
import { Button } from '@/components/ui/button'
import { LogIn, LogOut, User } from 'lucide-react'

export function SpotifyLogin() {
  const { isLoading, isLoggedIn, user, error, login, logout } = useSpotifyAuth()

  if (isLoading) {
    return (
      <Button disabled>
        <User className="mr-2 h-4 w-4" />
        Loading...
      </Button>
    )
  }

  if (isLoggedIn && user) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          {user.images?.[0] && (
            <img
              src={user.images[0].url}
              alt={user.display_name}
              className="h-8 w-8 rounded-full"
            />
          )}
          <span className="text-sm font-medium">{user.display_name}</span>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={login} className="bg-[#1DB954] hover:bg-[#1ed760] text-white">
        <LogIn className="mr-2 h-4 w-4" />
        Login with Spotify
      </Button>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Spotify Premium required to play tracks
      </p>
    </div>
  )
}
