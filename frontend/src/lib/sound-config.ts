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
