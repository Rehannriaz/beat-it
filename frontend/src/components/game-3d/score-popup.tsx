'use client'

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'

export interface ScorePopupData {
  id: string
  lane: number
  score: number
  type: 'perfect' | 'good' | 'miss'
  multiplier: number
  spawnTime: number
}

interface ScorePopupProps {
  popup: ScorePopupData
  hitZoneZ: number
  scale: number
  onComplete: (id: string) => void
}

const POPUP_DURATION = 0.6 // seconds
const RISE_DISTANCE = 2.5

export function ScorePopup({ popup, hitZoneZ, scale, onComplete }: ScorePopupProps) {
  const [progress, setProgress] = useState(0)
  const startTimeRef = useRef<number | null>(null)

  // Calculate lane X position
  const laneX = (-4.5 + popup.lane * 3) * scale

  useFrame((state) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.elapsedTime
    }

    const elapsed = state.clock.elapsedTime - startTimeRef.current
    const newProgress = Math.min(elapsed / POPUP_DURATION, 1)
    setProgress(newProgress)

    if (newProgress >= 1) {
      onComplete(popup.id)
    }
  })

  // Animation values
  const y = 0.5 + progress * RISE_DISTANCE
  const opacity = 1 - progress
  // Pop-in effect: start at 1.3x, settle to 1x quickly
  const popScale = progress < 0.1 ? 1.3 - (progress / 0.1) * 0.3 : 1

  // Color based on hit type
  const color = popup.type === 'perfect'
    ? '#FFD700'
    : popup.type === 'good'
      ? '#FFFFFF'
      : '#FF4444'

  // Format text
  const scoreText = popup.type === 'miss'
    ? 'MISS'
    : `+${popup.score}`
  const multiplierText = popup.multiplier > 1 && popup.type !== 'miss'
    ? ` x${popup.multiplier}`
    : ''

  if (opacity <= 0) return null

  return (
    <group position={[laneX, y, hitZoneZ]}>
      <Text
        fontSize={0.5 * scale * popScale}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
        fillOpacity={opacity}
        outlineOpacity={opacity}
      >
        {scoreText}
      </Text>
      {multiplierText && (
        <Text
          position={[0.8 * scale, 0, 0]}
          fontSize={0.35 * scale * popScale}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.015}
          outlineColor="#000000"
          fillOpacity={opacity * 0.8}
          outlineOpacity={opacity * 0.8}
        >
          {multiplierText}
        </Text>
      )}
    </group>
  )
}
