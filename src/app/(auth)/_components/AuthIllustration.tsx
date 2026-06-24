import { CheckCircle2, LayoutDashboard } from "lucide-react"

export function AuthIllustration() {
  return (
    <div className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-primary p-12 lg:flex">
      <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex h-64 w-full max-w-sm items-center justify-center">
        <div className="absolute top-0 left-2 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
          <div className="w-44 -rotate-3 animate-float rounded-2xl bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Project Progress</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                On track
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="relative flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: "conic-gradient(#6366f1 68%, #e2e8f0 0)" }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-foreground">
                  68%
                </div>
              </div>
              <div>
                <p className="font-heading text-sm font-semibold text-foreground">12 / 18</p>
                <p className="text-[11px] text-muted-foreground">tasks done</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute right-0 bottom-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both">
          <div className="w-48 rotate-3 animate-float rounded-2xl bg-white p-4 shadow-lg [animation-delay:1.5s]">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Today&apos;s tasks</p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span className="text-muted-foreground line-through">Wireframe review</span>
              </li>
              <li className="flex items-center gap-2 text-xs">
                <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-primary" />
                <span className="text-foreground">Client feedback call</span>
              </li>
              <li className="flex items-center gap-2 text-xs">
                <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                <span className="text-foreground">Ship v1.2 release</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="absolute bottom-0 left-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-700 fill-mode-both">
          <div className="flex -rotate-2 animate-float items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-lg [animation-delay:3s]">
            <div className="flex -space-x-2">
              <div className="h-6 w-6 rounded-full border-2 border-white bg-gradient-primary" />
              <div className="h-6 w-6 rounded-full border-2 border-white bg-gradient-teal" />
              <div className="h-6 w-6 rounded-full border-2 border-white bg-gradient-amber" />
            </div>
            <span className="text-[11px] font-medium text-foreground">+5 teammates</span>
          </div>
        </div>
      </div>

      <div className="relative mt-12 max-w-sm text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/30">
          <LayoutDashboard className="h-6 w-6" />
        </div>
        <h2 className="font-heading text-2xl font-semibold text-white">
          A Unified Hub for Smarter Project Delivery
        </h2>
        <p className="mt-2 text-sm text-white/80">
          LLS Task Management gives you a single command center — clear visibility into
          every project, task, and teammate.
        </p>
      </div>

      <div className="relative mt-8 flex items-center gap-1.5">
        <span className="h-1.5 w-6 rounded-full bg-white" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
      </div>
    </div>
  )
}
