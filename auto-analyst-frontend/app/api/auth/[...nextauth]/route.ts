import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: "Temporary Login",
      credentials: {
        password: { label: "Temporary Code", type: "password" },
        isAdmin: { label: "Is Admin", type: "text" }
      },
      async authorize(credentials) {
        if (credentials?.password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD && credentials?.isAdmin === "true") {
          return {
            id: "admin",
            name: "Administrator",
            email: "admin@example.com",
            image: "https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/Auto-analysts%20icon%20small-S682Oi8nbFhOADUHXJSD9d0KtSWKCe.png"
          }
        }
        return null
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
    signOut: '/signout',
  },
  callbacks: {
    async session({ session, token }) {
      // Pass the admin status to the session
      if (token.email === "admin@example.com") {
        session.user.isAdmin = true
      }
      return session
    },
    async jwt({ token, user }) {
      if (user?.email === "admin@example.com") {
        token.isAdmin = true
      }
      return token
    },
  },
})

export { handler as GET, handler as POST } 