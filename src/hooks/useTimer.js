import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Custom hook for a single countdown timer.
 * Uses a targetEndTimestamp so the remaining time stays accurate after reload.
 *
 * Persisted shape (stored in the parent via localStorage):
 *   { id, name, totalMs, targetEndTimestamp, remainingMs, running, finished }
 *
 * totalMs            – original duration in ms (for reset)
 * targetEndTimestamp – Date.now() + remainingMs at the moment it was last started
 * remainingMs        – ms left when last paused (null while running – derive from timestamp)
 * running            – boolean
 * finished           – boolean
 */
export function useTimer(initialState, onFinish) {
  const [totalMs] = useState(initialState.totalMs ?? 0)
  const [targetEndTimestamp, setTargetEndTimestamp] = useState(initialState.targetEndTimestamp ?? null)
  const [remainingMs, setRemainingMs] = useState(
    initialState.remainingMs !== null && initialState.remainingMs !== undefined
      ? initialState.remainingMs
      : initialState.totalMs ?? 0
  )
  const [running, setRunning] = useState(initialState.running ?? false)
  const [finished, setFinished] = useState(initialState.finished ?? false)
  const [display, setDisplay] = useState(0)

  const intervalRef = useRef(null)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  // Recompute display every ~30 ms while running
  useEffect(() => {
    if (running && targetEndTimestamp !== null) {
      const tick = () => {
        const left = targetEndTimestamp - Date.now()
        if (left <= 0) {
          clearInterval(intervalRef.current)
          setDisplay(0)
          setRemainingMs(0)
          setTargetEndTimestamp(null)
          setRunning(false)
          setFinished(true)
          onFinishRef.current?.()
        } else {
          setDisplay(left)
        }
      }
      tick() // immediate first tick to avoid 30 ms blank
      intervalRef.current = setInterval(tick, 30)
    } else {
      setDisplay(remainingMs)
    }

    return () => clearInterval(intervalRef.current)
  }, [running, targetEndTimestamp]) // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(() => {
    if (finished || remainingMs <= 0) return
    const end = Date.now() + remainingMs
    setTargetEndTimestamp(end)
    setRunning(true)
    setFinished(false)
  }, [finished, remainingMs])

  const pause = useCallback(() => {
    if (targetEndTimestamp !== null) {
      const left = Math.max(0, targetEndTimestamp - Date.now())
      setRemainingMs(left)
    }
    setTargetEndTimestamp(null)
    setRunning(false)
  }, [targetEndTimestamp])

  const reset = useCallback(() => {
    clearInterval(intervalRef.current)
    setTargetEndTimestamp(null)
    setRemainingMs(totalMs)
    setRunning(false)
    setFinished(false)
    setDisplay(totalMs)
  }, [totalMs])

  return {
    display,
    running,
    finished,
    remainingMs,
    targetEndTimestamp,
    totalMs,
    start,
    pause,
    reset,
  }
}
