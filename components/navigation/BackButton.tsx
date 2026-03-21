"use client"

import { ArrowLeft } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

const BACK_BUTTON_ROUTE_PREFIXES = [
  "/workspace",
  "/tutorials",
  "/account",
]

const HIDDEN_ROUTE_PREFIXES = [
  "/dashboard",
  "/admin_dashboard",
  "/admin_dashboard/bootstrap",
  "/admin_dashboard/reset-password",
]

function shouldShowBackButton(pathname: string) {
  const isHiddenPath = HIDDEN_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

  if (isHiddenPath) return false

  return BACK_BUTTON_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function getFallbackRoute(pathname: string) {
  if (pathname.startsWith("/admin_dashboard")) return "/admin_dashboard"
  return "/dashboard"
}

export default function BackButton() {
  const router = useRouter()
  const pathname = usePathname()

  if (!shouldShowBackButton(pathname)) {
    return null
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
      return
    }

    router.push(getFallbackRoute(pathname))
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="fixed left-4 top-4 z-40 inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-4 text-sm font-medium text-gray-800 shadow-lg backdrop-blur-sm transition hover:bg-white"
      aria-label="Go back"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  )
}
