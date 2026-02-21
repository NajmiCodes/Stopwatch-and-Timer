import { useState } from 'react'
import { useStopwatch } from '../hooks/useStopwatch'

/** Format ms → HH:MM:SS.mm */
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const centis = Math.floor((ms % 1000) / 10)

  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  const cc = String(centis).padStart(2, '0')

  return { hh, mm, ss, cc }
}

export default function Stopwatch({ data, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState(data.name)

  const sw = useStopwatch({
    accumulatedTime: data.accumulatedTime,
    startTimestamp: data.startTimestamp,
    running: data.running,
  })

  // Sync state up to parent for persistence whenever it changes
  const syncUp = (patch) => {
    onUpdate({ ...data, ...patch })
  }

  const handleStartPause = () => {
    if (sw.running) {
      sw.pause()
      syncUp({
        running: false,
        accumulatedTime: sw.accumulatedTime + (Date.now() - sw.startTimestamp),
        startTimestamp: null,
      })
    } else {
      const now = Date.now()
      sw.start()
      syncUp({
        running: true,
        startTimestamp: now,
        accumulatedTime: sw.accumulatedTime,
      })
    }
  }

  const handleReset = () => {
    sw.reset()
    syncUp({ running: false, accumulatedTime: 0, startTimestamp: null })
  }

  const handleRename = () => {
    if (nameInput.trim()) {
      syncUp({ name: nameInput.trim() })
    }
    setEditing(false)
  }

  const { hh, mm, ss, cc } = formatTime(sw.display)

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 flex flex-col gap-4 shadow-lg hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        {editing ? (
          <input
            autoFocus
            className="bg-gray-900 border border-indigo-500 rounded-lg px-3 py-1 text-white text-sm flex-1 outline-none focus:ring-2 focus:ring-indigo-500"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => { if (e.key === 'Enter') handleRename() }}
            maxLength={30}
          />
        ) : (
          <button
            onClick={() => { setNameInput(data.name); setEditing(true) }}
            className="text-gray-300 font-semibold text-sm hover:text-white truncate max-w-[180px] text-left"
            title="Click to rename"
          >
            {data.name}
          </button>
        )}

        <div className="flex items-center gap-1">
          {sw.running && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Running" />
          )}
          <button
            onClick={onDelete}
            className="text-gray-600 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-400/10"
            title="Delete stopwatch"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Time Display */}
      <div className="flex items-end justify-center gap-0.5 digit-font select-none">
        <TimeBlock value={hh} label="HH" />
        <Colon />
        <TimeBlock value={mm} label="MM" />
        <Colon />
        <TimeBlock value={ss} label="SS" />
        <span className="text-gray-500 text-2xl font-light mb-1 mx-0.5">.</span>
        <TimeBlock value={cc} label="MS" small />
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={handleStartPause}
          className={`flex-1 py-2 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
            sw.running
              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
          }`}
        >
          {sw.running ? 'Pause' : (sw.display > 0 ? 'Resume' : 'Start')}
        </button>
        <button
          onClick={handleReset}
          className="flex-1 py-2 rounded-xl font-semibold text-sm bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-600/50 transition-all active:scale-95"
        >
          Reset
        </button>
      </div>
    </div>
  )
}

function TimeBlock({ value, label, small }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`font-bold tabular-nums ${small ? 'text-2xl text-gray-400' : 'text-4xl text-white'}`}>
        {value}
      </span>
      <span className="text-gray-600 text-[9px] uppercase tracking-widest mt-0.5">{label}</span>
    </div>
  )
}

function Colon() {
  return <span className="text-gray-500 text-4xl font-light pb-4 mx-0.5 select-none">:</span>
}
