import { useMemo, useState } from 'react'
import {
  buildIndex,
  colorForTask,
  formatDayLabel,
  formatDuration,
  totalForLastDays,
  totalForToday,
} from '../lib/history'

export default function History({ sessions, stopwatches, onClear }) {
  const [view, setView] = useState('day') // 'day' | 'task'
  const [confirmClear, setConfirmClear] = useState(false)

  // Current names win over the snapshot stored on each session, so renaming a
  // stopwatch relabels its whole history instead of splitting it in two.
  const liveNames = useMemo(
    () => Object.fromEntries(stopwatches.map(sw => [sw.id, sw.name])),
    [stopwatches],
  )

  const { byDay, byTask, totalMs } = useMemo(
    () => buildIndex(sessions, liveNames),
    [sessions, liveNames],
  )

  const todayMs = useMemo(() => totalForToday(sessions), [sessions])
  const weekMs = useMemo(() => totalForLastDays(sessions, 7), [sessions])

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <span className="text-6xl">📊</span>
        <div>
          <p className="text-gray-300 font-semibold text-lg">No history yet</p>
          <p className="text-gray-600 text-sm mt-1 max-w-sm">
            Run a stopwatch and pause it — each run is logged here, grouped by day and by task.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Today" value={todayMs} accent="text-emerald-400" />
        <SummaryCard label="Last 7 days" value={weekMs} accent="text-indigo-400" />
        <SummaryCard label="All time" value={totalMs} accent="text-violet-400" />
      </div>

      {/* View switch + clear */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-gray-900 border border-gray-800 p-1">
          <ViewButton active={view === 'day'} onClick={() => setView('day')}>By day</ViewButton>
          <ViewButton active={view === 'task'} onClick={() => setView('task')}>By task</ViewButton>
        </div>

        {confirmClear ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 hidden sm:inline">Delete all history?</span>
            <button
              onClick={() => { onClear(); setConfirmClear(false) }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-all active:scale-95"
            >
              Yes, clear
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 text-gray-400 hover:text-white transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            Clear history
          </button>
        )}
      </div>

      {/* Groups */}
      <div className="flex flex-col gap-3">
        {view === 'day'
          ? byDay.map(day => (
              <GroupCard
                key={day.date}
                title={formatDayLabel(day.date)}
                subtitle={`${day.tasks.length} ${day.tasks.length === 1 ? 'task' : 'tasks'}`}
                total={day.total}
                rows={day.tasks.map(t => ({
                  key: t.taskId,
                  label: t.name,
                  ms: t.ms,
                  color: colorForTask(t.taskId),
                }))}
              />
            ))
          : byTask.map(task => (
              <GroupCard
                key={task.taskId}
                title={task.name}
                subtitle={`${task.days.length} ${task.days.length === 1 ? 'day' : 'days'}`}
                total={task.total}
                accent={colorForTask(task.taskId)}
                rows={task.days.map(d => ({
                  key: d.date,
                  label: formatDayLabel(d.date),
                  ms: d.ms,
                  color: colorForTask(task.taskId),
                }))}
              />
            ))}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ label, value, accent }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3">
      <p className="text-gray-500 text-[10px] uppercase tracking-widest">{label}</p>
      <p className={`font-bold tabular-nums mt-1 text-xl sm:text-2xl ${accent}`}>
        {formatDuration(value)}
      </p>
    </div>
  )
}

function ViewButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
        active ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {children}
    </button>
  )
}

/** One day (listing its tasks) or one task (listing its days). */
function GroupCard({ title, subtitle, total, rows, accent }) {
  const max = Math.max(...rows.map(r => r.ms), 1)

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`font-semibold text-sm truncate ${accent ? accent.text : 'text-white'}`}>
            {title}
          </h3>
          <p className="text-gray-600 text-xs mt-0.5">{subtitle}</p>
        </div>
        <span className="text-gray-300 font-bold tabular-nums text-lg shrink-0">
          {formatDuration(total)}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {rows.map(row => (
          <div key={row.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-gray-400 text-xs truncate">{row.label}</span>
              <span className="text-gray-300 text-xs font-semibold tabular-nums shrink-0">
                {formatDuration(row.ms)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-900 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${row.color.bar}`}
                style={{ width: `${Math.max((row.ms / max) * 100, 2)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
