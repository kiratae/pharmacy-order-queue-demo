import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { DevSessionProvider } from "../lib/session-provider";
import { RoleSwitcher } from "../lib/role-switcher";
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
  title: "Pharmacy Order Queue",
  description: "Pharmacy order review and dispensing queue",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <DevSessionProvider>
          <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
            <Link href="/queue" className="font-semibold">
              Pharmacy Order Queue
            </Link>
            <RoleSwitcher />
          </header>
          <main className="flex-1 p-6">{children}</main>
        </DevSessionProvider>
      </body>
    </html>
  );
}
