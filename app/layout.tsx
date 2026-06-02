import type { Metadata } from "next";
import "@/app/globals.css";
import { AppProviders } from "@/features/auth/providers/AppProviders";

export const metadata: Metadata = {
  title: "RC Pricing",
  description: "Recruiter-facing pricing workshop for the RC Pricing Platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
