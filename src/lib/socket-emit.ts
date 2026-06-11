import type { Server as SocketIOServer } from "socket.io"

declare global {
  // eslint-disable-next-line no-var
  var _io: SocketIOServer | undefined
}

/**
 * Emits a Socket.IO event to a room. Safe to call even if the Socket.IO
 * server hasn't been initialized (e.g. during `next build`); becomes live
 * once `server.js` sets `global._io`.
 */
export function emitToRoom(room: string, event: string, payload: unknown) {
  global._io?.to(room).emit(event, payload)
}

export function orgRoom(organizationId: string) {
  return `org:${organizationId}`
}

export function projectRoom(projectId: string) {
  return `project:${projectId}`
}

export function userRoom(userId: string) {
  return `user:${userId}`
}
