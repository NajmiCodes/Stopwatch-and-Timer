/**
 * History model.
 *
 * A "session" is one uninterrupted run of a stopwatch (start → pause/reset/delete):
 *   { id, taskId, taskName, start, end }   // start/end are epoch ms
 *
 * Sessions are stored raw so they can be re-aggregated any way we like. A run
 * that crosses midnight is split across both days at read time by
 * `splitSessionByDay`, so daily totals are always correct.
 */

export const LS_HISTORY = 'sw_history_v1'

/** Runs shorter than this are dropped – they're almost always mis-clicks. */
export const MIN_SESSION_MS = 1000

// ─── Keys & labels ────────────────────────────────────────────────────────────

/** Local calendar day of a timestamp → "YYYY-MM-DD" */
export function dayKey(ts) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** "YYYY-MM-DD" → "Today" | "Yesterday" | "Mon, 27 Jul 2026" */
export function formatDayLabel(key) {
  const today = dayKey(Date.now())
  if (key === today) return 'Today'

  const yesterday = dayKey(Date.now() - 24 * 60 * 60 * 1000)
  if (key === yesterday) return 'Yesterday'

  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

/** ms → "2h 05m" | "5m 30s" | "42s" */
export function formatDuration(ms) {
  const total = Math.round(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60

  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

/** epoch ms → "14:32" */
export function formatClock(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export function makeSession(taskId, taskName, start, end) {
  return {
    id: `${start}-${taskId}-${Math.random().toString(36).slice(2, 8)}`,
    taskId,
    taskName,
    start,
    end,
  }
}

/**
 * Split a session into per-calendar-day chunks.
 * 23:00 → 01:00 becomes [{ yesterday, 1h }, { today, 1h }].
 */
export function splitSessionByDay(start, end) {
  const chunks = []
  let cursor = start

  while (cursor < end) {
    const d = new Date(cursor)
    const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()
    const chunkEnd = Math.min(nextMidnight, end)
    chunks.push({ date: dayKey(cursor), ms: chunkEnd - cursor })
    cursor = chunkEnd
  }

  return chunks
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

/**
 * Roll sessions up into both orientations at once.
 *
 * `liveNames` maps taskId → current stopwatch name, so renaming a stopwatch
 * relabels its whole history instead of fragmenting it. Deleted stopwatches
 * fall back to the name recorded on the session.
 *
 * Returns { byDay, byTask, totalMs } where
 *   byDay  – [{ date, total, tasks: [{ taskId, name, ms }] }]  newest first
 *   byTask – [{ taskId, name, total, days: [{ date, ms }] }]   largest first
 */
export function buildIndex(sessions, liveNames = {}) {
  const days = new Map()
  const tasks = new Map()
  let totalMs = 0

  for (const s of sessions) {
    const name = liveNames[s.taskId] ?? s.taskName

    for (const { date, ms } of splitSessionByDay(s.start, s.end)) {
      if (ms <= 0) continue
      totalMs += ms

      if (!days.has(date)) days.set(date, { date, total: 0, tasks: new Map() })
      const day = days.get(date)
      day.total += ms
      day.tasks.set(s.taskId, (day.tasks.get(s.taskId) ?? 0) + ms)

      if (!tasks.has(s.taskId)) tasks.set(s.taskId, { taskId: s.taskId, name, total: 0, days: new Map() })
      const task = tasks.get(s.taskId)
      task.name = name
      task.total += ms
      task.days.set(date, (task.days.get(date) ?? 0) + ms)
    }
  }

  const nameOf = (taskId) => tasks.get(taskId)?.name ?? String(taskId)

  const byDay = [...days.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(day => ({
      date: day.date,
      total: day.total,
      tasks: [...day.tasks.entries()]
        .map(([taskId, ms]) => ({ taskId, name: nameOf(taskId), ms }))
        .sort((a, b) => b.ms - a.ms),
    }))

  const byTask = [...tasks.values()]
    .sort((a, b) => b.total - a.total)
    .map(task => ({
      taskId: task.taskId,
      name: task.name,
      total: task.total,
      days: [...task.days.entries()]
        .map(([date, ms]) => ({ date, ms }))
        .sort((a, b) => b.date.localeCompare(a.date)),
    }))

  return { byDay, byTask, totalMs }
}

/** Total ms logged today, optionally for a single task. */
export function totalForToday(sessions, taskId = null) {
  const today = dayKey(Date.now())
  let ms = 0

  for (const s of sessions) {
    if (taskId !== null && s.taskId !== taskId) continue
    for (const chunk of splitSessionByDay(s.start, s.end)) {
      if (chunk.date === today) ms += chunk.ms
    }
  }

  return ms
}

/** Total ms logged over the last `days` calendar days (today included). */
export function totalForLastDays(sessions, days) {
  const cutoff = new Set()
  for (let i = 0; i < days; i++) {
    cutoff.add(dayKey(Date.now() - i * 24 * 60 * 60 * 1000))
  }

  let ms = 0
  for (const s of sessions) {
    for (const chunk of splitSessionByDay(s.start, s.end)) {
      if (cutoff.has(chunk.date)) ms += chunk.ms
    }
  }

  return ms
}

// ─── Per-task colours ─────────────────────────────────────────────────────────

// Written as literal class strings so Tailwind picks them up at build time.
const PALETTE = [
  { bar: 'bg-indigo-500', text: 'text-indigo-400' },
  { bar: 'bg-emerald-500', text: 'text-emerald-400' },
  { bar: 'bg-amber-500', text: 'text-amber-400' },
  { bar: 'bg-sky-500', text: 'text-sky-400' },
  { bar: 'bg-rose-500', text: 'text-rose-400' },
  { bar: 'bg-violet-500', text: 'text-violet-400' },
  { bar: 'bg-teal-500', text: 'text-teal-400' },
  { bar: 'bg-fuchsia-500', text: 'text-fuchsia-400' },
]

export function colorForTask(taskId) {
  const n = Number(taskId)
  return PALETTE[(Number.isFinite(n) ? Math.abs(n) : 0) % PALETTE.length]
}
