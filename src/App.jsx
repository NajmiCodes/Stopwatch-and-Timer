import { useState, useEffect, useCallback } from 'react'
import Stopwatch from './components/Stopwatch'
import Timer from './components/Timer'

// ─── localStorage helpers ────────────────────────────────────────────────────

const LS_STOPWATCHES = 'sw_stopwatches_v1'
const LS_TIMERS = 'sw_timers_v1'
const LS_TAB = 'sw_active_tab_v1'

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* storage full – silently ignore */ }
}

// ─── Default factories ────────────────────────────────────────────────────────

function newStopwatch(id) {
  return {
    id,
    name: `Stopwatch ${id}`,
    accumulatedTime: 0,
    startTimestamp: null,
    running: false,
  }
}

function newTimer(id) {
  return {
    id,
    name: `Timer ${id}`,
    totalMs: 5 * 60 * 1000, // 5 minutes default
    targetEndTimestamp: null,
    remainingMs: 5 * 60 * 1000,
    running: false,
    finished: false,
  }
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState(() => loadFromStorage(LS_TAB, 'stopwatches'))
  const [stopwatches, setStopwatches] = useState(() => loadFromStorage(LS_STOPWATCHES, []))
  const [timers, setTimers] = useState(() => loadFromStorage(LS_TIMERS, []))

  // Unique ID counter – derive from existing data to avoid collisions after reload
  const [swCounter, setSwCounter] = useState(() => {
    const existing = loadFromStorage(LS_STOPWATCHES, [])
    return existing.length > 0 ? Math.max(...existing.map(s => s.id)) + 1 : 1
  })
  const [timerCounter, setTimerCounter] = useState(() => {
    const existing = loadFromStorage(LS_TIMERS, [])
    return existing.length > 0 ? Math.max(...existing.map(t => t.id)) + 1 : 1
  })

  // Persist whenever state changes
  useEffect(() => { saveToStorage(LS_STOPWATCHES, stopwatches) }, [stopwatches])
  useEffect(() => { saveToStorage(LS_TIMERS, timers) }, [timers])
  useEffect(() => { saveToStorage(LS_TAB, tab) }, [tab])

  // ── Stopwatch CRUD ──────────────────────────────────────────────────────────

  const addStopwatch = () => {
    setStopwatches(prev => [...prev, newStopwatch(swCounter)])
    setSwCounter(c => c + 1)
  }

  const updateStopwatch = useCallback((updated) => {
    setStopwatches(prev => prev.map(sw => sw.id === updated.id ? updated : sw))
  }, [])

  const deleteStopwatch = useCallback((id) => {
    setStopwatches(prev => prev.filter(sw => sw.id !== id))
  }, [])

  // ── Timer CRUD ──────────────────────────────────────────────────────────────

  const addTimer = () => {
    setTimers(prev => [...prev, newTimer(timerCounter)])
    setTimerCounter(c => c + 1)
  }

  const updateTimer = useCallback((updated) => {
    setTimers(prev => prev.map(t => t.id === updated.id ? updated : t))
  }, [])

  const deleteTimer = useCallback((id) => {
    setTimers(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────

  const swCount = stopwatches.length
  const timerCount = timers.length

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Stopwatch & Timer</h1>
          </div>

          {/* Add buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => { setTab('stopwatches'); addStopwatch() }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30 text-sm font-semibold transition-all active:scale-95"
            >
              <span className="text-lg leading-none">+</span>
              <span className="hidden sm:inline">Stopwatch</span>
            </button>
            <button
              onClick={() => { setTab('timers'); addTimer() }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border border-violet-500/30 text-sm font-semibold transition-all active:scale-95"
            >
              <span className="text-lg leading-none">+</span>
              <span className="hidden sm:inline">Timer</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 pb-0">
          <TabButton
            active={tab === 'stopwatches'}
            onClick={() => setTab('stopwatches')}
            color="indigo"
            count={swCount}
          >
            Stopwatches
          </TabButton>
          <TabButton
            active={tab === 'timers'}
            onClick={() => setTab('timers')}
            color="violet"
            count={timerCount}
          >
            Timers
          </TabButton>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'stopwatches' && (
          <>
            {stopwatches.length === 0 ? (
              <EmptyState
                icon="⏱"
                title="No stopwatches yet"
                subtitle='Click "+ Stopwatch" to add your first one'
                onAdd={addStopwatch}
                buttonLabel="+ Add Stopwatch"
                color="indigo"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stopwatches.map(sw => (
                  <Stopwatch
                    key={sw.id}
                    data={sw}
                    onUpdate={updateStopwatch}
                    onDelete={() => deleteStopwatch(sw.id)}
                  />
                ))}
                <AddCard onClick={addStopwatch} label="+ Add Stopwatch" color="indigo" />
              </div>
            )}
          </>
        )}

        {tab === 'timers' && (
          <>
            {timers.length === 0 ? (
              <EmptyState
                icon="⏳"
                title="No timers yet"
                subtitle='Click "+ Timer" to add your first one'
                onAdd={addTimer}
                buttonLabel="+ Add Timer"
                color="violet"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {timers.map(t => (
                  <Timer
                    key={t.id}
                    data={t}
                    onUpdate={updateTimer}
                    onDelete={() => deleteTimer(t.id)}
                  />
                ))}
                <AddCard onClick={addTimer} label="+ Add Timer" color="violet" />
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-gray-700 text-xs py-8">
        Data is saved automatically · Survives page refresh & browser close
      </footer>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabButton({ active, onClick, children, color, count }) {
  const colors = {
    indigo: active
      ? 'text-indigo-400 border-b-2 border-indigo-500'
      : 'text-gray-500 hover:text-gray-300 border-b-2 border-transparent',
    violet: active
      ? 'text-violet-400 border-b-2 border-violet-500'
      : 'text-gray-500 hover:text-gray-300 border-b-2 border-transparent',
  }

  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-semibold transition-colors flex items-center gap-2 ${colors[color]}`}
    >
      {children}
      {count > 0 && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
          active
            ? color === 'indigo' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-violet-500/20 text-violet-400'
            : 'bg-gray-800 text-gray-500'
        }`}>
          {count}
        </span>
      )}
    </button>
  )
}

function EmptyState({ icon, title, subtitle, onAdd, buttonLabel, color }) {
  const btnClass = color === 'indigo'
    ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30'
    : 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border border-violet-500/30'

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <span className="text-6xl">{icon}</span>
      <div>
        <p className="text-gray-300 font-semibold text-lg">{title}</p>
        <p className="text-gray-600 text-sm mt-1">{subtitle}</p>
      </div>
      <button
        onClick={onAdd}
        className={`mt-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${btnClass}`}
      >
        {buttonLabel}
      </button>
    </div>
  )
}

function AddCard({ onClick, label, color }) {
  const border = color === 'indigo'
    ? 'border-indigo-800/40 hover:border-indigo-600/60 text-indigo-600 hover:text-indigo-400'
    : 'border-violet-800/40 hover:border-violet-600/60 text-violet-600 hover:text-violet-400'

  return (
    <button
      onClick={onClick}
      className={`border-2 border-dashed rounded-2xl p-5 flex items-center justify-center text-sm font-semibold transition-all hover:bg-white/5 active:scale-95 min-h-[180px] ${border}`}
    >
      {label}
    </button>
  )
}
