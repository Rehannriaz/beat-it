'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, Music, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUploadSong } from '@/hooks/useSongs'
import type { Theme } from '@/lib/game-types'
import type { Song } from '@/types/api'
import { themeStyles } from '@/lib/game-types'

interface StepUploadProps {
  theme: Theme
  onComplete: (song: Song) => void
}

export function StepUpload({ theme, onComplete }: StepUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadSong()
  const styles = themeStyles[theme]

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      const song = await uploadMutation.mutateAsync({
        file,
        title: title || file.name.replace(/\.[^/.]+$/, ''),
        artist: artist || undefined,
      })
      onComplete(song)
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/mp3"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 hover:border-opacity-100"
        style={{
          borderColor: file ? styles.glowColor : 'rgba(255,255,255,0.2)',
          background: file ? `${styles.glowColor}10` : 'transparent',
        }}
      >
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <Music className="w-8 h-8" style={{ color: styles.glowColor }} />
            <div className="text-left">
              <p className="font-medium" style={{ color: styles.textColor }}>
                {file.name}
              </p>
              <p className="text-sm opacity-60" style={{ color: styles.textColor }}>
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 mx-auto mb-3 opacity-40" style={{ color: styles.textColor }} />
            <p className="font-medium" style={{ color: styles.textColor }}>
              Click to select MP3 file
            </p>
            <p className="text-sm opacity-60" style={{ color: styles.textColor }}>
              Maximum 50MB
            </p>
          </>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="title" style={{ color: styles.textColor }}>
            Song Title
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter song title"
            className="mt-1 bg-white/5 border-white/10"
            style={{ color: styles.textColor }}
          />
        </div>

        <div>
          <Label htmlFor="artist" style={{ color: styles.textColor }}>
            Artist (optional)
          </Label>
          <Input
            id="artist"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Enter artist name"
            className="mt-1 bg-white/5 border-white/10"
            style={{ color: styles.textColor }}
          />
        </div>
      </div>

      {uploadMutation.isError && (
        <p className="text-red-400 text-sm">
          Upload failed. Please try again.
        </p>
      )}

      <Button
        onClick={handleUpload}
        disabled={!file || uploadMutation.isPending}
        className="w-full"
        style={{
          background: styles.glowColor,
          color: '#000',
        }}
      >
        {uploadMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Upload Song
          </>
        )}
      </Button>
    </motion.div>
  )
}
