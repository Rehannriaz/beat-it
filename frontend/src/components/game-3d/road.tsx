'use client'

import { useRef, useMemo, memo, useEffect } from 'react'
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
  pressedKeys?: Set<number>
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

export const Road = memo(function Road({ theme, speed = 15, isPlaying = false, pressedKeys = new Set() }: RoadProps) {
  const colors = themeColors[theme]
  const hitZoneRef = useRef<Mesh>(null)
  const roadGroupRef = useRef<Group>(null)
  const scale = useResponsiveScale()
  
  // Refs for lane dividers to animate when keys are pressed (pop effect)
  const laneDividerRefs = useRef<Array<Array<Mesh | null>>>([])
  
  // Refs for lane floor sections to animate when keys are pressed (pop effect)
  const laneFloorRefs = useRef<Array<Array<Mesh | null>>>([])
  
  // Initialize lane divider refs (3 dividers between 4 lanes, multiple segments)
  useEffect(() => {
    laneDividerRefs.current = Array.from({ length: 3 }, () => 
      Array.from({ length: NUM_SEGMENTS }, () => null)
    )
    // Initialize lane floor refs (4 lanes, multiple segments)
    laneFloorRefs.current = Array.from({ length: 4 }, () => 
      Array.from({ length: NUM_SEGMENTS }, () => null)
    )
  }, [])

  // Smooth fade function for back end (spawn area)
  const getFadeOpacity = useMemo(() => {
    const fadeStart = -50  // Start fading here
    const fadeEnd = -80    // Fully transparent at spawn
    const fadeRange = fadeStart - fadeEnd
    
    return (worldZ: number): number => {
      if (worldZ > fadeStart) return 1.0
      if (worldZ < fadeEnd) return 0.0
      
      const distanceFromStart = fadeStart - worldZ
      const fadeProgress = distanceFromStart / fadeRange
      
      // Ultra-smooth fade with multiple smoothstep passes
      let smooth = fadeProgress * fadeProgress * (3 - 2 * fadeProgress)
      smooth = smooth * smooth * (3 - 2 * smooth)  // Second pass
      smooth = smooth * smooth * (3 - 2 * smooth)  // Third pass for extra smoothness
      
      return Math.max(0, 1.0 - smooth)
    }
  }, [])

  // Animate hit zone glow, lane pop effects, and move road like a treadmill
  useFrame((state, delta) => {
    if (hitZoneRef.current) {
      const material = hitZoneRef.current.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.4
    }

    // Animate lane dividers and floor sections when keys are pressed (smooth pop effect)
    // Lane 0 (D) affects divider 0 (left), Lane 1 (F) affects divider 0 and 1, etc.
    pressedKeys.forEach((laneIndex) => {
      // Animate floor section for this lane
      const floorRefs = laneFloorRefs.current[laneIndex]
      if (floorRefs) {
        floorRefs.forEach((meshRef) => {
          if (meshRef) {
          // Pop effect: slight scale up and increase glow
          const targetScale = 1.08
          const currentScale = meshRef.scale.x
          const newScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * 25)
          meshRef.scale.set(newScale, newScale, newScale)
          
          // Get lane color for glow
          const laneColors = [
            '#ff71ce', // D - pink
            '#01cdfe', // F - cyan
            '#05ffa1', // J - green
            '#b967ff'  // K - purple
          ]
          const laneColor = laneColors[laneIndex] || colors.glow
          
          // Increase emissive intensity smoothly (more transparent)
          if (meshRef.material instanceof THREE.MeshStandardMaterial) {
            meshRef.material.emissive.setStyle(laneColor)
            meshRef.material.emissiveIntensity = THREE.MathUtils.lerp(
              meshRef.material.emissiveIntensity || 0.0,
              0.15,
              delta * 25
            )
          }
          }
        })
      }
      
      // Each lane affects the dividers on its sides
      const dividerIndices: number[] = []
      if (laneIndex === 0) dividerIndices.push(0) // Left lane affects left divider
      if (laneIndex === 1) dividerIndices.push(0, 1) // Second lane affects both dividers
      if (laneIndex === 2) dividerIndices.push(1, 2) // Third lane affects both dividers
      if (laneIndex === 3) dividerIndices.push(2) // Right lane affects right divider
      
      // Get lane color for better visual feedback
      const laneColors = [
        '#ff71ce', // D - pink
        '#01cdfe', // F - cyan
        '#05ffa1', // J - green
        '#b967ff'  // K - purple
      ]
      const laneColor = laneColors[laneIndex] || colors.lines
      
      dividerIndices.forEach((dividerIndex) => {
        const dividerRefs = laneDividerRefs.current[dividerIndex]
        if (dividerRefs && dividerRefs.length > 0) {
          dividerRefs.forEach((meshRef) => {
            if (meshRef) {
              // Smooth pop effect: slight scale increase
              const targetScale = 1.2
              const currentScale = meshRef.scale.x
              const newScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * 25)
              meshRef.scale.set(newScale, newScale, newScale)
              
              // Smooth color transition to lane color with enhanced glow
              if (meshRef.material instanceof THREE.MeshStandardMaterial) {
                // Blend between current color and lane color
                const targetColor = new THREE.Color(laneColor)
                meshRef.material.color.lerp(targetColor, delta * 20)
                
                // Increase emissive intensity smoothly
                meshRef.material.emissive.copy(meshRef.material.color)
                meshRef.material.emissiveIntensity = THREE.MathUtils.lerp(
                  meshRef.material.emissiveIntensity || 0.6,
                  1.8,
                  delta * 25
                )
              }
            }
          })
        }
      })
    })

    // Reset floor sections that are not pressed
    for (let laneIndex = 0; laneIndex < 4; laneIndex++) {
      if (!pressedKeys.has(laneIndex)) {
        const floorRefs = laneFloorRefs.current[laneIndex]
        if (floorRefs) {
          floorRefs.forEach((meshRef) => {
            if (meshRef) {
              // Return to normal scale smoothly
              const currentScale = meshRef.scale.x
              const newScale = THREE.MathUtils.lerp(currentScale, 1.0, delta * 18)
              meshRef.scale.set(newScale, newScale, newScale)
              
              // Return to normal glow (no glow)
              if (meshRef.material instanceof THREE.MeshStandardMaterial) {
                meshRef.material.emissiveIntensity = THREE.MathUtils.lerp(
                  meshRef.material.emissiveIntensity || 0.0,
                  0.0,
                  delta * 18
                )
              }
            }
          })
        }
      }
    }

    // Reset dividers that are not affected by pressed keys
    for (let dividerIndex = 0; dividerIndex < 3; dividerIndex++) {
      const isAffected = Array.from(pressedKeys).some((laneIndex) => {
        if (laneIndex === 0) return dividerIndex === 0
        if (laneIndex === 1) return dividerIndex === 0 || dividerIndex === 1
        if (laneIndex === 2) return dividerIndex === 1 || dividerIndex === 2
        if (laneIndex === 3) return dividerIndex === 2
        return false
      })
      
      if (!isAffected) {
        laneDividerRefs.current[dividerIndex]?.forEach((meshRef) => {
          if (meshRef) {
            // Return to normal scale smoothly
            const currentScale = meshRef.scale.x
            const newScale = THREE.MathUtils.lerp(currentScale, 1.0, delta * 18)
            meshRef.scale.set(newScale, newScale, newScale)
            
            // Return to original color and normal glow
            if (meshRef.material instanceof THREE.MeshStandardMaterial) {
              // Return to original color
              const originalColor = new THREE.Color(colors.lines)
              meshRef.material.color.lerp(originalColor, delta * 18)
              
              // Return to normal glow
              meshRef.material.emissive.copy(meshRef.material.color)
              meshRef.material.emissiveIntensity = THREE.MathUtils.lerp(
                meshRef.material.emissiveIntensity || 0.6,
                0.6,
                delta * 18
              )
            }
          }
        })
      }
    }

    // Move road forward (treadmill effect)
    if (isPlaying && roadGroupRef.current) {
      roadGroupRef.current.position.z += speed * delta

      // Seamless loop
      if (roadGroupRef.current.position.z >= SEGMENT_LENGTH) {
        roadGroupRef.current.position.z -= SEGMENT_LENGTH
      }
      
      // Update opacity for fade effect at back end
      const groupZ = roadGroupRef.current.position.z
      roadGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material as THREE.MeshStandardMaterial
          if (material) {
            const worldZ = child.position.z + groupZ
            // Only apply fade in the spawn area
            if (worldZ <= -50 && worldZ >= -80) {
              const opacity = getFadeOpacity(worldZ)
              material.opacity = opacity
              material.transparent = true
            } else if (worldZ < -80) {
              material.opacity = 0
              material.transparent = true
            } else {
              material.opacity = 1.0
              material.transparent = false
            }
          }
        }
      })
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

        {/* Lane floor sections - individual sections that can pop when keys are pressed */}
        {roadSegments.map((segment, j) => {
          const laneWidth = 3
          const lanePositions = [-4.5, -1.5, 1.5, 4.5]
          
          return lanePositions.map((x, laneIndex) => (
            <mesh
              key={`lane-floor-${laneIndex}-${j}`}
              ref={(el) => {
                if (laneFloorRefs.current[laneIndex]) {
                  laneFloorRefs.current[laneIndex][j] = el
                }
              }}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[x, -0.49, segment.z]}
            >
              <planeGeometry args={[laneWidth - 0.2, SEGMENT_LENGTH]} />
              <meshStandardMaterial
                color={colors.road}
                emissive={colors.road}
                emissiveIntensity={0.0}
                roughness={0.7}
                metalness={0.3}
              />
            </mesh>
          ))
        })}

        {/* Lane dividers - glowing lines with pop effect */}
        {[-3, 0, 3].map((x, i) => (
          roadSegments.map((segment, j) => (
            <mesh
              key={`divider-${i}-${j}`}
              ref={(el) => {
                if (laneDividerRefs.current[i]) {
                  laneDividerRefs.current[i][j] = el
                }
              }}
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
