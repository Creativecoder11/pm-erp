import { createServer } from "http"
import { parse } from "url"
import next from "next"
import { Server as SocketIOServer } from "socket.io"
import { loadEnvConfig } from "@next/env"

const dev = process.env.NODE_ENV !== "production"
const hostname = "localhost"
const port = parseInt(process.env.PORT || "3000", 10)

loadEnvConfig(process.cwd(), dev)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(async () => {
  const { getToken } = await import("next-auth/jwt")
  const { connectDB } = await import("./src/lib/db")
  const { checkPermission } = await import("./src/lib/rbac")
  const { projectRoom, userRoom, orgRoom } = await import("./src/lib/socket-emit")

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true)
    handle(req, res, parsedUrl)
  })

  const io = new SocketIOServer(httpServer, {
    path: "/api/socket",
    cors: {
      origin: process.env.NEXTAUTH_URL ?? `http://${hostname}:${port}`,
      credentials: true,
    },
  })

  io.use(async (socket, nextFn) => {
    try {
      const headers = new Headers()
      const cookie = socket.request.headers.cookie
      if (cookie) headers.set("cookie", cookie)

      const token = await getToken({
        req: { headers },
        secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
      })

      if (!token?.id) {
        nextFn(new Error("Unauthorized"))
        return
      }

      socket.data.userId = token.id as string
      socket.data.organizationId = token.organizationId as string
      nextFn()
    } catch {
      nextFn(new Error("Unauthorized"))
    }
  })

  io.on("connection", (socket) => {
    const { userId, organizationId } = socket.data as {
      userId: string
      organizationId?: string
    }

    socket.join(userRoom(userId))
    if (organizationId) socket.join(orgRoom(organizationId))

    socket.on("project:join", async (projectId: unknown) => {
      if (typeof projectId !== "string") return
      try {
        await connectDB()
        const allowed = await checkPermission(userId, projectId, "project.view")
        if (allowed) socket.join(projectRoom(projectId))
      } catch {
        // ignore: leave socket out of the room if the check fails
      }
    })

    socket.on("project:leave", (projectId: unknown) => {
      if (typeof projectId === "string") socket.leave(projectRoom(projectId))
    })
  })

  global._io = io

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
