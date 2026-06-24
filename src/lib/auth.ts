import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { connectDB } from "@/lib/db"
import { User } from "@/models/User"
import { authConfig } from "@/lib/auth.config"
import { provisionNewUser } from "@/lib/onboarding"

class PendingApprovalError extends CredentialsSignin {
  code = "pending_approval"
}

class AccountBlockedError extends CredentialsSignin {
  code = "blocked"
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        await connectDB()
        const user = await User.findOne({ email: credentials.email }).select("+password")
        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(credentials.password as string, user.password)
        if (!isValid) return null

        if (user.status === "pending") throw new PendingApprovalError()
        if (user.status === "blocked") throw new AccountBlockedError()

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.avatar,
          role: user.role,
          organizationId: user.organizationId.toString(),
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false

        await connectDB()
        let dbUser = await User.findOne({ email: user.email })

        if (!dbUser) {
          // First-ever signup becomes Super Admin and is active immediately;
          // everyone after that joins as a pending Member awaiting approval.
          const { user: createdUser } = await provisionNewUser({
            name: user.name ?? user.email,
            email: user.email,
            avatar: user.image ?? undefined,
          })
          dbUser = createdUser
        }

        if (dbUser.status === "pending") return "/login?oauthError=pending_approval"
        if (dbUser.status === "blocked") return "/login?oauthError=blocked"

        user.id = dbUser._id.toString()
        user.role = dbUser.role
        user.organizationId = dbUser.organizationId.toString()
      }

      return true
    },
  },
})
