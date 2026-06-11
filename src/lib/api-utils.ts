import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function getSessionUser() {
  const session = await auth()
  return session?.user ?? null
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export function notFound(entity = "Resource") {
  return NextResponse.json({ error: `${entity} not found` }, { status: 404 })
}

export function badRequest(details?: unknown) {
  return NextResponse.json({ error: "Invalid request", details }, { status: 400 })
}

export function serverError(err: unknown) {
  console.error(err)
  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}
