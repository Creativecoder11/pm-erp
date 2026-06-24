import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"

/**
 * Edge-compatible auth config used by middleware. Contains no Mongoose or
 * bcryptjs imports (both are Node-only). The real `authorize` implementation
 * lives in `auth.ts`, which extends this config for use in API routes and
 * server components.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async () => null,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user
      const { pathname } = request.nextUrl
      const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register")

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", request.nextUrl))
        }
        return true
      }

      return isLoggedIn
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.organizationId = user.organizationId
      }
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name
        if (session.image !== undefined) token.picture = session.image
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as "superadmin" | "admin" | "member"
        session.user.organizationId = token.organizationId as string
      }
      return session
    },
  },
}
