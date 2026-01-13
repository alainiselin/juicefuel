import { PrismaAdapter } from "@auth/prisma-adapter"
import type { AuthConfig } from "@auth/core/types"
import Google from "@auth/core/providers/google"
import Credentials from "@auth/core/providers/credentials"
import { hash } from "bcrypt"
import prisma from "./prisma"

export const authOptions: AuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user_profile.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user || !user.password_hash) {
          return null
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.password_hash
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.display_name,
          image: user.avatar_url
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string
      }
      return session
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.sub = user.id
      }
      
      // On Google sign-in, update/create user profile
      if (account?.provider === 'google' && profile) {
        await prisma.user_profile.upsert({
          where: { id: token.sub as string },
          update: {
            display_name: profile.name,
            avatar_url: profile.image,
            email_verified: new Date()
          },
          create: {
            id: token.sub as string,
            email: profile.email,
            display_name: profile.name,
            avatar_url: profile.image,
            email_verified: new Date()
          }
        })
      }
      
      return token
    }
  }
}

// Helper to hash passwords
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}
