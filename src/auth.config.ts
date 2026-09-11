import type { NextAuthConfig } from "next-auth";

/**
 * Edge/proxy-safe Auth.js config. Do not import Prisma, bcrypt, or Node-only
 * packages here — they would be bundled into the request interceptor.
 */
export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as "PATIENT" | "DOCTOR" | "ADMIN") ?? "ADMIN";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
