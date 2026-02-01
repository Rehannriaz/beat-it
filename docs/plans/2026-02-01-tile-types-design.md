# Tile Types: Normal, Hold, and Rapid

## Overview

Enable all three tile types (normal, hold, rapid) with distinct visuals and mechanics.

## Data Structure

```typescript
export interface Tile3D {
  id: string
  lane: number
  z: number
  hit: boolean
  missed: boolean
  type: 'normal' | 'hold' | 'rapid'
  beatStrength: number
  targetTime: number
  // Hold tile properties
  holdDuration?: number
  holdProgress?: number      // 0-1, how much held so far
  isHolding?: boolean        // Currently being held
  // Rapid tile properties
  rapidCount?: number
  rapidHitsRemaining?: number
}
```

## Visual Design

### Normal Tile
- Current box design with glow top layer
- Single tap to hit

### Hold Tile
- Same box as head
- Extended tail trailing behind (-Z direction)
- Tail length = `holdDuration * speed`
- Tail uses same color, slightly transparent

### Rapid Tile
- Same box shape
- 2-4 small circular dots on top surface
- Pulses more intensely
- Dots disappear one by one as tapped

## Game Mechanics

### Hold Tiles
- Press key when head reaches hit zone
- Keep holding until tail passes through
- Release early = miss
- Score based on hold completion

### Rapid Tiles
- Tile slows to 20% speed at hit zone
- Tap repeatedly to decrement `rapidHitsRemaining`
- All taps completed = hit, tile exits
- Incomplete = partial score or miss

## Scoring
- Normal: 100-150 points (current)
- Hold: Base points + bonus per 0.5s held
- Rapid: Points per tap, bonus for completing all
