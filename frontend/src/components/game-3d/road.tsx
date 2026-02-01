'use client'

import { useRef, useMemo, memo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Mesh } from 'three'
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
}

const themeColors: Record<Theme, { road: string; lines: string; glow: string; accent: string }> = {
  vaporwave: { road: '#120820', lines: '#ff71ce', glow: '#b967ff', accent: '#01cdfe' },
  retro: { road: '#150808', lines: '#ff6b35', glow: '#f7c59f', accent: '#ffcc00' },
  cyberpunk: { road: '#080812', lines: '#00f5ff', glow: '#ff00ff', accent: '#00ff88' },
  minimal: { road: '#0a0a0a', lines: '#ffffff', glow: '#888888', accent: '#cccccc' }
}

export const Road = memo(function Road({ theme }: RoadProps) {
  const colors = themeColors[theme]
  const hitZoneRef = useRef<Mesh>(null)
  const scale = useResponsiveScale()

  // Animate hit zone glow
  useFrame((state) => {
    if (hitZoneRef.current) {
      const material = hitZoneRef.current.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.4
    }
  })

  // Helper function to calculate fade opacity based on Z position
  // Tiles spawn at z = -70, so we fade gradually from z = -30 to z = -80
  const getFadeOpacity = useMemo(() => {
    const fadeStart = -30
    const fadeEnd = -80
    const fadeRange = fadeStart - fadeEnd
    
    return (z: number): number => {
      if (z > fadeStart) return 1.0
      if (z < fadeEnd) return 0.0
      
      const distanceFromStart = fadeStart - z
      const fadeProgress = distanceFromStart / fadeRange
      const smoothFade = fadeProgress * fadeProgress * (3 - 2 * fadeProgress)
      const easedFade = smoothFade * smoothFade * (3 - 2 * smoothFade)
      return Math.max(0, 1.0 - easedFade)
    }
  }, [])

  // Memoize road segments to reduce re-renders
  const roadSegments = useMemo(() => {
    const segments: Array<{ z: number; opacity: number }> = []
    for (let i = 0; i < 15; i++) {
      const segmentZ = -40 + (i - 7.5) * 6.67
      const opacity = getFadeOpacity(segmentZ)
      if (opacity > 0) {
        segments.push({ z: segmentZ, opacity })
      }
    }
    return segments
  }, [getFadeOpacity])


  // Use consistent scale for all geometry - only scale X and Z, not Y
  return (
    <group scale={[scale, scale, scale]}>
      {/* Main road surface with subtle reflection - reduced segments for performance */}
      {roadSegments.map((segment, i) => (
          <mesh 
            key={`road-${i}`}
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, -0.5, segment.z]}
          >
          <planeGeometry args={[12, 6.67]} />
          <meshStandardMaterial 
            color={colors.road}
            roughness={0.7}
            metalness={0.3}
            transparent
            opacity={segment.opacity}
          />
        </mesh>
      ))}

      {/* Lane dividers - glowing lines with fade - reduced segments */}
      {[-3, 0, 3].map((x, i) => (
        roadSegments.map((segment, j) => (
          <mesh 
            key={`divider-${i}-${j}`}
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[x, -0.48, segment.z]}
          >
            <planeGeometry args={[0.1, 6.67]} />
            <meshStandardMaterial 
              color={colors.lines}
              emissive={colors.lines}
              emissiveIntensity={0.6}
              transparent
              opacity={segment.opacity}
            />
          </mesh>
        ))
      ))}

      {/* Side borders - thick glowing rails with fade - reduced segments */}
      {[-6.2, 6.2].map((x, i) => (
        <group key={i}>
          {/* Main border line */}
          {roadSegments.map((segment, j) => (
            <mesh 
              key={`border-${i}-${j}`}
              rotation={[-Math.PI / 2, 0, 0]} 
              position={[x, -0.4, segment.z]}
            >
              <planeGeometry args={[0.3, 6.67]} />
              <meshStandardMaterial 
                color={colors.glow}
                emissive={colors.glow}
                emissiveIntensity={1.2}
                transparent
                opacity={segment.opacity}
              />
            </mesh>
          ))}
          {/* Outer accent line */}
          {roadSegments.map((segment, j) => (
            <mesh 
              key={`accent-${i}-${j}`}
              rotation={[-Math.PI / 2, 0, 0]} 
              position={[x + (i === 0 ? -0.25 : 0.25), -0.42, segment.z]}
            >
              <planeGeometry args={[0.1, 6.67]} />
              <meshStandardMaterial 
                color={colors.accent}
                emissive={colors.accent}
                emissiveIntensity={0.8}
                transparent
                opacity={segment.opacity}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Perspective grid lines with enhanced fade - reduced for performance */}
      {useMemo(() => {
        const gridLines: Array<{ z: number; opacity: number }> = []
        for (let i = 0; i < 20; i++) {
          const z = -i * 3.5
          const baseOpacity = Math.max(0.1, 0.5 - i * 0.015)
          const pathFadeOpacity = getFadeOpacity(z)
          const finalOpacity = Math.min(baseOpacity, pathFadeOpacity)
          if (finalOpacity > 0) {
            gridLines.push({ z, opacity: finalOpacity })
          }
        }
        return gridLines
      }, [getFadeOpacity]).map((line, i) => (
        <mesh 
          key={i} 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, -0.47, line.z]}
        >
          <planeGeometry args={[12, 0.04]} />
          <meshStandardMaterial 
            color={colors.lines}
            emissive={colors.lines}
            emissiveIntensity={0.2}
            transparent
            opacity={line.opacity}
          />
        </mesh>
      ))}

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
