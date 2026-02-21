import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Custom hook for a single stopwatch instance.
 * Uses real timestamps so elapsed time is accurate after page reload.
 *
 * Persisted shape (stored in the parent via localStorage):
 *   { id, name, accumulatedTime, startTimestamp, running }
 *
 * accumulatedTime  – ms counted before the most recent start
 * startTimestamp   – Date.now() value when last started (null when paused)
 * running          – boolean
 */
export function useStopwatch(initialState) {
  const [accumulatedTime, setAccumulatedTime] = useState(initialState.accumulatedTime ?? 0)
  const [startTimestamp, setStartTimestamp] = useState(initialState.startTimestamp ?? null)
  const [running, setRunning] = useState(initialState.running ?? false)
  const [display, setDisplay] = useState(0)

  const intervalRef = useRef(null)

  // Recompute display every ~30 ms while running
  useEffect(() => {
    if (running && startTimestamp !== null) {
      intervalRef.current = setInterval(() => {
        setDisplay(accumulatedTime + (Date.now() - startTimestamp))
      }, 30)
    } else {
      setDisplay(accumulatedTime)
    }

    return () => clearInterval(intervalRef.current)
  }, [running, startTimestamp, accumulatedTime])

  const start = useCallback(() => {
    const now = Date.now()
    setStartTimestamp(now)
    setRunning(true)
  }, [])

  const pause = useCallback(() => {
    if (startTimestamp !== null) {
      setAccumulatedTime(prev => prev + (Date.now() - startTimestamp))
    }
    setStartTimestamp(null)
    setRunning(false)
  }, [startTimestamp])

  const reset = useCallback(() => {
    clearInterval(intervalRef.current)
    setAccumulatedTime(0)
    setStartTimestamp(null)
    setRunning(false)
    setDisplay(0)
  }, [])

  return {
    display,
    running,
    accumulatedTime,
    startTimestamp,
    start,
    pause,
    reset,
  }
}
