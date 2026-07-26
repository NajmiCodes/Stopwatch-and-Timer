import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Document Picture-in-Picture: a real always-on-top OS window that can host
 * arbitrary DOM (so the stopwatch keeps its live digits *and* its buttons).
 *
 * Chromium-only for now — `supported` is false elsewhere and callers should
 * hide the entry point rather than offering something that can't open.
 */
export function isDocumentPiPSupported() {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window
}

/**
 * The PiP document starts empty, so every stylesheet the app relies on has to
 * be carried across by hand. <style> tags (Vite dev, Tailwind's injected CSS)
 * are cloned verbatim; <link> tags are re-created from their *resolved* href,
 * since the PiP document has no base URL to resolve a relative one against.
 */
function copyStyles(pipWindow) {
  const head = pipWindow.document.head

  document.querySelectorAll('style').forEach(node => {
    head.appendChild(node.cloneNode(true))
  })

  document.querySelectorAll('link[rel="stylesheet"]').forEach(node => {
    const link = pipWindow.document.createElement('link')
    link.rel = 'stylesheet'
    link.href = node.href
    if (node.media) link.media = node.media
    head.appendChild(link)
  })
}

export function useDocumentPiP({ width = 360, height = 232 } = {}) {
  const [pipWindow, setPipWindow] = useState(null)
  const windowRef = useRef(null)
  const openingRef = useRef(false)

  const open = useCallback(async () => {
    if (!isDocumentPiPSupported() || openingRef.current) return
    openingRef.current = true

    try {
      // Must be called synchronously off a user gesture – no awaits before this.
      const w = await window.documentPictureInPicture.requestWindow({ width, height })
      copyStyles(w)
      w.document.body.classList.add('bg-gray-950', 'text-white', 'select-none')

      // Fires whether the user closes the window or the browser reclaims it.
      w.addEventListener('pagehide', () => {
        windowRef.current = null
        setPipWindow(null)
      }, { once: true })

      windowRef.current = w
      setPipWindow(w)
    } catch (err) {
      // Denied, blocked by the embedder, or another request won the race.
      console.warn('Picture-in-Picture could not be opened:', err)
    } finally {
      openingRef.current = false
    }
  }, [width, height])

  const close = useCallback(() => {
    windowRef.current?.close()
    windowRef.current = null
    setPipWindow(null)
  }, [])

  // Don't leave an orphaned window behind if the owner unmounts (e.g. deleted).
  useEffect(() => () => windowRef.current?.close(), [])

  return { pipWindow, open, close, supported: isDocumentPiPSupported() }
}
