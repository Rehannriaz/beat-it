'use client'

import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Mesh } from 'three'
import type { Theme } from '@/lib/game-types'
import type { Tile3D } from '@/hooks/use-game-3d'

interface Tile3DProps {
  tile: Tile3D
  theme: Theme
}

const themeColors: Record<Theme, { tiles: string[]; glow: string[] }> = {
  vaporwave: {
    tiles: ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff'],
    glow: ['#ff99dd', '#33e5ff', '#33ffb5', '#d399ff']
  },
  retro: {
    tiles: ['#ff6b35', '#f7c59f', '#efefd0', '#004e89'],
    glow: ['#ff8855', '#ffd9bb', '#fffff0', '#1177bb']
  },
  cyberpunk: {
    tiles: ['#00f5ff', '#ff00ff', '#ffff00', '#00ff00'],
    glow: ['#66f9ff', '#ff66ff', '#ffff66', '#66ff66']
  },
  minimal: {
    tiles: ['#ffffff', '#dddddd', '#bbbbbb', '#999999'],
    glow: ['#ffffff', '#eeeeee', '#dddddd', '#cccccc']
  }
}

export function Tile3DComponent({ tile, theme }: Tile3DProps) {
  const meshRef = useRef<Mesh>(null)
  const [visible, setVisible] = useState(true)
  const [hitScale, setHitScale] = useState(1)
  const colors = themeColors[theme]
  const color = colors.tiles[tile.lane % 4]
  const glowColor = colors.glow[tile.lane % 4]
  const laneX = -4.5 + tile.lane * 3

  useEffect(() => {
    if (tile.hit) {
      setHitScale(1.4)
      const timeout = setTimeout(() => setVisible(false), 150)
      return () => clearTimeout(timeout)
    }
  }, [tile.hit])

  useFrame((state) => {
    if (meshRef.current && !tile.hit && !tile.missed) {
      const time = state.clock.elapsedTime
      const tileNum = parseInt(tile.id.replace(/\D/g, ''), 10) || 0
      const float = Math.sin(time * 3 + tileNum * 0.5) * 0.03
      meshRef.current.position.y = 0.4 + float
    }
  })

  if (!visible || tile.missed) return null

  return (
    <group position={[laneX, 0, tile.z]}>
      <mesh
        ref={meshRef}
        position={[0, 0.4, 0]}
        scale={tile.hit ? hitScale : 1}
      >
        <boxGeometry args={[2.2, 0.6, 1.8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={tile.hit ? 0.5 : 0.2}
          metalness={0.1}
          roughness={0.4}
        />
      </mesh>

      <mesh
        position={[0, 0.72, 0]}
        scale={tile.hit ? hitScale : 1}
      >
        <boxGeometry args={[2.1, 0.08, 1.7]} />
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={tile.hit ? 0.6 : 0.25}
          metalness={0.05}
          roughness={0.3}
        />
      </mesh>
    </group>
  )
}
