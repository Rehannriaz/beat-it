export type Theme = 'vaporwave' | 'retro' | 'cyberpunk' | 'minimal'

export interface Tile {
  id: string
  lane: number
  y: number
  hit: boolean
  missed: boolean
}

export interface GameState {
  tiles: Tile[]
  score: number
  combo: number
  maxCombo: number
  isPlaying: boolean
  isPaused: boolean
  gameOver: boolean
  speed: number
}

export const LANE_KEYS = ['D', 'F', 'J', 'K']
export const LANE_COUNT = 4
export const TILE_HEIGHT = 100
export const HIT_ZONE_Y = 85 // percentage from top
export const HIT_TOLERANCE = 12 // percentage tolerance for hitting

export const themeStyles: Record<Theme, {
  background: string
  laneColors: string[]
  tileColors: string[]
  hitZoneColor: string
  textColor: string
  glowColor: string
  name: string
  font: string
}> = {
  vaporwave: {
    background: 'linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    laneColors: ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff'],
    tileColors: ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff'],
    hitZoneColor: 'rgba(255, 113, 206, 0.3)',
    textColor: '#ff71ce',
    glowColor: '#ff71ce',
    name: 'V A P O R W A V E',
    font: 'font-mono tracking-[0.3em]'
  },
  retro: {
    background: 'linear-gradient(180deg, #1a0a0a 0%, #2d1810 50%, #1a0505 100%)',
    laneColors: ['#ff6b35', '#f7c59f', '#efefd0', '#004e89'],
    tileColors: ['#ff6b35', '#f7c59f', '#efefd0', '#004e89'],
    hitZoneColor: 'rgba(255, 107, 53, 0.3)',
    textColor: '#f7c59f',
    glowColor: '#ff6b35',
    name: 'RETRO ARCADE',
    font: 'font-mono uppercase tracking-wider'
  },
  cyberpunk: {
    background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
    laneColors: ['#00f5ff', '#ff00ff', '#ffff00', '#00ff00'],
    tileColors: ['#00f5ff', '#ff00ff', '#ffff00', '#00ff00'],
    hitZoneColor: 'rgba(0, 245, 255, 0.3)',
    textColor: '#00f5ff',
    glowColor: '#00f5ff',
    name: 'CYBER//PUNK',
    font: 'font-mono uppercase tracking-tight'
  },
  minimal: {
    background: 'linear-gradient(180deg, #0d0d0d 0%, #1a1a1a 50%, #0d0d0d 100%)',
    laneColors: ['#ffffff', '#cccccc', '#999999', '#666666'],
    tileColors: ['#ffffff', '#e0e0e0', '#c0c0c0', '#a0a0a0'],
    hitZoneColor: 'rgba(255, 255, 255, 0.15)',
    textColor: '#ffffff',
    glowColor: '#ffffff',
    name: 'MINIMAL',
    font: 'font-sans tracking-wide'
  }
}
