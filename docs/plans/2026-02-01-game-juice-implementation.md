# Game Juice Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add satisfying audio feedback, combo celebrations, and score pop-ups to make the rhythm game feel more responsive and rewarding.

**Architecture:** Three independent systems that react to game events: (1) Web Audio synthesizer for sounds, (2) HTML overlay for combo celebrations, (3) Three.js Text components for score pop-ups. All systems observe `gameState.lastHitFeedback` and combo changes.

**Tech Stack:** Web Audio API, React, Three.js, @react-three/drei Text, Framer Motion

---

## Task 1: Sound Configuration Constants

**Files:**
- Create: `frontend/src/lib/sound-config.ts`

**Step 1: Create the sound config file**

```typescript
// Sound configuration for game audio feedback
// Uses Web Audio API frequencies and durations

export const SOUND_CONFIG = {
  // Master volume (0-1), relative to music
  masterVolume: 0.2,

  // Hit sounds - short sine wave tones
  perfect: {
    frequency: 800,
    duration: 0.08,
    type: 'sine' as OscillatorType,
    gain: 0.3,
  },
  good: {
    frequency: 600,
    duration: 0.08,
    type: 'sine' as OscillatorType,
    gain: 0.25,
  },
  miss: {
    frequency: 200,
    duration: 0.12,
    type: 'sine' as OscillatorType,
    gain: 0.2,
  },

  // Combo milestone - ascending arpeggio
  comboMilestone: {
    frequencies: [400, 600, 800],
    noteDuration: 0.08,
    noteGap: 0.05,
    type: 'sine' as OscillatorType,
    gain: 0.35,
  },

  // Milestone thresholds
  milestones: [25, 50, 100, 200, 300, 400, 500],
} as const
```

**Step 2: Commit**

```bash
git add frontend/src/lib/sound-config.ts
git commit -m "feat: add sound configuration constants"
```

---

## Task 2: Game Sounds Hook

**Files:**
- Create: `frontend/src/hooks/use-game-sounds.ts`
- Modify: `frontend/src/hooks/index.ts` (line 6, add export)

**Step 1: Create the game sounds hook**

```typescript
'use client'

import { useRef, useCallback, useEffect } from 'react'
import { SOUND_CONFIG } from '@/lib/sound-config'

export function useGameSounds() {
  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize AudioContext on first user interaction
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    // Resume if suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
    return audioContextRef.current
  }, [])

  // Play a single tone
  const playTone = useCallback((
    frequency: number,
    duration: number,
    type: OscillatorType,
    gain: number
  ) => {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.type = type
    oscillator.frequency.value = frequency

    // Apply master volume
    const finalGain = gain * SOUND_CONFIG.masterVolume
    gainNode.gain.setValueAtTime(finalGain, ctx.currentTime)
    // Quick fade out to avoid clicks
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  }, [getAudioContext])

  // Play hit sound based on type
  const playHit = useCallback((type: 'perfect' | 'good' | 'miss') => {
    const config = SOUND_CONFIG[type]
    playTone(config.frequency, config.duration, config.type, config.gain)
  }, [playTone])

  // Play combo milestone arpeggio
  const playComboMilestone = useCallback(() => {
    const config = SOUND_CONFIG.comboMilestone
    const ctx = getAudioContext()
    const startTime = ctx.currentTime

    config.frequencies.forEach((freq, i) => {
      const noteStart = startTime + i * (config.noteDuration + config.noteGap)
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.type = config.type
      oscillator.frequency.value = freq

      const finalGain = config.gain * SOUND_CONFIG.masterVolume
      gainNode.gain.setValueAtTime(finalGain, noteStart)
      gainNode.gain.exponentialRampToValueAtTime(0.001, noteStart + config.noteDuration)

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.start(noteStart)
      oscillator.stop(noteStart + config.noteDuration)
    })
  }, [getAudioContext])

  // Check if combo crossed a milestone
  const checkMilestone = useCallback((prevCombo: number, newCombo: number): boolean => {
    return SOUND_CONFIG.milestones.some(
      milestone => prevCombo < milestone && newCombo >= milestone
    )
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return {
    playHit,
    playComboMilestone,
    checkMilestone,
  }
}
```

**Step 2: Export from hooks index**

Add to `frontend/src/hooks/index.ts`:

```typescript
export * from './use-game-sounds';
```

**Step 3: Commit**

```bash
git add frontend/src/hooks/use-game-sounds.ts frontend/src/hooks/index.ts
git commit -m "feat: add useGameSounds hook with Web Audio synthesis"
```

---

## Task 3: Score Popup Component

**Files:**
- Create: `frontend/src/components/game-3d/score-popup.tsx`

**Step 1: Create the score popup component**

```typescript
'use client'

import { useRef, useState, useEffect } from 'react'
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
        {multiplierText && (
          <meshBasicMaterial color={color} transparent opacity={opacity * 0.7} />
        )}
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
```

**Step 2: Commit**

```bash
git add frontend/src/components/game-3d/score-popup.tsx
git commit -m "feat: add ScorePopup component for floating score text"
```

---

## Task 4: Score Popups Manager

**Files:**
- Create: `frontend/src/components/game-3d/score-popups.tsx`

**Step 1: Create the popups manager**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useThree } from '@react-three/fiber'
import { ScorePopup, ScorePopupData } from './score-popup'

interface ScorePopupsProps {
  lastHitFeedback: { lane: number; type: 'perfect' | 'good' | 'miss'; time: number } | null
  combo: number
}

// Calculate responsive scale (matches scene-3d.tsx)
function useResponsiveScale() {
  const { size } = useThree()
  const width = size.width

  if (width < 400) return 0.55
  if (width < 640) return 0.65
  if (width < 768) return 0.8
  if (width < 1024) return 0.9
  return 1.0
}

// Get hit zone Z position (matches road.tsx)
function getHitZoneZ(scale: number): number {
  if (scale < 0.7) return -2.0
  if (scale < 0.85) return -1.5
  return -1.0
}

export function ScorePopups({ lastHitFeedback, combo }: ScorePopupsProps) {
  const [popups, setPopups] = useState<ScorePopupData[]>([])
  const scale = useResponsiveScale()
  const hitZoneZ = getHitZoneZ(scale)

  // Handle new hit feedback
  useEffect(() => {
    if (!lastHitFeedback) return

    const { lane, type, time } = lastHitFeedback

    // Calculate score based on hit type
    let score = 0
    if (type === 'perfect') score = 150
    else if (type === 'good') score = 100

    // Calculate multiplier from combo
    const multiplier = Math.floor(combo / 10) + 1

    const newPopup: ScorePopupData = {
      id: `popup-${time}-${lane}`,
      lane,
      score: score * multiplier,
      type,
      multiplier,
      spawnTime: time,
    }

    setPopups(prev => [...prev, newPopup])
  }, [lastHitFeedback, combo])

  // Remove completed popup
  const handleComplete = useCallback((id: string) => {
    setPopups(prev => prev.filter(p => p.id !== id))
  }, [])

  return (
    <>
      {popups.map(popup => (
        <ScorePopup
          key={popup.id}
          popup={popup}
          hitZoneZ={hitZoneZ}
          scale={scale}
          onComplete={handleComplete}
        />
      ))}
    </>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/game-3d/score-popups.tsx
git commit -m "feat: add ScorePopups manager component"
```

---

## Task 5: Combo Celebration Component

**Files:**
- Create: `frontend/src/components/game-3d/combo-celebration.tsx`

**Step 1: Create the combo celebration component**

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Theme } from '@/lib/game-types'
import { themeStyles } from '@/lib/game-types'
import { SOUND_CONFIG } from '@/lib/sound-config'

interface ComboCelebrationProps {
  combo: number
  theme: Theme
  onMilestone?: () => void
}

interface Particle {
  id: number
  x: number
  y: number
  angle: number
  speed: number
  size: number
  color: string
}

export function ComboCelebration({ combo, theme, onMilestone }: ComboCelebrationProps) {
  const [activeMilestone, setActiveMilestone] = useState<number | null>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const prevComboRef = useRef(0)
  const particleIdRef = useRef(0)
  const styles = themeStyles[theme]

  // Check for milestone crossings
  useEffect(() => {
    const prevCombo = prevComboRef.current
    prevComboRef.current = combo

    // Find the milestone we just crossed
    const crossedMilestone = SOUND_CONFIG.milestones.find(
      m => prevCombo < m && combo >= m
    )

    if (crossedMilestone) {
      setActiveMilestone(crossedMilestone)
      onMilestone?.()

      // Generate particles
      const particleCount = crossedMilestone >= 100 ? 40 : crossedMilestone >= 50 ? 30 : 20
      const newParticles: Particle[] = []

      for (let i = 0; i < particleCount; i++) {
        newParticles.push({
          id: particleIdRef.current++,
          x: 50, // Start from center
          y: 50,
          angle: (Math.PI * 2 * i) / particleCount + Math.random() * 0.5,
          speed: 80 + Math.random() * 60,
          size: 4 + Math.random() * 4,
          color: styles.laneColors[i % 4],
        })
      }
      setParticles(newParticles)

      // Clear celebration after animation
      const timer = setTimeout(() => {
        setActiveMilestone(null)
        setParticles([])
      }, 800)

      return () => clearTimeout(timer)
    }
  }, [combo, onMilestone, styles.laneColors])

  return (
    <AnimatePresence>
      {activeMilestone && (
        <>
          {/* Screen flash */}
          <motion.div
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-40 pointer-events-none"
            style={{ backgroundColor: styles.glowColor }}
          />

          {/* Particles */}
          <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
            {particles.map(particle => (
              <motion.div
                key={particle.id}
                initial={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  opacity: 1,
                  scale: 1,
                }}
                animate={{
                  left: `${particle.x + Math.cos(particle.angle) * particle.speed}%`,
                  top: `${particle.y + Math.sin(particle.angle) * particle.speed}%`,
                  opacity: 0,
                  scale: 0.5,
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="absolute rounded-full"
                style={{
                  width: particle.size,
                  height: particle.size,
                  backgroundColor: particle.color,
                  boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
          </div>

          {/* Combo text */}
          <motion.div
            initial={{ scale: 2.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{
              duration: 0.4,
              ease: [0.34, 1.56, 0.64, 1] // Spring-like ease
            }}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div
              className={`text-4xl sm:text-5xl md:text-6xl font-bold ${styles.font}`}
              style={{
                color: styles.textColor,
                textShadow: `
                  0 0 20px ${styles.glowColor},
                  0 0 40px ${styles.glowColor},
                  0 0 60px ${styles.glowColor}
                `,
              }}
            >
              {activeMilestone}x COMBO!
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/game-3d/combo-celebration.tsx
git commit -m "feat: add ComboCelebration overlay component"
```

---

## Task 6: Integrate Score Popups into Scene

**Files:**
- Modify: `frontend/src/components/game-3d/scene-3d.tsx`

**Step 1: Add import at top (after line 12)**

Add after `import { HitEffect } from './hit-effect'`:

```typescript
import { ScorePopups } from './score-popups'
```

**Step 2: Update Scene3DProps interface (line 15-21)**

Replace the interface:

```typescript
interface Scene3DProps {
  gameState: GameState3D
  theme: Theme
  onTileHit?: (lane: number) => void
  speed?: number
  pressedKeys?: Set<number>
  combo?: number
}
```

**Step 3: Update SceneContent function signature (line 264)**

Replace the function signature:

```typescript
function SceneContent({ gameState, theme, onTileHit, speed = 15, pressedKeys = new Set(), combo = 0 }: Scene3DProps) {
```

**Step 4: Add ScorePopups after HitEffect (after line 348)**

Add before the closing `</>`:

```typescript
      {/* Score popups */}
      <ScorePopups
        lastHitFeedback={gameState.lastHitFeedback}
        combo={combo}
      />
```

**Step 5: Update Scene3D component to pass combo (line 426)**

Replace the SceneContent line:

```typescript
      <SceneContent gameState={gameState} theme={theme} onTileHit={onTileHit} speed={speed} pressedKeys={pressedKeys} combo={gameState.combo} />
```

**Step 6: Commit**

```bash
git add frontend/src/components/game-3d/scene-3d.tsx
git commit -m "feat: integrate ScorePopups into 3D scene"
```

---

## Task 7: Integrate Sounds and Celebrations into Game

**Files:**
- Modify: `frontend/src/components/game-3d/rhythm-game-3d.tsx`

**Step 1: Add imports (after line 6)**

Add after the useGame3D import:

```typescript
import { useGameSounds } from '@/hooks'
import { ComboCelebration } from './combo-celebration'
```

**Step 2: Add sound hook in RhythmGame3D (after line 52)**

Add after `const [spotifyPosition, setSpotifyPosition] = useState(0)`:

```typescript
  const { playHit, playComboMilestone, checkMilestone } = useGameSounds()
  const prevComboRef = useRef(0)
```

Also add `useRef` to the imports at line 3:

```typescript
import { useState, Suspense, useRef, useEffect } from 'react'
```

**Step 3: Add effect to play sounds on hit (after line 75)**

Add after the useGame3D hook call:

```typescript
  // Play sounds on hit feedback
  useEffect(() => {
    if (gameState.lastHitFeedback) {
      playHit(gameState.lastHitFeedback.type)
    }
  }, [gameState.lastHitFeedback, playHit])

  // Track combo for milestone detection
  useEffect(() => {
    const prevCombo = prevComboRef.current
    prevComboRef.current = gameState.combo

    if (checkMilestone(prevCombo, gameState.combo)) {
      playComboMilestone()
    }
  }, [gameState.combo, checkMilestone, playComboMilestone])
```

**Step 4: Add ComboCelebration component (after line 168, before Overlays comment)**

Add before `{/* Overlays */}`:

```typescript
      {/* Combo celebrations */}
      {gameState.isPlaying && !gameState.isPaused && (
        <ComboCelebration
          combo={gameState.combo}
          theme={theme}
        />
      )}
```

**Step 5: Commit**

```bash
git add frontend/src/components/game-3d/rhythm-game-3d.tsx
git commit -m "feat: integrate game sounds and combo celebrations"
```

---

## Task 8: Manual Testing

**Step 1: Start the dev server**

```bash
cd frontend && npm run dev
```

**Step 2: Test checklist**

Open `http://localhost:3000` and verify:

- [ ] Hit a tile - hear a chime sound
- [ ] Miss a tile - hear a thud sound
- [ ] Perfect hit - see gold "+150" floating up
- [ ] Good hit - see white "+100" floating up
- [ ] Miss - see red "MISS" floating up
- [ ] Score shows multiplier when combo > 10
- [ ] Reach 25 combo - see screen flash, particles, "25x COMBO!" text
- [ ] Reach 50 combo - bigger celebration
- [ ] Reach 100 combo - biggest celebration

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any issues found during testing"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Sound config constants | `lib/sound-config.ts` |
| 2 | Game sounds hook | `hooks/use-game-sounds.ts` |
| 3 | Score popup component | `game-3d/score-popup.tsx` |
| 4 | Score popups manager | `game-3d/score-popups.tsx` |
| 5 | Combo celebration | `game-3d/combo-celebration.tsx` |
| 6 | Integrate popups into scene | `game-3d/scene-3d.tsx` |
| 7 | Integrate sounds and celebrations | `game-3d/rhythm-game-3d.tsx` |
| 8 | Manual testing | - |
