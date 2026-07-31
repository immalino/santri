import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// DESIGN.md §3 — Plus Jakarta Sans, self-hosted via next/font.
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "Sistem Pendataan Pencapaian Santri",
  description: "Pendataan progress pencapaian santri per kitab",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-ink">
        {children}
      </body>
    </html>
  );
}
