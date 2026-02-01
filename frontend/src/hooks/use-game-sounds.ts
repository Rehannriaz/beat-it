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
