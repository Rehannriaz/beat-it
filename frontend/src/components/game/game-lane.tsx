'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { Tile, Theme } from '@/lib/game-types'
import { themeStyles, LANE_KEYS, HIT_ZONE_Y } from '@/lib/game-types'

interface GameLaneProps {
  laneIndex: number
  tiles: Tile[]
  theme: Theme
  onHit: (lane: number) => void
  isPressed: boolean
}

export function GameLane({ laneIndex, tiles, theme, onHit, isPressed }: GameLaneProps) {
  const styles = themeStyles[theme]
  const laneColor = styles.laneColors[laneIndex]
  const tileColor = styles.tileColors[laneIndex]

  return (
    <div 
      className="relative flex-1 h-full border-x border-white/10 overflow-hidden"
      style={{
        background: `linear-gradient(180deg, transparent 0%, ${laneColor}08 100%)`
      }}
    >
      {/* Lane guide line */}
      <div 
        className="absolute inset-x-0 h-full opacity-20"
        style={{
          background: `linear-gradient(180deg, transparent 0%, ${laneColor}40 50%, transparent 100%)`
        }}
      />

      {/* Hit zone */}
      <div 
        className="absolute inset-x-0 h-[15%] transition-all duration-100"
        style={{
          top: `${HIT_ZONE_Y - 7.5}%`,
          background: isPressed 
            ? `${laneColor}60` 
            : styles.hitZoneColor,
          boxShadow: isPressed 
            ? `0 0 30px ${laneColor}, inset 0 0 20px ${laneColor}80`
            : 'none'
        }}
      >
        <div 
          className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2"
          style={{ background: laneColor, boxShadow: `0 0 10px ${laneColor}` }}
        />
      </div>

      {/* Key indicator */}
      <div 
        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg transition-all duration-100"
        style={{
          background: isPressed ? laneColor : 'rgba(255,255,255,0.1)',
          color: isPressed ? '#000' : laneColor,
          boxShadow: isPressed ? `0 0 20px ${laneColor}` : 'none',
          transform: `translateX(-50%) ${isPressed ? 'scale(0.95)' : 'scale(1)'}`
        }}
      >
        {LANE_KEYS[laneIndex]}
      </div>

      {/* Tiles */}
      <AnimatePresence>
        {tiles.map(tile => (
          <motion.div
            key={tile.id}
            className="absolute left-1 right-1 rounded-md"
            initial={{ opacity: 1 }}
            animate={{ 
              opacity: tile.hit ? 0 : 1,
              scale: tile.hit ? 1.2 : 1
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: tile.hit ? 0.15 : 0.3 }}
            style={{
              top: `${tile.y}%`,
              height: '12%',
              background: tile.missed 
                ? 'rgba(255, 50, 50, 0.6)' 
                : tileColor,
              boxShadow: tile.hit 
                ? `0 0 30px ${tileColor}, 0 0 60px ${tileColor}`
                : `0 0 15px ${tileColor}80`
            }}
          >
            {tile.hit && (
              <motion.div
                className="absolute inset-0 rounded-md"
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ background: tileColor }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Click handler for mobile */}
      <button
        type="button"
        className="absolute inset-0 cursor-pointer focus:outline-none"
        onClick={() => onHit(laneIndex)}
        aria-label={`Hit lane ${laneIndex + 1}`}
      />
    </div>
  )
}
