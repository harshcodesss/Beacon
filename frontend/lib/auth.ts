import { cookies } from "next/headers";
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";

import { apiUrl } from "@/lib/api";

interface BackendAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email: string; name: string };
}

interface BackendRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// Swap the access token a minute before it expires so an in-flight API call
// never carries one that dies mid-request.
const REFRESH_SKEW_MS = 60_000;

async function exchangeWithBackend(payload: object): Promise<BackendAuthResponse | null> {
  try {
    const resp = await fetch(`${apiUrl()}/auth/oauth/callback`, {
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

/** The /login page drops this cookie right before the OAuth redirect; it is
 *  the only way the checkbox survives the round-trip through GitHub. */
function readRememberCookie(): boolean {
  try {
    return cookies().get("beacon.remember")?.value === "1";
  } catch {
    return false;
  }
}

function applyAuth(token: JWT, auth: BackendAuthResponse | BackendRefreshResponse): JWT {
  return {
    ...token,
    backendToken: auth.access_token,
    backendTokenExpires: Date.now() + auth.expires_in * 1000,
    refreshToken: auth.refresh_token,
    error: undefined,
  };
}

async function refreshBackendToken(token: JWT): Promise<JWT> {
  try {
    const resp = await fetch(`${apiUrl()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: token.refreshToken }),
    });
    if (resp.status === 401) {
      // the backend session is dead (idle or 30-day ceiling): end the cookie
      // session too
      return {
        ...token,
        backendToken: undefined,
        refreshToken: undefined,
        error: "SessionExpired",
      };
    }
    if (!resp.ok) return token; // transient server error: retry next request
    return applyAuth(token, (await resp.json()) as BackendRefreshResponse);
  } catch {
    return token; // network blip: keep the session, retry next request
  }
}

const providers: NextAuthOptions["providers"] = [];

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      // user:email lets the backend resolve a private primary email.
      authorization: { params: { scope: "read:user user:email" } },
    }),
  );
}

if (process.env.AUTH_DEV_MODE === "true") {
  providers.push(
    CredentialsProvider({
      id: "dev",
      name: "Dev sign-in",
      credentials: {
        email: { label: "Email", type: "email" },
        remember: { label: "Remember", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const auth = await exchangeWithBackend({
          dev_email: credentials.email,
          remember: credentials.remember === "1",
        });
        if (!auth) return null;
        return {
          id: auth.user.id,
          email: auth.user.email,
          name: auth.user.name,
          backendAuth: auth,
        };
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async jwt({ token, account, user }) {
      // GitHub sign-in: swap the GitHub access token for a Beacon session.
      if (account?.provider === "github" && account.access_token) {
        const auth = await exchangeWithBackend({
          access_token: account.access_token,
          remember: readRememberCookie(),
        });
        if (auth) {
          token = applyAuth(token, auth);
          token.userId = auth.user.id;
        } else {
          token.error = "SessionExpired";
        }
      }
      // Dev credentials sign-in: authorize() already exchanged.
      const withBackend = user as { backendAuth?: BackendAuthResponse } | undefined;
      if (withBackend?.backendAuth) {
        token = applyAuth(token, withBackend.backendAuth);
        token.userId = withBackend.backendAuth.user.id;
      }
      // Silent rotation while the session is alive.
      if (
        token.refreshToken &&
        token.backendTokenExpires &&
        Date.now() > token.backendTokenExpires - REFRESH_SKEW_MS
      ) {
        return refreshBackendToken(token);
      }
      return token;
    },
    async session({ session, token }) {
      session.backendToken = token.backendToken as string | undefined;
      session.error = token.error;
      if (session.user && token.userId) session.user.id = token.userId as string;
      return session;
    },
  },
  events: {
    // Best-effort server-side revocation; the cookie dies regardless.
    async signOut({ token }) {
      if (!token?.refreshToken) return;
      try {
        await fetch(`${apiUrl()}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: token.refreshToken }),
        });
      } catch {
        // revocation is opportunistic; the refresh token is gone client-side
      }
    },
  },
};

declare module "next-auth" {
  interface Session {
    backendToken?: string;
    error?: "SessionExpired";
    user?: { id?: string; name?: string | null; email?: string | null; image?: string | null };
  }
  interface User {
    backendAuth?: BackendAuthResponse;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendToken?: string;
    backendTokenExpires?: number;
    refreshToken?: string;
    userId?: string;
    error?: "SessionExpired";
  }
}
