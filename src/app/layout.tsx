import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

// DESIGN.md §3 — Plus Jakarta Sans, self-hosted via next/font.
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "e-Santri",
  description: "Pendataan santri: pencapaian kitab dan absensi kegiatan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} h-full antialiased`} suppressHydrationWarning>
      {/* Dark mode (DESIGN.md §7): inline script runs synchronously during
          HTML parsing, before first paint — prevents a light/dark flash.
          Toggles the `.dark` class on <html> (see globals.css), following the
          stored preference or the OS `prefers-color-scheme` on first visit. */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var dark=t==="dark"||(t!="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",dark);}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className="flex min-h-full flex-col bg-background text-ink"
        suppressHydrationWarning
      >
        <Toaster>{children}</Toaster>
      </body>
    </html>
  );
}
