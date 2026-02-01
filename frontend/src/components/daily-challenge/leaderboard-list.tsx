'use client'

import { Trophy, Medal } from 'lucide-react'
import type { LeaderboardEntry } from '@/types/daily-challenge'

interface LeaderboardListProps {
  entries: LeaderboardEntry[]
  isLoading: boolean
  textColor: string
  glowColor: string
  laneColors: string[]
}

export function LeaderboardList({
  entries,
  isLoading,
  textColor,
  glowColor,
  laneColors
}: LeaderboardListProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8 opacity-60" style={{ color: textColor }}>
        Loading leaderboard...
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 opacity-60" style={{ color: textColor }}>
        No scores yet. Be the first to play!
      </div>
    )
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4" style={{ color: '#FFD700' }} />
    if (rank === 2) return <Medal className="w-4 h-4" style={{ color: '#C0C0C0' }} />
    if (rank === 3) return <Medal className="w-4 h-4" style={{ color: '#CD7F32' }} />
    return <span className="w-4 text-center text-xs opacity-60">#{rank}</span>
  }

  return (
    <div className="space-y-1 max-h-64 overflow-y-auto">
      {entries.map((entry) => (
        <div
          key={`${entry.rank}-${entry.name}`}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
            entry.is_current_user ? 'ring-2' : ''
          }`}
          style={{
            background: entry.is_current_user ? `${glowColor}20` : 'rgba(255,255,255,0.05)',
            color: textColor,
            '--tw-ring-color': entry.is_current_user ? glowColor : undefined,
          } as React.CSSProperties}
        >
          <div className="w-6 flex justify-center">
            {getRankIcon(entry.rank)}
          </div>

          <div className="flex-1 min-w-0">
            <span className="truncate font-medium text-sm">
              {entry.name}
              {entry.is_current_user && <span className="ml-1 opacity-60">(you)</span>}
            </span>
          </div>

          <div className="text-right text-sm">
            <div className="font-bold" style={{ color: laneColors[0] }}>
              {entry.score.toLocaleString()}
            </div>
            <div className="text-xs opacity-60">
              {entry.accuracy.toFixed(1)}% • {entry.max_combo}x
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
