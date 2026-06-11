import { cn } from "@/lib/utils"

interface CompletionRingProps {
  completionRate: number
  size?: number
  strokeWidth?: number
  className?: string
}

export function CompletionRing({
  completionRate,
  size = 36,
  strokeWidth = 3,
  className,
}: CompletionRingProps) {
  const pct = Math.min(100, Math.max(0, Math.round(completionRate)))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="stroke-primary transition-[stroke-dashoffset]"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums">
        {pct}%
      </span>
    </div>
  )
}
