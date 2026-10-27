'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export function useAudio(gameStatus: string, weather: string, hasDamage: boolean) {
  const [isMuted, setIsMuted] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const ambientGainRef = useRef<GainNode | null>(null)
  const stormGainRef = useRef<GainNode | null>(null)
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Web Audio Context-ni ishga tushirish
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioContextClass()
      audioCtxRef.current = ctx

      // 1. Relax Fon Musiqasi (Ambient Synth Pad)
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const ambientGain = ctx.createGain()

      osc1.type = 'sine'
      osc2.type = 'triangle'

      // Tinch va yoqimli akkord chastotalari (C major pad)
      osc1.frequency.setValueAtTime(130.81, ctx.currentTime) // C3
      osc2.frequency.setValueAtTime(196.00, ctx.currentTime) // G3

      ambientGain.gain.setValueAtTime(isMuted ? 0 : 0.05, ctx.currentTime) // Juda past, xalaqit bermaydigan ovoz

      osc1.connect(ambientGain)
      osc2.connect(ambientGain)
      ambientGain.connect(ctx.destination)

      osc1.start()
      osc2.start()
      ambientGainRef.current = ambientGain

      // 2. Bo'ron ovozi uchun oq shovqin (White Noise Buffer)
      const bufferSize = ctx.sampleRate * 2
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1
      }

      const whiteNoise = ctx.createBufferSource()
      whiteNoise.buffer = noiseBuffer
      whiteNoise.loop = true

      // Filter yordamida shamol tovushiga o'xshatish
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(300, ctx.currentTime)

      const stormGain = ctx.createGain()
      stormGain.gain.setValueAtTime(0, ctx.currentTime) // Boshida eshitilmaydi

      whiteNoise.connect(filter)
      filter.connect(stormGain)
      stormGain.connect(ctx.destination)

      whiteNoise.start()
      stormGainRef.current = stormGain
    } else if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume()
    }
  }, [isMuted])

  // O'yin statusi o'zgarganda yoki foydalanuvchi bosganda audioni yoqish
  useEffect(() => {
    if (gameStatus === 'running') {
      initAudio()
    }
  }, [gameStatus, initAudio])

  // Ob-havo bo'ron bo'lganda shamol ovozini balandlatish
  useEffect(() => {
    if (!stormGainRef.current || !audioCtxRef.current) return
    const ctx = audioCtxRef.current
    if (weather === 'boron' || weather === 'storm') {
      stormGainRef.current.gain.setTargetAtTime(isMuted ? 0 : 0.15, ctx.currentTime, 1)
    } else {
      stormGainRef.current.gain.setTargetAtTime(0, ctx.currentTime, 1)
    }
  }, [weather, isMuted])

  // Generator shikastlanganda (Damage) ogohlantiruvchi signal berish
  useEffect(() => {
    if (hasDamage && !isMuted && audioCtxRef.current) {
      const ctx = audioCtxRef.current
      const playBeep = () => {
        if (ctx.state === 'suspended') return
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(440, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.2)
        
        gain.gain.setValueAtTime(0.05, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.2)
      }

      playBeep()
      alarmIntervalRef.current = setInterval(playBeep, 2000) // Har 2 sekundda signal
    } else {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current)
        alarmIntervalRef.current = null
      }
    }

    return () => {
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current)
    }
  }, [hasDamage, isMuted])

  // Mute / Unmute funksiyasi
  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev
      if (ambientGainRef.current && audioCtxRef.current) {
        ambientGainRef.current.gain.setValueAtTime(next ? 0 : 0.05, audioCtxRef.current.currentTime)
      }
      return next
    })
  }

  return { isMuted, toggleMute, initAudio }
}