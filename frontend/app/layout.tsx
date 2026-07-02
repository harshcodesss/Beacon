import type { Metadata } from "next";

import { NavBar } from "@/components/NavBar";

import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beacon — AI incident triage",
  description:
    "Beacon lights the way to root cause: evidence-cited incident reports from an agent pipeline.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <NavBar />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
