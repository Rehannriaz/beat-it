'use client'

import { useRef, useMemo, memo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Mesh, Group } from 'three'
import type { Theme } from '@/lib/game-types'

// Get responsive scale factor for mobile - scales entire scene down
function useResponsiveScale() {
  const { size } = useThree()
  const width = size.width

  // Very small phones - scale down even more
  if (width < 400) {
    return 0.55 // Scale down to 55% on very small phones
  }
  // Mobile phones - scale everything down significantly
  if (width < 640) {
    return 0.65 // Scale down to 65% on mobile
  }
  // Small tablets
  if (width < 768) {
    return 0.8
  }
  // Tablets
  if (width < 1024) {
    return 0.9
  }
  // Normal size
  return 1.0
}

// Get hit zone Z position - further from camera (more negative = further away/higher)
function getHitZoneZ(scale: number): number {
  // Negative Z values = further from camera (higher up on screen)
  // Keep hit zone much further from camera to be higher on screen
  if (scale < 0.7) {
    return -2.0 // Much further from camera on mobile (higher on screen)
  }
  if (scale < 0.85) {
    return -1.5 // Further from camera on small tablets
  }
  return -1.0 // Further from camera on desktop
}

interface RoadProps {
  theme: Theme
  speed?: number
  isPlaying?: boolean
}

const themeColors: Record<Theme, { road: string; lines: string; glow: string; accent: string }> = {
  vaporwave: { road: '#120820', lines: '#ff71ce', glow: '#b967ff', accent: '#01cdfe' },
  retro: { road: '#150808', lines: '#ff6b35', glow: '#f7c59f', accent: '#ffcc00' },
  cyberpunk: { road: '#080812', lines: '#00f5ff', glow: '#ff00ff', accent: '#00ff88' },
  minimal: { road: '#0a0a0a', lines: '#ffffff', glow: '#888888', accent: '#cccccc' }
}

// Use larger segments for better performance
const SEGMENT_LENGTH = 30
const NUM_SEGMENTS = 4
const ROAD_LENGTH = SEGMENT_LENGTH * NUM_SEGMENTS

export const Road = memo(function Road({ theme, speed = 15, isPlaying = false }: RoadProps) {
  const colors = themeColors[theme]
  const hitZoneRef = useRef<Mesh>(null)
  const roadGroupRef = useRef<Group>(null)
  const scale = useResponsiveScale()

  // Animate hit zone glow and move road like a treadmill
  useFrame((state, delta) => {
    if (hitZoneRef.current) {
      const material = hitZoneRef.current.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.4
    }

    // Move road forward (treadmill effect)
    if (isPlaying && roadGroupRef.current) {
      roadGroupRef.current.position.z += speed * delta

      // Seamless loop
      if (roadGroupRef.current.position.z >= SEGMENT_LENGTH) {
        roadGroupRef.current.position.z -= SEGMENT_LENGTH
      }
    }
  })

  // Fewer, larger segments
  const roadSegments = useMemo(() => {
    const segments: Array<{ z: number }> = []
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const segmentZ = -90 + i * SEGMENT_LENGTH
      segments.push({ z: segmentZ })
    }
    return segments
  }, [])

  // Use consistent scale for all geometry - only scale X and Z, not Y
  return (
    <group scale={[scale, scale, scale]}>
      {/* Moving road group - treadmill effect */}
      <group ref={roadGroupRef}>
        {/* Main road surface - tiling segments */}
        {roadSegments.map((segment, i) => (
          <mesh
            key={`road-${i}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.5, segment.z]}
          >
            <planeGeometry args={[12, SEGMENT_LENGTH]} />
            <meshStandardMaterial
              color={colors.road}
              roughness={0.7}
              metalness={0.3}
            />
          </mesh>
        ))}

        {/* Lane dividers - glowing lines */}
        {[-3, 0, 3].map((x, i) => (
          roadSegments.map((segment, j) => (
            <mesh
              key={`divider-${i}-${j}`}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[x, -0.48, segment.z]}
            >
              <planeGeometry args={[0.1, SEGMENT_LENGTH]} />
              <meshStandardMaterial
                color={colors.lines}
                emissive={colors.lines}
                emissiveIntensity={0.6}
              />
            </mesh>
          ))
        ))}

        {/* Side borders - glowing rails */}
        {[-6.2, 6.2].map((x, i) => (
          roadSegments.map((segment, j) => (
            <mesh
              key={`border-${i}-${j}`}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[x, -0.4, segment.z]}
            >
              <planeGeometry args={[0.4, SEGMENT_LENGTH]} />
              <meshStandardMaterial
                color={colors.glow}
                emissive={colors.glow}
                emissiveIntensity={1.2}
              />
            </mesh>
          ))
        ))}

        {/* Perspective grid lines - spacing must divide evenly into SEGMENT_LENGTH for seamless loop */}
        {useMemo(() => {
          const gridLines: Array<{ z: number }> = []
          const gridSpacing = 6 // 30 / 6 = 5, tiles perfectly
          for (let i = 0; i < ROAD_LENGTH / gridSpacing; i++) {
            const z = -90 + i * gridSpacing
            gridLines.push({ z })
          }
          return gridLines
        }, []).map((line, i) => (
          <mesh
            key={`grid-${i}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.47, line.z]}
          >
            <planeGeometry args={[12, 0.05]} />
            <meshStandardMaterial
              color={colors.lines}
              emissive={colors.lines}
              emissiveIntensity={0.4}
              transparent
              opacity={0.6}
            />
          </mesh>
        ))}
      </group>

      {/* Hit zone - 3D glowing bar with volume - width matches road (12) and scales with group */}
      {/* Position at ground level (Y = -0.5) to attach to road surface */}
      <group position={[0, -0.5, getHitZoneZ(scale)]}>
        {/* Main 3D bar - width is 12 (road width), scales with parent group */}
        {/* Position center of bar at Y = 0.15 so bottom sits on ground (Y = -0.5 + 0.15 - 0.15 = -0.5) */}
        <mesh 
          ref={hitZoneRef}
          position={[0, 0.15, 0]}
        >
          <boxGeometry args={[12, 0.3, 1.8]} />
          <meshStandardMaterial 
            color={colors.glow}
            emissive={colors.glow}
            emissiveIntensity={1.2}
            transparent
            opacity={0.7}
          />
        </mesh>
        {/* Top face - more transparent, horizontal plane on top of stripe */}
        <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[12, 1.8]} />
          <meshStandardMaterial 
            color={colors.glow}
            emissive={colors.glow}
            emissiveIntensity={1.5}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Top glow edge */}
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[12, 0.05, 1.8]} />
          <meshStandardMaterial 
            color={colors.glow}
            emissive={colors.glow}
            emissiveIntensity={1.8}
            transparent
            opacity={0.9}
          />
        </mesh>
        {/* Bottom glow edge */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[12, 0.05, 1.8]} />
          <meshStandardMaterial 
            color={colors.glow}
            emissive={colors.glow}
            emissiveIntensity={1.8}
            transparent
            opacity={0.9}
          />
        </mesh>
      </group>
    </group>
  )
})
