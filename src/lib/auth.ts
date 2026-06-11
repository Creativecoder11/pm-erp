import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { Types } from "mongoose"
import { connectDB } from "@/lib/db"
import { User } from "@/models/User"
import { Organization } from "@/models/Organization"
import { authConfig } from "@/lib/auth.config"

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
          // First time Google sign-in: create a personal organization and owner user
          const placeholderOwnerId = new Types.ObjectId()
          const org = await Organization.create({
            name: `${user.name ?? "My"}'s Organization`,
            slug: `org-${Date.now()}`,
            ownerId: placeholderOwnerId,
            members: [],
            settings: {
              allowPublicProjects: false,
              defaultProjectVisibility: "private",
              maxMembers: 10,
            },
          })

          dbUser = await User.create({
            name: user.name ?? user.email,
            email: user.email,
            avatar: user.image ?? undefined,
            role: "admin",
            organizationId: org._id,
          })

          org.ownerId = dbUser._id
          org.members.push({ userId: dbUser._id, role: "owner", joinedAt: new Date() })
          await org.save()
        }

        user.id = dbUser._id.toString()
        user.role = dbUser.role
        user.organizationId = dbUser.organizationId.toString()
      }

      return true
    },
  },
})
