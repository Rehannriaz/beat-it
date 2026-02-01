'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars, Text, Environment } from '@react-three/drei'
import * as THREE from 'three'
import type { Group } from 'three'
import type { Theme } from '@/lib/game-types'
import type { GameState3D } from '@/hooks/use-game-3d'
import { Road } from './road'
import { Tile3DComponent } from './tile-3d'
import { HitEffect } from './hit-effect'
import { LANE_KEYS } from '@/lib/game-types'

interface Scene3DProps {
  gameState: GameState3D
  theme: Theme
  onTileHit?: (lane: number) => void
}

const themeBackgrounds: Record<Theme, string> = {
  vaporwave: '#0f0c29',
  retro: '#1a0a0a',
  cyberpunk: '#050510',
  minimal: '#000000'
}

const themeColors: Record<Theme, { primary: string; accent: string; stars: string }> = {
  vaporwave: { primary: '#ff71ce', accent: '#b967ff', stars: '#ff71ce' },
  retro: { primary: '#ff6b35', accent: '#f7c59f', stars: '#ff6b35' },
  cyberpunk: { primary: '#00f5ff', accent: '#ff00ff', stars: '#00f5ff' },
  minimal: { primary: '#ffffff', accent: '#666666', stars: '#ffffff' }
}

function FloatingParticles({ theme }: { theme: Theme }) {
  const groupRef = useRef<Group>(null)
  const colors = themeColors[theme]
  
  const particles = useMemo(() => 
    Array.from({ length: 30 }).map(() => ({
      x: (Math.random() - 0.5) * 20,
      y: Math.random() * 8 + 2,
      z: -Math.random() * 80,
      speed: Math.random() * 0.3 + 0.1,
      size: Math.random() * 0.08 + 0.03
    }))
  , [])

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        child.position.z += particles[i].speed
        if (child.position.z > 5) {
          child.position.z = -80
        }
      })
    }
  })

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[p.size, 6, 6]} />
          <meshBasicMaterial color={colors.stars} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  )
}

function LaneKeyLabels({ theme }: { theme: Theme }) {
  const colors = themeColors[theme]
  const { size } = useThree()
  const scale = useResponsiveScale()
  
  // Get hit zone Z position to match labels with hit zones (negative = further from camera)
  const getHitZoneZ = (scale: number): number => {
    if (scale < 0.7) return -2.0
    if (scale < 0.85) return -1.5
    return -1.0
  }
  
  // Responsive font size based on screen width - larger on vertical screens
  const getFontSize = () => {
    const width = size.width
    const height = size.height
    const isPortrait = height > width
    
    // Base size
    let baseSize = 1.0
    if (width < 640) baseSize = 0.7 * scale
    else if (width < 1024) baseSize = 0.9
    else if (width >= 1920) baseSize = 1.2
    else baseSize = 1.0
    
    // Increase size on vertical screens for better visibility
    if (isPortrait) {
      baseSize *= 1.3
    }
    
    return baseSize
  }
  
  const fontSize = getFontSize()
  const hitZoneZ = getHitZoneZ(scale)
  
  return (
    <>
      {LANE_KEYS.map((key, i) => {
        // Apply scale to lane positions
        const baseLaneX = -4.5 + i * 3
        const laneX = baseLaneX * scale
        // Position letters on top face of pink stripe
        // Stripe top is at Y = -0.5 (group) + 0.3 (top of bar) = -0.2
        // Position slightly above (Y = -0.15) - just a little elevation
        const letterY = -0.15
        
        return (
          <Text
            key={key}
            position={[laneX, letterY, hitZoneZ]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={fontSize * 1.2}
            color="#000000"
            anchorX="center"
            anchorY="middle"
            fontWeight="900"
            outlineWidth={fontSize * 0.02}
            outlineColor="#ffffff"
          >
            {key}
          </Text>
        )
      })}
    </>
  )
}

// Get responsive scale factor for mobile - scales entire scene down
export function useResponsiveScale() {
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

// Responsive camera component - updates in real-time on resize
function ResponsiveCamera() {
  const { camera, size } = useThree()
  const cam = camera as THREE.PerspectiveCamera
  const lastSizeRef = useRef({ width: 0, height: 0 })
  const scale = useResponsiveScale()
  
  useFrame(() => {
    // Always update camera to ensure lookAt is applied
    const width = size.width
    const height = size.height
    const aspect = width / height
    
    // Base FOV calculation - much wider FOV for mobile to see all lanes
    let fov = 65
    let cameraY = 6
    let cameraZ = 8
    
    // Calculate lookAt Y position (horizon height) - higher on mobile/portrait
    // lookAtZ controls how far ahead we look (further = more track visible)
    let lookAtY = 0
    let lookAtZ = -30
    
    // Very small phones - closer camera with wide FOV
    if (width < 400) {
      fov = 90 // Very wide FOV for tiny screens
      cameraY = 6.5 // Higher up to see more lanes
      cameraZ = 6.5 // Closer to the action
      lookAtY = 3.5 // Raise horizon significantly - show more track ahead
      lookAtZ = -25 // Look closer to see more of the track
    }
    // Mobile phones - closer camera with wide FOV to see all 4 lanes
    else if (width < 640) {
      fov = 85 // Much wider FOV to see all lanes
      cameraY = 6.2 // Higher up to see more lanes
      cameraZ = 6 // Closer to the action
      lookAtY = 3.0 // Raise horizon - show more track ahead
      lookAtZ = -25 // Look closer to see more of the track
    }
    // Small tablets
    else if (width < 768) {
      fov = 75 // Slightly wider FOV
      cameraY = 6.0
      cameraZ = 7
      lookAtY = 2.0 // Raise horizon
      lookAtZ = -28
    }
    // Tablets
    else if (width < 1024) {
      fov = 70
      cameraY = 5.8
      cameraZ = 8
      lookAtY = 1.5
      lookAtZ = -30
    }
    // Large screens/TVs
    else if (width >= 1920) {
      fov = 60 // Narrower FOV for large screens
      cameraY = 6.5
      cameraZ = 9
      lookAtY = 0.5
      lookAtZ = -30
    }
    
    // Adjust for landscape vs portrait
    if (height > width) {
      // Portrait mode - raise horizon significantly and show more track
      fov += 12 // Even wider FOV in portrait
      lookAtY += 1.5 // Raise horizon much more in portrait - show more track ahead
      lookAtZ = -22 // Look much closer in portrait to see more track
      // Keep camera close in portrait
      if (width >= 640) {
        cameraZ += 0.5
      } else {
        // On mobile portrait, raise camera more and look further ahead
        cameraY += 0.8
        lookAtZ = -20 // Even closer look in mobile portrait
        lookAtY += 0.5 // Extra raise for mobile portrait
      }
    }
    
    // Only update projection matrix if size changed
    if (lastSizeRef.current.width !== size.width || lastSizeRef.current.height !== size.height) {
      lastSizeRef.current = { width: size.width, height: size.height }
      cam.fov = fov
      cam.aspect = aspect
      cam.updateProjectionMatrix()
    }
    
    // Always update position and lookAt to ensure they're applied
    cam.position.set(0, cameraY, cameraZ)
    cam.lookAt(new THREE.Vector3(0, lookAtY, lookAtZ)) // Raise horizon by adjusting lookAt Y
  })
  
  return null
}

function SceneContent({ gameState, theme, onTileHit }: Scene3DProps) {
  const colors = themeColors[theme]

  return (
    <>
      {/* Responsive camera */}
      <ResponsiveCamera />
      
      {/* Environment for reflections */}
      <Environment preset="night" />
      
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight 
        position={[0, 20, 10]} 
        intensity={0.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight 
        position={[-5, 10, -10]} 
        intensity={0.2}
        color={colors.accent}
      />
      <pointLight position={[0, 4, 0]} color={colors.primary} intensity={1} />
      <pointLight position={[0, 2, -20]} color={colors.accent} intensity={0.5} />
      
      {/* Background stars */}
      <Stars 
        radius={80} 
        depth={60} 
        count={800} 
        factor={3} 
        saturation={0} 
        fade 
        speed={0.5}
      />
      
      {/* Floating particles */}
      <FloatingParticles theme={theme} />
      
      {/* Road/corridor */}
      <Road theme={theme} />
      
      {/* Lane key labels */}
      <LaneKeyLabels theme={theme} />
      
      {/* Tiles */}
      {gameState.tiles.map(tile => (
        <Tile3DComponent key={tile.id} tile={tile} theme={theme} onHit={onTileHit} />
      ))}
      
      {/* Hit effects */}
      {gameState.lastHitFeedback && (
        <HitEffect 
          lane={gameState.lastHitFeedback.lane}
          type={gameState.lastHitFeedback.type}
          theme={theme}
          time={gameState.lastHitFeedback.time}
        />
      )}
      
      {/* Fog for depth - extended to see tiles at z=-70 */}
      <fog attach="fog" args={[themeBackgrounds[theme], 60, 120]} />
    </>
  )
}

export function Scene3D({ gameState, theme, onTileHit }: Scene3DProps) {
  // Calculate initial camera settings based on viewport
  const [cameraSettings, setCameraSettings] = useState({
    fov: 65,
    position: [0, 6, 8] as [number, number, number]
  })

  useEffect(() => {
    const updateCamera = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      let fov = 65
      let y = 6
      let z = 8
      
      // Mobile phones
      if (width < 640) {
        fov = 75
        y = 5.5
        z = 7.5
      }
      // Tablets
      else if (width < 1024) {
        fov = 70
        y = 5.8
        z = 8
      }
      // Large screens/TVs
      else if (width >= 1920) {
        fov = 60
        y = 6.5
        z = 9
      }
      
      // Portrait mode adjustment
      if (height > width) {
        fov += 5
        z -= 0.5
      }
      
      setCameraSettings({
        fov,
        position: [0, y, z]
      })
    }
    
    updateCamera()
    window.addEventListener('resize', updateCamera)
    return () => window.removeEventListener('resize', updateCamera)
  }, [])

  return (
    <Canvas 
      shadows
      style={{ background: themeBackgrounds[theme] }}
      gl={{ antialias: true }}
      camera={{ 
        position: cameraSettings.position, 
        fov: cameraSettings.fov, 
        near: 0.1, 
        far: 150 
      }}
      onCreated={({ camera }) => {
        camera.lookAt(new THREE.Vector3(0, 0, -30))
      }}
    >
      <SceneContent gameState={gameState} theme={theme} onTileHit={onTileHit} />
    </Canvas>
  )
}
