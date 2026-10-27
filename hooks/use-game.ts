'use client'

import { useEffect, useReducer } from 'react'
import { createGame, gameReducer } from '@/lib/game/engine'
import type { Speed } from '@/lib/game/types'

const SPEEDS: Speed[] = [1, 2, 5, 10]
const SAVE_KEY = 'quyosh_stansiyasi_save_v1'

function initMenu() {
  // Brauzer xotirasidan (localStorage) saqlangan o'yinni qidirib ko'ramiz
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(SAVE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Agar saqlangan holat menyu yoki tugagan holat bo'lmasa, uni tiklaymiz
        if (parsed && parsed.status && parsed.status !== 'menu' && parsed.status !== 'over') {
          return parsed
        }
      }
    } catch (e) {
      console.error("Saqlangan o'yinni o'qishda xatolik:", e)
    }
  }
  return { ...createGame('realistik'), status: 'menu' as const }
}

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initMenu)
  const running = state.status === 'running' && !state.paused

  // Har safar o'yin holati (state) o'zgarganda avtomatik saqlash (Auto-save)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (state.status === 'running' || state.status === 'paused') {
        localStorage.setItem(SAVE_KEY, JSON.stringify(state))
      } else if (state.status === 'over' || state.status === 'menu') {
        // Agar o'yin tugasa yoki menyuga qaytsa, saqlangan faylni o'chiramiz
        localStorage.removeItem(SAVE_KEY)
      }
    } catch (e) {
      console.error("O'yinni saqlashda xatolik:", e)
    }
  }, [state])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => dispatch({ type: 'tick' }), 200)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    if (state.status !== 'running') return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (e.code === 'Space') {
        e.preventDefault()
        dispatch({ type: 'togglePause' })
      }
      const idx = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code)
      if (idx >= 0) dispatch({ type: 'setSpeed', speed: SPEEDS[idx] })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.status])

  return { state, dispatch }
}

export type GameDispatch = ReturnType<typeof useGame>['dispatch']