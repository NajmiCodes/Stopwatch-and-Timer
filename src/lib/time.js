/** Format ms → { hh, mm, ss, cc } zero-padded parts. */
export function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const centis = Math.floor((ms % 1000) / 10)

  return {
    hh: String(hours).padStart(2, '0'),
    mm: String(minutes).padStart(2, '0'),
    ss: String(seconds).padStart(2, '0'),
    cc: String(centis).padStart(2, '0'),
  }
}
