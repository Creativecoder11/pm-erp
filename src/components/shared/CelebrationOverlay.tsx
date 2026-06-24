"use client"

import { useEffect, useState } from "react"
import { useUIStore } from "@/store/uiStore"

const VISIBLE_MS = 3000

export function CelebrationOverlay() {
  const celebration = useUIStore((s) => s.celebration)
  const [visible, setVisible] = useState(false)
  const [lastCelebration, setLastCelebration] = useState(celebration)

  if (celebration !== lastCelebration) {
    setLastCelebration(celebration)
    setVisible(true)
  }

  useEffect(() => {
    if (celebration === 0) return
    const timer = setTimeout(() => setVisible(false), VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [celebration])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-60 animate-in fade-in duration-200">
      {/* eslint-disable-next-line @next/next/no-img-element -- animated gif must play unmodified, next/image strips animation */}
      <img
        key={celebration}
        src="/effects/confetti-celebration.gif"
        alt=""
        className="h-full w-full object-cover"
      />
    </div>
  )
}
