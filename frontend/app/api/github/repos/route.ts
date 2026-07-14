import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

export type RepoOption = {
  full_name: string;
  private: boolean;
  description: string | null;
  pushed_at: string | null;
};

/** Lists the signed-in user's GitHub repositories for the New Project picker.
 *
 * Runs server-side with the GitHub access token held in the encrypted NextAuth
 * JWT; the token never reaches the browser. Returns `{ repos: null }` when no
 * token exists (dev sign-in) or GitHub declines, and the UI falls back to
 * manual entry. With the sign-in scope (`read:user user:email`) GitHub returns
 * the user's public repositories.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  const gh = token?.githubAccessToken;
  if (!gh) return NextResponse.json({ repos: null });

  try {
    const resp = await fetch(
      "https://api.github.com/user/repos?sort=pushed&per_page=100&type=owner",
      {
        headers: {
          Authorization: `Bearer ${gh}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
      },
    );
    if (!resp.ok) return NextResponse.json({ repos: null });

    const data = (await resp.json()) as Array<{
      full_name: string;
      private: boolean;
      description: string | null;
      pushed_at: string | null;
    }>;
    const repos: RepoOption[] = data.map((r) => ({
      full_name: r.full_name,
      private: r.private,
      description: r.description,
      pushed_at: r.pushed_at,
    }));
    return NextResponse.json({ repos });
  } catch {
    return NextResponse.json({ repos: null });
  }
}
