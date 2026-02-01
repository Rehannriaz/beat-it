'use client'

import { useState, useEffect, useCallback } from 'react'
import { useThree } from '@react-three/fiber'
import { ScorePopup, ScorePopupData } from './score-popup'

interface ScorePopupsProps {
  lastHitFeedback: { lane: number; type: 'perfect' | 'good' | 'miss'; time: number } | null
  combo: number
}

// Calculate responsive scale (matches scene-3d.tsx)
function useResponsiveScale() {
  const { size } = useThree()
  const width = size.width

  if (width < 400) return 0.55
  if (width < 640) return 0.65
  if (width < 768) return 0.8
  if (width < 1024) return 0.9
  return 1.0
}

// Get hit zone Z position (matches road.tsx)
function getHitZoneZ(scale: number): number {
  if (scale < 0.7) return -2.0
  if (scale < 0.85) return -1.5
  return -1.0
}

export function ScorePopups({ lastHitFeedback, combo }: ScorePopupsProps) {
  const [popups, setPopups] = useState<ScorePopupData[]>([])
  const scale = useResponsiveScale()
  const hitZoneZ = getHitZoneZ(scale)

  // Handle new hit feedback
  useEffect(() => {
    if (!lastHitFeedback) return

    const { lane, type, time } = lastHitFeedback

    // Calculate score based on hit type
    let score = 0
    if (type === 'perfect') score = 150
    else if (type === 'good') score = 100

    // Calculate multiplier from combo
    const multiplier = Math.floor(combo / 10) + 1

    const newPopup: ScorePopupData = {
      id: `popup-${time}-${lane}`,
      lane,
      score: score * multiplier,
      type,
      multiplier,
      spawnTime: time,
    }

    setPopups(prev => [...prev, newPopup])
  }, [lastHitFeedback, combo])

  // Remove completed popup
  const handleComplete = useCallback((id: string) => {
    setPopups(prev => prev.filter(p => p.id !== id))
  }, [])

  return (
    <>
      {popups.map(popup => (
        <ScorePopup
          key={popup.id}
          popup={popup}
          hitZoneZ={hitZoneZ}
          scale={scale}
          onComplete={handleComplete}
        />
      ))}
    </>
  )
}
