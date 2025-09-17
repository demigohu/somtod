import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Providers } from "./providers"
import { Suspense } from "react"

// ✨ Tambahkan CSS RainbowKit
import "@rainbow-me/rainbowkit/styles.css"

export const metadata: Metadata = {
  title: "Somnia Dev Dashboard",
  description:
    "Professional blockchain transaction and contract inspector for Somnia Network",
  icons: {
    icon: "/favicon.png", // path dari folder public/
  },
  generator: "xrecodz",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={<div>Loading...</div>}>
          <Providers>{children}</Providers>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
