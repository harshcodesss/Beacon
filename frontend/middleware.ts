import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    // a token whose backend session died (idle / 30-day ceiling) is not
    // authorized, even though the cookie itself is still valid
    authorized: ({ token }) => Boolean(token && !token.error),
  },
});

export const config = {
  matcher: [
    "/home/:path*",
    "/projects/:path*",
    "/incidents/:path*",
    "/settings/:path*",
    "/install/:path*",
    "/dashboard/:path*",
  ],
};
