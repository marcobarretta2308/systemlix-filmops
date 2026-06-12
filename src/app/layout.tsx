import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PlatformProvider } from "@/lib/context/PlatformContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FilmOps",
  description:
    "Piattaforma SaaS multi-tenant per produzioni cinematografiche e audiovisive",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--bg-base)] text-[var(--text-primary)]">
        <PlatformProvider>{children}</PlatformProvider>
      </body>
    </html>
  );
}
