import "@/lib/auth-env";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { Role, UserStatus } from "@prisma/client";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { clearLoginFailures, clientIp, isLoginLocked, recordLoginFailure } from "@/lib/login-throttle";

class TooManyAttempts extends CredentialsSignin {
  code = "too_many_attempts";
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
    };
  }

  interface User {
    role: Role;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        if (await isLoginLocked(email)) throw new TooManyAttempts();

        const user = await prisma.user.findUnique({ where: { email } });
        const ok =
          !!user &&
          user.status === UserStatus.ACTIVE &&
          user.role === Role.ADMIN &&
          (await verifyPassword(password, user.passwordHash));
        if (!user || !ok) {
          await recordLoginFailure(email, clientIp(request));
          return null;
        }
        await clearLoginFailures(email);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.imageUrl,
          role: user.role,
        };
      },
    }),
  ],
});
