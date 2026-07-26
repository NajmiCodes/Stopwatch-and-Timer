import { useState } from 'react'
import { useStopwatch } from '../hooks/useStopwatch'
import { useDocumentPiP } from '../hooks/useDocumentPiP'
import PiPStopwatch from './PiPStopwatch'
import { formatTime } from '../lib/time'
import { formatDuration, splitSessionByDay, dayKey } from '../lib/history'

export default function Stopwatch({ data, todayMs = 0, onUpdate, onDelete, onLogSession }) {
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState(data.name)

  const sw = useStopwatch({
    accumulatedTime: data.accumulatedTime,
    startTimestamp: data.startTimestamp,
    running: data.running,
  })

  const pip = useDocumentPiP()

  // Sync state up to parent for persistence whenever it changes
  const syncUp = (patch) => {
    onUpdate({ ...data, ...patch })
  }

  /** Close out the in-flight run and write it to history. */
  const logCurrentRun = () => {
    if (sw.running && sw.startTimestamp !== null) {
      onLogSession(sw.startTimestamp, Date.now())
    }
  }

  const handleStartPause = () => {
    if (sw.running) {
      logCurrentRun()
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
    logCurrentRun()
    sw.reset()
    syncUp({ running: false, accumulatedTime: 0, startTimestamp: null })
  }

  const handleDelete = () => {
    logCurrentRun()
    onDelete()
  }

  const handleRename = () => {
    if (nameInput.trim()) {
      syncUp({ name: nameInput.trim() })
    }
    setEditing(false)
  }

  const { hh, mm, ss, cc } = formatTime(sw.display)

  // Today's total for this task: what history already holds, plus the part of
  // the in-flight run that falls on today's date.
  const today = dayKey(Date.now())
  const inFlightToday = sw.running && sw.startTimestamp !== null
    ? splitSessionByDay(sw.startTimestamp, Date.now()).find(c => c.date === today)?.ms ?? 0
    : 0
  const liveTodayMs = todayMs + inFlightToday

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
          {pip.supported && (
            <button
              onClick={pip.pipWindow ? pip.close : pip.open}
              className={`transition-colors p-1 rounded-lg ${
                pip.pipWindow
                  ? 'text-indigo-400 bg-indigo-400/10 hover:bg-indigo-400/20'
                  : 'text-gray-600 hover:text-indigo-400 hover:bg-indigo-400/10'
              }`}
              title={pip.pipWindow ? 'Close floating window' : 'Pop out into a floating window'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5"/>
                <rect x="12" y="12" width="10" height="8" rx="1.5"/>
              </svg>
            </button>
          )}
          <button
            onClick={handleDelete}
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

      {/* Today's logged total */}
      {liveTodayMs > 0 && (
        <div className="flex items-center justify-center gap-1.5 -mt-1 text-xs">
          <span className="text-gray-600">Today</span>
          <span className="text-gray-400 font-semibold tabular-nums">{formatDuration(liveTodayMs)}</span>
        </div>
      )}

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

      {/* Floating window – same state, same handlers, rendered into the PiP document */}
      {pip.pipWindow && (
        <PiPStopwatch
          pipWindow={pip.pipWindow}
          name={data.name}
          running={sw.running}
          accumulatedTime={sw.accumulatedTime}
          startTimestamp={sw.startTimestamp}
          todayMs={todayMs}
          onStartPause={handleStartPause}
          onReset={handleReset}
        />
      )}
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
