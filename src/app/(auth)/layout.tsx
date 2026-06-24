import Link from "next/link"
import { AuthTabs } from "./_components/AuthTabs"
import { AuthIllustration } from "./_components/AuthIllustration"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-[45%] lg:px-16 xl:w-[40%]">
        <div className="mx-auto w-full max-w-sm animate-in fade-in slide-in-from-left-4 duration-700 fill-mode-both">
          <Link href="/login" className="mb-10 flex items-center gap-2">
            <div className="icon-chip h-9 w-9 rounded-xl text-base font-bold">L</div>
            <span className="font-heading text-lg font-semibold tracking-tight">LLS Task Management</span>
          </Link>

          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Welcome to LLS Task Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start your experience with LLS Task Management by signing in or signing up.
          </p>

          <AuthTabs />

          {children}

          <p className="mt-10 text-center text-xs text-muted-foreground">
            Copyright © LLS Task Management. All Rights Reserved.{" "}
            <Link href="#" className="hover:text-foreground hover:underline">
              Terms &amp; Condition
            </Link>{" "}
            <Link href="#" className="hover:text-foreground hover:underline">
              Privacy &amp; Policy
            </Link>
          </p>
        </div>
      </div>

      <AuthIllustration />
    </div>
  )
}
