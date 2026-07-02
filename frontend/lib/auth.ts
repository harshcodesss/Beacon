import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { apiUrl } from "@/lib/api";

interface BackendAuthResponse {
  access_token: string;
  user: { id: string; email: string; name: string };
}

async function exchangeWithBackend(payload: object): Promise<BackendAuthResponse | null> {
  try {
    const resp = await fetch(`${apiUrl()}/auth/google/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as BackendAuthResponse;
  } catch {
    return null;
  }
}

const providers: NextAuthOptions["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

if (process.env.AUTH_DEV_MODE === "true") {
  providers.push(
    CredentialsProvider({
      id: "dev",
      name: "Dev sign-in",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const auth = await exchangeWithBackend({ dev_email: credentials.email });
        if (!auth) return null;
        return {
          id: auth.user.id,
          email: auth.user.email,
          name: auth.user.name,
          backendToken: auth.access_token,
        };
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  callbacks: {
    async jwt({ token, account, user }) {
      // Google sign-in: swap the Google ID token for a Beacon API JWT.
      if (account?.provider === "google" && account.id_token) {
        const auth = await exchangeWithBackend({ id_token: account.id_token });
        if (auth) {
          token.backendToken = auth.access_token;
          token.userId = auth.user.id;
        }
      }
      // Dev credentials sign-in: authorize() already exchanged.
      const withBackend = user as { backendToken?: string } | undefined;
      if (withBackend?.backendToken) {
        token.backendToken = withBackend.backendToken;
        token.userId = user!.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.backendToken = token.backendToken as string | undefined;
      if (session.user && token.userId) session.user.id = token.userId as string;
      return session;
    },
  },
};

declare module "next-auth" {
  interface Session {
    backendToken?: string;
    user?: { id?: string; name?: string | null; email?: string | null; image?: string | null };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendToken?: string;
    userId?: string;
  }
}
