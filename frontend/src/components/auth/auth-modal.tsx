'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Loader2, CheckCircle } from 'lucide-react'
import { useAuth } from '@/hooks'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  textColor: string
  glowColor: string
}

type Step = 'email' | 'otp' | 'success'

export function AuthModal({ isOpen, onClose, onSuccess, textColor, glowColor }: AuthModalProps) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signInWithOtp, verifyOtp } = useAuth()

  const handleSendCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email')
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await signInWithOtp(email)

    if (error) {
      setError(error.message)
    } else {
      setStep('otp')
    }

    setLoading(false)
  }

  const handleVerifyCode = async () => {
    if (!otp.trim() || otp.length < 6) {
      setError('Please enter the 6-digit code')
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await verifyOtp(email, otp)

    if (error) {
      setError(error.message)
    } else {
      setStep('success')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1000)
    }

    setLoading(false)
  }

  const handleClose = () => {
    setStep('email')
    setEmail('')
    setOtp('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-sm rounded-2xl p-6"
        style={{
          background: 'rgba(20,20,30,0.95)',
          border: `1px solid ${glowColor}40`,
          boxShadow: `0 0 40px ${glowColor}20`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: textColor }}
        >
          <X className="w-5 h-5" />
        </button>

        <AnimatePresence mode="wait">
          {step === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-6 h-6" style={{ color: glowColor }} />
                <h3 className="text-lg font-bold" style={{ color: textColor }}>
                  Sign in with Email
                </h3>
              </div>

              <p className="text-sm opacity-60 mb-4" style={{ color: textColor }}>
                We'll send you a code to verify your email
              </p>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
                         focus:border-opacity-50 focus:outline-none transition-colors mb-4"
                style={{
                  color: textColor,
                  borderColor: error ? '#ef4444' : `${textColor}20`,
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
              />

              {error && (
                <p className="text-sm text-red-400 mb-4">{error}</p>
              )}

              <button
                onClick={handleSendCode}
                disabled={loading}
                className="w-full py-3 rounded-lg font-medium transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: glowColor,
                  color: '#000',
                }}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Send Code'
                )}
              </button>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <h3 className="text-lg font-bold mb-2" style={{ color: textColor }}>
                Enter Code
              </h3>

              <p className="text-sm opacity-60 mb-4" style={{ color: textColor }}>
                We sent a code to {email}
              </p>

              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
                         focus:border-opacity-50 focus:outline-none transition-colors mb-4
                         text-center text-2xl tracking-widest font-mono"
                style={{
                  color: textColor,
                  borderColor: error ? '#ef4444' : `${textColor}20`,
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
              />

              {error && (
                <p className="text-sm text-red-400 mb-4">{error}</p>
              )}

              <button
                onClick={handleVerifyCode}
                disabled={loading}
                className="w-full py-3 rounded-lg font-medium transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: glowColor,
                  color: '#000',
                }}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Verify'
                )}
              </button>

              <button
                onClick={() => setStep('email')}
                className="w-full mt-3 text-sm opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: textColor }}
              >
                Use a different email
              </button>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#22c55e' }} />
              <h3 className="text-lg font-bold" style={{ color: textColor }}>
                Signed in!
              </h3>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
