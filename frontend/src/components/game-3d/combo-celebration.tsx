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
