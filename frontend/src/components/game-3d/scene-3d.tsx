'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
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
  
  return (
    <>
      {LANE_KEYS.map((key, i) => {
        const laneX = -4.5 + i * 3
        return (
          <Text
            key={key}
            position={[laneX, 0.1, 2]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={1}
            color={colors.primary}
            anchorX="center"
            anchorY="middle"
          >
            {key}
          </Text>
        )
      })}
    </>
  )
}

function SceneContent({ gameState, theme }: Scene3DProps) {
  const colors = themeColors[theme]

  return (
    <>
      {/* Camera looking down the road */}
      <perspectiveCamera
        ref={(cam) => {
          if (cam) {
            cam.position.set(0, 6, 8)
            cam.lookAt(0, 0, -30)
            cam.updateProjectionMatrix()
          }
        }}
      />
      
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
        <Tile3DComponent key={tile.id} tile={tile} theme={theme} />
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
      
      {/* Fog for depth */}
      <fog attach="fog" args={[themeBackgrounds[theme], 40, 90]} />
    </>
  )
}

export function Scene3D({ gameState, theme }: Scene3DProps) {
  return (
    <Canvas 
      shadows
      style={{ background: themeBackgrounds[theme] }}
      gl={{ antialias: true }}
      camera={{ position: [0, 6, 8], fov: 65, near: 0.1, far: 150 }}
      onCreated={({ camera }) => {
        camera.lookAt(new THREE.Vector3(0, 0, -30))
      }}
    >
      <SceneContent gameState={gameState} theme={theme} />
    </Canvas>
  )
}
