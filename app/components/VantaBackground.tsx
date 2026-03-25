'use client'

import { useEffect, useRef } from 'react'

export function VantaBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const vantaRef     = useRef<{ destroy: () => void } | null>(null)

  useEffect(() => {
    function loadScript(src: string): Promise<void> {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
        const s = document.createElement('script')
        s.src = src
        s.onload = () => resolve()
        s.onerror = reject
        document.head.appendChild(s)
      })
    }

    async function init() {
      if (!containerRef.current) return
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r121/three.min.js')
      await loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.net.min.js')
      if (vantaRef.current || !(window as { VANTA?: unknown }).VANTA) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vantaRef.current = (window as any).VANTA.NET({
        el: containerRef.current,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        scale: 1.00,
        scaleMobile: 1.00,
        color: 0xffffff,
        backgroundColor: 0x0d0609,
      })
    }

    init()

    return () => {
      vantaRef.current?.destroy()
      vantaRef.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 0.25, filter: 'blur(2px)' }}
    />
  )
}
