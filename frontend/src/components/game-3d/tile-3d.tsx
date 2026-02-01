'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Mesh } from 'three'
import type { Theme } from '@/lib/game-types'
import type { Tile3D } from '@/hooks/use-game-3d'

interface Tile3DProps {
  tile: Tile3D
  theme: Theme
  onHit?: (lane: number) => void
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

export function Tile3DComponent({ tile, theme, onHit }: Tile3DProps) {
  const meshRef = useRef<Mesh>(null)
  const { size } = useThree()
  const [visible, setVisible] = useState(true)
  const [hitScale, setHitScale] = useState(1)
  const colors = themeColors[theme]
  const color = colors.tiles[tile.lane % 4]
  const glowColor = colors.glow[tile.lane % 4]
  
  // Memoize responsive scale calculation
  const scale = useMemo(() => {
    const width = size.width
    if (width < 400) return 0.55
    if (width < 640) return 0.65
    if (width < 768) return 0.8
    if (width < 1024) return 0.9
    if (width >= 1920) return 0.95
    return 1.0
  }, [size.width])
  
  // Memoize lane position
  const laneX = useMemo(() => (-4.5 + tile.lane * 3) * scale, [tile.lane, scale])

  // Calculate fade-in opacity based on Z position (tiles spawn at z = -70)
  const spawnOpacity = useMemo(() => {
    const spawnZ = -70  // Spawn point
    const fadeEndZ = -60  // Fully visible here
    const z = tile.z
    
    if (z >= fadeEndZ) return 1.0  // Full opacity after fade-in
    if (z <= spawnZ) return 0.0     // Fully transparent at spawn
    
    // Smooth fade-in from spawn to fadeEndZ
    const fadeRange = fadeEndZ - spawnZ
    const distanceFromSpawn = z - spawnZ
    const fadeProgress = distanceFromSpawn / fadeRange
    // Use smoothstep for smooth fade-in
    const smoothFade = fadeProgress * fadeProgress * (3 - 2 * fadeProgress)
    return Math.max(0, Math.min(1, smoothFade))
  }, [tile.z])

  useEffect(() => {
    if (tile.hit) {
      setHitScale(1.4)
      const timeout = setTimeout(() => setVisible(false), 150)
      return () => clearTimeout(timeout)
    }
  }, [tile.hit])

  // Memoize tile number calculation
  const tileNum = useMemo(() => parseInt(tile.id.replace(/\D/g, ''), 10) || 0, [tile.id])
  
  useFrame((state) => {
    if (meshRef.current && !tile.hit && !tile.missed) {
      const time = state.clock.elapsedTime
      const float = Math.sin(time * 3 + tileNum * 0.5) * 0.03
      meshRef.current.position.y = 0.15 + float
    }
  })

  if (!visible || tile.missed) return null

  const baseScale = tile.hit ? hitScale * scale : scale
  
  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    if (onHit && !tile.hit && !tile.missed) {
      onHit(tile.lane)
    }
  }

  return (
    <group position={[laneX, 0, tile.z]}>
      <mesh
        ref={meshRef}
        position={[0, 0.15, 0]}
        scale={baseScale}
        onClick={handleClick}
        onPointerDown={handleClick}
      >
        <boxGeometry args={[2.2, 0.6, 1.8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={tile.hit ? 0.5 : 0.2}
          metalness={0.1}
          roughness={0.4}
          transparent
          opacity={spawnOpacity}
        />
      </mesh>

      <mesh
        position={[0, 0.47, 0]}
        scale={baseScale}
        onClick={handleClick}
        onPointerDown={handleClick}
      >
        <boxGeometry args={[2.1, 0.08, 1.7]} />
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={tile.hit ? 0.6 : 0.25}
          metalness={0.05}
          roughness={0.3}
          transparent
          opacity={spawnOpacity}
        />
      </mesh>
    </group>
  )
}
