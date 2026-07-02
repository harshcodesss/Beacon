export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/incidents/:path*", "/settings/:path*"],
};
