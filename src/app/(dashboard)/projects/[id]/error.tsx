"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertTriangle className="h-10 w-10 text-muted-foreground" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Couldn&apos;t load this project</h2>
        <p className="text-sm text-muted-foreground">
          Something went wrong while loading this project. It may have been removed or you may
          not have access.
        </p>
      </div>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  )
}
