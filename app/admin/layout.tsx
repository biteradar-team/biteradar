import type {Metadata} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import "../globals.css";

// /admin is a single-locale (Serbian) internal tool outside next-intl (blueprint
// §6), so it needs its own root <html>/<body> — there is no app/layout.tsx.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "BiteRadar Admin",
  robots: {index: false, follow: false}, // internal tool — keep out of search
};

export default function AdminLayout({
  children,
}: Readonly<{children: React.ReactNode}>) {
  return (
    <html
      lang="sr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-black">
        {children}
      </body>
    </html>
  );
}
