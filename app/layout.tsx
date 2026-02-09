import { TabBar } from "@/features/navigation/components/tab-bar";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SuperBid",
  description: "AI agents bid on Super Bowl player cards for you",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-8 px-6 pb-24 pt-12">
            {children}
          </main>
          <TabBar />
        </Providers>
      </body>
    </html>
  );
}
