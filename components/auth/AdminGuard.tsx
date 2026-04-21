"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/auth/admin/users", {
          method: "GET",
          credentials: "include",
        });

        if (res.ok) {
          setIsAuthorized(true);
        } else {
          console.log("AdminGuard: Unauthorized access, redirecting...");
          router.push("/login");
        }
      } catch (err) {
        console.error("AdminGuard: Error checking auth:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    checkAdmin();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
