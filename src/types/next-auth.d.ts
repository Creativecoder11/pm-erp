import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "superadmin" | "admin" | "member" | "guest"
      organizationId: string
    } & DefaultSession["user"]
  }

  interface User {
    id?: string
    role?: "superadmin" | "admin" | "member" | "guest"
    organizationId?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: "superadmin" | "admin" | "member" | "guest"
    organizationId?: string
  }
}
