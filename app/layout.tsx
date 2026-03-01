import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import BackButton from "@/components/navigation/BackButton"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const enableAnalytics = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true"

export const metadata: Metadata = {
  title: "AIConnecto",
  description: "Artificial Intelligence Based Coding Platform",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <BackButton />
        {children}
        {enableAnalytics ? <Analytics /> : null}
      </body>
    </html>
  )
}
