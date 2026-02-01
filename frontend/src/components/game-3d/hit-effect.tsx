'use client'

import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import type { Theme } from '@/lib/game-types'

interface HitEffectProps {
  lane: number
  type: 'perfect' | 'good' | 'miss'
  theme: Theme
  time: number
}

const themeColors: Record<Theme, string[]> = {
  vaporwave: ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff'],
  retro: ['#ff6b35', '#f7c59f', '#efefd0', '#004e89'],
  cyberpunk: ['#00f5ff', '#ff00ff', '#ffff00', '#00ff00'],
  minimal: ['#ffffff', '#cccccc', '#999999', '#666666']
}

export function HitEffect({ lane, type, theme, time }: HitEffectProps) {
  const ringRef = useRef<Mesh>(null)
  const [visible, setVisible] = useState(true)
  const [scale, setScale] = useState(0.5)
  const [opacity, setOpacity] = useState(1)
  const colors = themeColors[theme]
  const color = type === 'miss' ? '#ff0000' : colors[lane]
  const laneX = -4.5 + lane * 3

  useEffect(() => {
    // Keep effect visible longer for better feedback
    const timeout = setTimeout(() => setVisible(false), 800)
    return () => clearTimeout(timeout)
  }, [time])

  useFrame((_, delta) => {
    if (scale < 4) {
      setScale(prev => prev + delta * 6)
      setOpacity(prev => Math.max(0, prev - delta * 2))
    }
  })

  if (!visible || opacity <= 0) return null

  return (
    <group position={[laneX, 0.2, 0]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} scale={[scale, scale, 1]}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial 
          color={color}
          transparent
          opacity={opacity}
        />
      </mesh>
      {type === 'perfect' && (
        <pointLight color={color} intensity={opacity * 10} distance={8} />
      )}
    </group>
  )
}
