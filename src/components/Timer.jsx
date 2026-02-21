import { useState, useEffect, useRef } from 'react'
import { useTimer } from '../hooks/useTimer'

/** Format ms → { hh, mm, ss, cc } */
function formatTime(ms) {
  const clamped = Math.max(0, ms)
  const totalSeconds = Math.floor(clamped / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const centis = Math.floor((clamped % 1000) / 10)
  return {
    hh: String(hours).padStart(2, '0'),
    mm: String(minutes).padStart(2, '0'),
    ss: String(seconds).padStart(2, '0'),
    cc: String(centis).padStart(2, '0'),
  }
}

/** Parse "HH:MM:SS" string → milliseconds */
function parseInputToMs(h, m, s) {
  return (parseInt(h || 0) * 3600 + parseInt(m || 0) * 60 + parseInt(s || 0)) * 1000
}

/** Generate a short beep using Web Audio API */
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 1.0)
  } catch (_) { /* ignore if audio unavailable */ }
}

export default function Timer({ data, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState(data.name)
  const [settingDuration, setSettingDuration] = useState(false)

  // Duration input fields (hours / minutes / seconds)
  const totalSec = Math.floor((data.totalMs ?? 0) / 1000)
  const [dHours, setDHours] = useState(String(Math.floor(totalSec / 3600)).padStart(2, '0'))
  const [dMins, setDMins] = useState(String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0'))
  const [dSecs, setDSecs] = useState(String(totalSec % 60).padStart(2, '0'))

  const alertedRef = useRef(false)

  const timer = useTimer(
    {
      totalMs: data.totalMs,
      targetEndTimestamp: data.targetEndTimestamp,
      remainingMs: data.remainingMs,
      running: data.running,
      finished: data.finished,
    },
    () => {
      if (!alertedRef.current) {
        alertedRef.current = true
        playBeep()
        onUpdate({ ...data, running: false, finished: true, remainingMs: 0, targetEndTimestamp: null })
      }
    }
  )

  // Reset alert flag when timer is reset
  useEffect(() => {
    if (!timer.finished) alertedRef.current = false
  }, [timer.finished])

  const syncUp = (patch) => {
    onUpdate({ ...data, ...patch })
  }

  const handleStartPause = () => {
    if (timer.running) {
      timer.pause()
      const left = Math.max(0, timer.targetEndTimestamp - Date.now())
      syncUp({ running: false, remainingMs: left, targetEndTimestamp: null })
    } else {
      if (timer.finished || timer.remainingMs <= 0) return
      const end = Date.now() + timer.remainingMs
      timer.start()
      syncUp({ running: true, targetEndTimestamp: end, finished: false })
    }
  }

  const handleReset = () => {
    timer.reset()
    syncUp({ running: false, finished: false, remainingMs: data.totalMs, targetEndTimestamp: null })
  }

  const handleSaveDuration = () => {
    const ms = parseInputToMs(dHours, dMins, dSecs)
    if (ms <= 0) return
    timer.reset()
    syncUp({
      totalMs: ms,
      remainingMs: ms,
      running: false,
      finished: false,
      targetEndTimestamp: null,
    })
    setSettingDuration(false)
  }

  const handleRename = () => {
    if (nameInput.trim()) syncUp({ name: nameInput.trim() })
    setEditing(false)
  }

  const { hh, mm, ss, cc } = formatTime(timer.display)

  // Progress percentage for the arc
  const progress = data.totalMs > 0 ? Math.max(0, Math.min(1, timer.display / data.totalMs)) : 0

  return (
    <div className={`bg-gray-800 border rounded-2xl p-5 flex flex-col gap-4 shadow-lg transition-all ${
      timer.finished
        ? 'border-red-500/70 shadow-red-900/30 animate-pulse-once'
        : 'border-gray-700 hover:border-gray-600'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        {editing ? (
          <input
            autoFocus
            className="bg-gray-900 border border-violet-500 rounded-lg px-3 py-1 text-white text-sm flex-1 outline-none focus:ring-2 focus:ring-violet-500"
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
          {timer.running && (
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse shrink-0" />
          )}
          {timer.finished && (
            <span className="text-red-400 text-xs font-semibold animate-pulse">DONE</span>
          )}
          <button
            onClick={onDelete}
            className="text-gray-600 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-400/10"
            title="Delete timer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Duration setter */}
      {settingDuration ? (
        <div className="flex flex-col gap-3">
          <p className="text-gray-400 text-xs text-center">Set duration (HH : MM : SS)</p>
          <div className="flex items-center justify-center gap-2">
            <DurationInput value={dHours} onChange={setDHours} max={99} label="HH" />
            <span className="text-gray-400 text-xl">:</span>
            <DurationInput value={dMins} onChange={setDMins} max={59} label="MM" />
            <span className="text-gray-400 text-xl">:</span>
            <DurationInput value={dSecs} onChange={setDSecs} max={59} label="SS" />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveDuration}
              className="flex-1 py-2 rounded-xl text-sm font-semibold bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border border-violet-500/30 transition-all active:scale-95"
            >
              Set Duration
            </button>
            <button
              onClick={() => setSettingDuration(false)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold bg-gray-700/50 text-gray-400 hover:bg-gray-700 border border-gray-600/50 transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-100 ${
                timer.finished ? 'bg-red-500' : progress < 0.2 ? 'bg-amber-400' : 'bg-violet-500'
              }`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {/* Time display */}
          <div className="flex items-end justify-center gap-0.5 digit-font select-none">
            <TimeBlock value={hh} label="HH" dim={timer.finished} />
            <Colon finished={timer.finished} />
            <TimeBlock value={mm} label="MM" dim={timer.finished} />
            <Colon finished={timer.finished} />
            <TimeBlock value={ss} label="SS" dim={timer.finished} />
            <span className="text-gray-500 text-2xl font-light mb-1 mx-0.5">.</span>
            <TimeBlock value={cc} label="MS" small dim={timer.finished} />
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={handleStartPause}
              disabled={timer.finished || data.totalMs === 0}
              className={`flex-1 py-2 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                timer.running
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30'
                  : 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border border-violet-500/30'
              }`}
            >
              {timer.running ? 'Pause' : (timer.display < data.totalMs && timer.display > 0 ? 'Resume' : 'Start')}
            </button>
            <button
              onClick={handleReset}
              className="py-2 px-4 rounded-xl font-semibold text-sm bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-600/50 transition-all active:scale-95"
            >
              Reset
            </button>
            <button
              onClick={() => { timer.pause(); setSettingDuration(true) }}
              className="py-2 px-3 rounded-xl font-semibold text-sm bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-600/50 transition-all active:scale-95"
              title="Set duration"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/>
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function DurationInput({ value, onChange, max, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <input
        type="number"
        min="0"
        max={max}
        value={value}
        onChange={e => {
          const v = Math.min(max, Math.max(0, parseInt(e.target.value) || 0))
          onChange(String(v).padStart(2, '0'))
        }}
        className="w-14 text-center bg-gray-900 border border-gray-600 rounded-lg py-1.5 text-white text-lg font-bold outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 digit-font"
      />
      <span className="text-gray-600 text-[9px] uppercase tracking-widest">{label}</span>
    </div>
  )
}

function TimeBlock({ value, label, small, dim }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`font-bold tabular-nums ${small ? 'text-2xl' : 'text-4xl'} ${dim ? 'text-red-400' : 'text-white'}`}>
        {value}
      </span>
      <span className="text-gray-600 text-[9px] uppercase tracking-widest mt-0.5">{label}</span>
    </div>
  )
}

function Colon({ finished }) {
  return (
    <span className={`text-4xl font-light pb-4 mx-0.5 select-none ${finished ? 'text-red-400' : 'text-gray-500'}`}>:</span>
  )
}
