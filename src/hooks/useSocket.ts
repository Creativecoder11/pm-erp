"use client"

import { useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"

let sharedSocket: Socket | null = null

function getSocket(): Socket | null {
  if (typeof window === "undefined") return null
  if (!sharedSocket) {
    sharedSocket = io({ path: "/api/socket", withCredentials: true })
  }
  return sharedSocket
}

/**
 * Returns a shared Socket.IO connection (one underlying socket per tab,
 * authenticated via the session cookie on the server). Pass `projectId`
 * to also join/leave that project's real-time room for the lifetime of
 * the calling component.
 */
export function useSocket(projectId?: string) {
  const [socket] = useState<Socket | null>(() => getSocket())

  useEffect(() => {
    if (!socket || !projectId) return

    socket.emit("project:join", projectId)
    return () => {
      socket.emit("project:leave", projectId)
    }
  }, [socket, projectId])

  return socket
}
