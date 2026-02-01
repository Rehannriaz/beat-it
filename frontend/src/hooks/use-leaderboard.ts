'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { LeaderboardEntry, ScoreSubmission, DailyScore } from '@/types/daily-challenge'
import { useAuth } from './use-auth'

export const leaderboardKeys = {
  all: ['leaderboard'] as const,
  daily: (date: string) => [...leaderboardKeys.all, 'daily', date] as const,
  userBest: (date: string, userId: string) => [...leaderboardKeys.all, 'userBest', date, userId] as const,
}

export function useLeaderboard(challengeDate: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: leaderboardKeys.daily(challengeDate),
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const { data, error } = await supabase
        .from('daily_scores')
        .select(`
          id,
          user_id,
          guest_name,
          score,
          accuracy,
          max_combo,
          profiles!left(display_name)
        `)
        .eq('challenge_date', challengeDate)
        .order('score', { ascending: false })
        .limit(50)

      if (error) throw error

      type ScoreRow = {
        id: string
        user_id: string | null
        guest_name: string | null
        score: number
        accuracy: number
        max_combo: number
        profiles: { display_name: string }[] | null
      }

      return (data || []).map((entry: ScoreRow, index: number) => ({
        rank: index + 1,
        name: entry.profiles?.[0]?.display_name || entry.guest_name || 'Anonymous',
        score: entry.score,
        accuracy: entry.accuracy,
        max_combo: entry.max_combo,
        is_current_user: entry.user_id === user?.id,
      }))
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!challengeDate, // Don't run query if date is empty
  })
}

export function useUserBestScore(challengeDate: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: leaderboardKeys.userBest(challengeDate, user?.id || 'guest'),
    queryFn: async () => {
      if (!user) return null

      const { data, error } = await supabase
        .from('daily_scores')
        .select('score, accuracy, max_combo')
        .eq('challenge_date', challengeDate)
        .eq('user_id', user.id)
        .order('score', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
      return data
    },
    enabled: !!user && !!challengeDate, // Don't run query if date is empty
  })
}

export function useSubmitScore() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (params: ScoreSubmission & { guest_name?: string }) => {
      const { challenge_date, spotify_track_id, score, accuracy, max_combo, guest_name } = params

      const insertData = user
        ? {
            user_id: user.id,
            challenge_date,
            spotify_track_id,
            score,
            accuracy,
            max_combo,
          }
        : {
            guest_name: guest_name!,
            challenge_date,
            spotify_track_id,
            score,
            accuracy,
            max_combo,
          }

      const { data, error } = await supabase
        .from('daily_scores')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: leaderboardKeys.daily(variables.challenge_date),
      })
      if (user) {
        queryClient.invalidateQueries({
          queryKey: leaderboardKeys.userBest(variables.challenge_date, user.id),
        })
      }
    },
  })
}
