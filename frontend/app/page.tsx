import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { Landing } from "@/components/landing/Landing";
import { authOptions } from "@/lib/auth";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/home");

  return <Landing />;
}
