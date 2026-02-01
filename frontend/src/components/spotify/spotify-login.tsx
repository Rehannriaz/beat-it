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
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="flex items-center gap-2">
          {user.images?.[0] && (
            <img
              src={user.images[0].url}
              alt={user.display_name}
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-full"
            />
          )}
          <span className="text-xs sm:text-sm font-medium truncate max-w-[150px] sm:max-w-none">{user.display_name}</span>
        </div>
        <Button variant="outline" size="sm" onClick={logout} className="w-full sm:w-auto">
          <LogOut className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          Logout
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <Button onClick={login} className="bg-[#1DB954] hover:bg-[#1ed760] text-white w-full sm:w-auto text-sm sm:text-base">
        <LogIn className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
        Login with Spotify
      </Button>
      {error && (
        <p className="text-xs sm:text-sm text-red-500 text-center">{error}</p>
      )}
      <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
        Spotify Premium required to play tracks
      </p>
    </div>
  )
}
