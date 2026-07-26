import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatTime } from '../lib/time'
import { dayKey, formatDuration, splitSessionByDay } from '../lib/history'

/**
 * Tick from a timer owned by the *PiP window*, not the opener.
 *
 * The opener is hidden as soon as the user tabs away, and a hidden page's
 * timers get clamped to roughly 1 Hz — so a ticker owned by the opener would
 * leave the digits stuttering exactly when PiP is being used. The PiP window
 * stays visible, so its timer keeps full rate. An interval is preferred over
 * requestAnimationFrame because rAF is tied to compositing and stops entirely
 * when the window is occluded.
 *
 * Elapsed is recomputed from startTimestamp each tick rather than accumulated,
 * so a delayed or dropped tick shows up as latency, never as drift.
 */
function useLiveElapsed(pipWindow, { running, accumulatedTime, startTimestamp }) {
  const [elapsed, setElapsed] = useState(accumulatedTime)

  useEffect(() => {
    if (!running || startTimestamp === null) {
      setElapsed(accumulatedTime)
      return
    }

    const tick = () => setElapsed(accumulatedTime + (Date.now() - startTimestamp))
    tick()
    const id = pipWindow.setInterval(tick, 30)

    return () => pipWindow.clearInterval(id)
  }, [pipWindow, running, accumulatedTime, startTimestamp])

  return elapsed
}

export default function PiPStopwatch({
  pipWindow,
  name,
  running,
  accumulatedTime,
  startTimestamp,
  todayMs = 0,
  onStartPause,
  onReset,
}) {
  const elapsed = useLiveElapsed(pipWindow, { running, accumulatedTime, startTimestamp })
  const { hh, mm, ss, cc } = formatTime(elapsed)

  const today = dayKey(Date.now())
  const inFlightToday = running && startTimestamp !== null
    ? splitSessionByDay(startTimestamp, Date.now()).find(c => c.date === today)?.ms ?? 0
    : 0
  const liveTodayMs = todayMs + inFlightToday

  return createPortal(
    <div className="h-screen w-screen flex flex-col justify-between gap-2 p-4 bg-gray-950">
      {/* Name + running dot */}
      <div className="flex items-center gap-2 min-w-0">
        {running && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        )}
        <span className="text-gray-400 text-xs font-semibold truncate">{name}</span>
      </div>

      {/* Digits */}
      <div className="flex items-end justify-center gap-0.5 digit-font">
        <span className="text-4xl font-bold text-white tabular-nums">{hh}</span>
        <span className="text-gray-500 text-3xl font-light mx-0.5">:</span>
        <span className="text-4xl font-bold text-white tabular-nums">{mm}</span>
        <span className="text-gray-500 text-3xl font-light mx-0.5">:</span>
        <span className="text-4xl font-bold text-white tabular-nums">{ss}</span>
        <span className="text-gray-500 text-xl font-light mx-0.5">.</span>
        <span className="text-2xl font-bold text-gray-400 tabular-nums">{cc}</span>
      </div>

      {/* Today's total */}
      <div className="flex items-center justify-center gap-1.5 text-[11px]">
        {liveTodayMs > 0 ? (
          <>
            <span className="text-gray-600">Today</span>
            <span className="text-gray-400 font-semibold tabular-nums">{formatDuration(liveTodayMs)}</span>
          </>
        ) : (
          <span className="text-gray-700">Not logged today yet</span>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={onStartPause}
          className={`flex-1 py-2 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
            running
              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
          }`}
        >
          {running ? 'Pause' : (elapsed > 0 ? 'Resume' : 'Start')}
        </button>
        <button
          onClick={onReset}
          className="flex-1 py-2 rounded-xl font-semibold text-sm bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-600/50 transition-all active:scale-95"
        >
          Reset
        </button>
      </div>
    </div>,
    pipWindow.document.body,
  )
}
