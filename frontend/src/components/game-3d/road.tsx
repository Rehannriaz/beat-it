'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Mesh } from 'three'
import type { Theme } from '@/lib/game-types'

interface RoadProps {
  theme: Theme
}

const themeColors: Record<Theme, { road: string; lines: string; glow: string; accent: string }> = {
  vaporwave: { road: '#120820', lines: '#ff71ce', glow: '#b967ff', accent: '#01cdfe' },
  retro: { road: '#150808', lines: '#ff6b35', glow: '#f7c59f', accent: '#ffcc00' },
  cyberpunk: { road: '#080812', lines: '#00f5ff', glow: '#ff00ff', accent: '#00ff88' },
  minimal: { road: '#0a0a0a', lines: '#ffffff', glow: '#888888', accent: '#cccccc' }
}

export function Road({ theme }: RoadProps) {
  const colors = themeColors[theme]
  const hitZoneRef = useRef<Mesh>(null)

  // Animate hit zone glow
  useFrame((state) => {
    if (hitZoneRef.current) {
      const material = hitZoneRef.current.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.4
    }
  })

  return (
    <group>
      {/* Main road surface with subtle reflection */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -40]} receiveShadow>
        <planeGeometry args={[12, 100]} />
        <meshStandardMaterial 
          color={colors.road}
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>

      {/* Lane dividers - glowing lines */}
      {[-3, 0, 3].map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.48, -40]}>
          <planeGeometry args={[0.1, 100]} />
          <meshStandardMaterial 
            color={colors.lines}
            emissive={colors.lines}
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}

      {/* Side borders - thick glowing rails */}
      {[-6.2, 6.2].map((x, i) => (
        <group key={i}>
          {/* Main border line */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.4, -40]}>
            <planeGeometry args={[0.3, 100]} />
            <meshStandardMaterial 
              color={colors.glow}
              emissive={colors.glow}
              emissiveIntensity={1.2}
            />
          </mesh>
          {/* Outer accent line */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x + (i === 0 ? -0.25 : 0.25), -0.42, -40]}>
            <planeGeometry args={[0.1, 100]} />
            <meshStandardMaterial 
              color={colors.accent}
              emissive={colors.accent}
              emissiveIntensity={0.8}
            />
          </mesh>
        </group>
      ))}

      {/* Perspective grid lines */}
      {Array.from({ length: 30 }).map((_, i) => (
        <mesh 
          key={i} 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, -0.47, -i * 3.5]}
        >
          <planeGeometry args={[12, 0.04]} />
          <meshStandardMaterial 
            color={colors.lines}
            emissive={colors.lines}
            emissiveIntensity={0.2}
            transparent
            opacity={Math.max(0.1, 0.5 - i * 0.015)}
          />
        </mesh>
      ))}

      {/* Hit zone - animated glowing bar */}
      <mesh 
        ref={hitZoneRef}
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.3, 0.5]}
      >
        <planeGeometry args={[12, 1.5]} />
        <meshStandardMaterial 
          color={colors.glow}
          emissive={colors.glow}
          emissiveIntensity={1}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Lane hit zones - rounded targets */}
      {['D', 'F', 'J', 'K'].map((key, i) => {
        const laneX = -4.5 + i * 3
        return (
          <group key={key} position={[laneX, -0.25, 0.5]}>
            {/* Outer ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.0, 1.2, 32]} />
              <meshStandardMaterial 
                color={colors.lines}
                emissive={colors.lines}
                emissiveIntensity={0.9}
                transparent
                opacity={0.95}
              />
            </mesh>
            {/* Inner ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <ringGeometry args={[0.6, 0.75, 32]} />
              <meshStandardMaterial 
                color={colors.accent}
                emissive={colors.accent}
                emissiveIntensity={0.5}
                transparent
                opacity={0.7}
              />
            </mesh>
            {/* Center dot */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
              <circleGeometry args={[0.2, 32]} />
              <meshStandardMaterial 
                color={colors.glow}
                emissive={colors.glow}
                emissiveIntensity={1}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
