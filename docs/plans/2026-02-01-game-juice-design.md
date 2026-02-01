# Game Juice Design

## Overview

Add satisfying feedback to make the game feel more responsive and rewarding. Three areas of focus:

1. **Audio feedback** - Subtle synth sounds for hits, misses, and milestones
2. **Combo celebrations** - Screen takeover effects at combo milestones
3. **Score pop-ups** - Floating numbers showing points earned per hit

## Audio Feedback

### Sound Philosophy

Subtle synthesized tones that complement rather than compete with Spotify music. All sounds are short (<100ms), low in the mix, and filtered to avoid frequency clashes.

### Sound Types

| Event | Sound | Character |
|-------|-------|-----------|
| Perfect hit | Soft high chime | Clean sine wave, ~800Hz, quick decay |
| Good hit | Softer mid tone | Slightly lower pitch ~600Hz, same decay |
| Miss | Low thud | Muted, ~200Hz, suggests "dropped" |
| Combo milestone | Ascending arpeggio | 3-note synth sweep, louder than hits |

### Implementation

Use Web Audio API to synthesize sounds at runtime - no audio files needed. Create a `useGameSounds` hook that exposes `playHit()`, `playMiss()`, and `playComboMilestone()` functions.

Volume will be ~20% of the music by default.

### Files

- `src/hooks/use-game-sounds.ts` - Web Audio synthesis and playback
- `src/lib/sound-config.ts` - Frequency/duration constants per theme

## Combo Celebrations

### Milestone Thresholds

Celebrations trigger at 25x, 50x, 100x, and every 100 after.

| Milestone | Effect Duration | Intensity |
|-----------|-----------------|-----------|
| 25x | 0.4s | Small flash, few particles |
| 50x | 0.5s | Medium flash, more particles |
| 100x+ | 0.6s | Full flash, particle explosion |

### Visual Components

1. **Screen flash** - Brief white overlay (opacity 0.3 → 0 over 200ms)
2. **Particle burst** - 20-40 particles explode from center, theme-colored
3. **Combo text zoom** - "50x COMBO!" scales from 2x → 1x → fades out
4. **Sound sting** - Ascending arpeggio plays

### Files

- `src/components/game-3d/combo-celebration.tsx` - Overlay with flash, particles, text

## Score Pop-ups

### Behavior

When a tile is hit, a floating score number appears at the hit location and rises while fading.

| Hit Type | Text | Color | Size |
|----------|------|-------|------|
| Perfect | "+150" | Gold (#FFD700) | Large |
| Good | "+100" | White | Medium |
| Miss | "MISS" | Red (#FF4444) | Medium, shakes |

### Animation Sequence

1. **Spawn** - Text appears at tile's lane position, at hit zone Z
2. **Rise** - Floats upward ~2 units over 600ms
3. **Fade** - Opacity 1 → 0 during rise
4. **Scale** - Starts at 1.2x, settles to 1x (pop-in effect)

### Multiplier Display

When combo > 10, show multiplier: "+150 x2"

### Files

- `src/components/game-3d/score-popup.tsx` - Individual floating score text
- `src/components/game-3d/score-popups.tsx` - Manager for active pop-ups

## File Summary

### New Files

```
frontend/src/
├── hooks/
│   └── use-game-sounds.ts
├── lib/
│   └── sound-config.ts
└── components/game-3d/
    ├── combo-celebration.tsx
    ├── score-popup.tsx
    └── score-popups.tsx
```

### Modified Files

- `rhythm-game-3d.tsx` - Add combo celebration overlay
- `scene-3d.tsx` - Add score popups to 3D scene
- `use-game-3d.ts` - Expose hit events for sounds/popups

## Dependencies

None new - uses existing Three.js, Web Audio API, @react-three/drei Text
