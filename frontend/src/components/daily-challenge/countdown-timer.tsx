'use client'

import { Clock } from 'lucide-react'

interface CountdownTimerProps {
  timeFormatted: string
  textColor: string
  glowColor: string
}

export function CountdownTimer({ timeFormatted, textColor, glowColor }: CountdownTimerProps) {
  return (
    <div
      className="flex items-center gap-2 text-sm opacity-70"
      style={{ color: textColor }}
    >
      <Clock className="w-4 h-4" style={{ color: glowColor }} />
      <span>Resets in {timeFormatted}</span>
    </div>
  )
}
