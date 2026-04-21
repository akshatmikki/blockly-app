"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type AdminState = "loading" | "not_exists" | "exists";

export default function AdminLoginPage() {
  const router = useRouter();

  const [adminState, setAdminState] = useState<AdminState>("loading");

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 CHECK ADMIN EXISTENCE (ONCE)
  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/auth/admin_exists");
        const data = await res.json();

        if (data.exists === true) {
          setAdminState("exists");
        } else {
          setAdminState("not_exists");
        }
      } catch {
        setError("Failed to check admin status");
      }
    }

    checkAdmin();
  }, []);

  async function handleSubmit() {
    setError("");
    setLoading(true);

    try {
      // 🔹 FIRST ADMIN CREATION
      if (adminState === "not_exists") {
        if (!email || !username || !password) {
          setError("Email, username and password are required");
          setLoading(false);
          return;
        }

        const createRes = await fetch("/api/auth/bootstrap_admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, username, password }),
        });

        const createData = await createRes.json();

        if (!createRes.ok) {
          setError(createData.message || "Failed to create admin");
          setLoading(false);
          return;
        }

        // admin now exists
        setAdminState("exists");
      }

      // 🔹 ADMIN LOGIN
      console.log("AdminLogin: Calling login API...");
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginRes.json();
      console.log("AdminLogin: Login response:", { ok: loginRes.ok, status: loginRes.status, data: loginData });

      if (!loginRes.ok) {
        setError(loginData.message || "Login failed");
        setLoading(false);
        return;
      }

      if (loginData.user?.Role !== "admin") {
        console.log("AdminLogin: User role is not admin:", loginData.user?.Role);
        setError("This account is not an admin");
        setLoading(false);
        return;
      }

      console.log("AdminLogin: Login successful, checking cookies...");
      console.log("AdminLogin: All cookies:", document.cookie);

      // Wait a moment for cookie to be set
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log("AdminLogin: Cookies after wait:", document.cookie);
      console.log("AdminLogin: Redirecting to /admin_dashboard");
      router.push("/admin_dashboard");
    } catch {
      setError("Unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  // 🔹 LOADING STATE
  if (adminState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50">
        <p className="text-xl text-gray-600">Checking admin status…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-orange-100">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/images/logo.jpg"
            alt="Logo"
            width={220}
            height={60}
            className="object-contain rounded-lg"
          />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-8">
          {adminState === "not_exists"
            ? "Create Admin Account"
            : "Admin Login"}
        </h2>

        {/* Email Input */}
        <input
          type="email"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />

        {/* Username (Only when creating first admin) */}
        {adminState === "not_exists" && (
          <input
            type="text"
            placeholder="Admin username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        )}

        {/* Password Input */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 mb-6 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Please wait…"
            : adminState === "not_exists"
            ? "Create Admin"
            : "Login as Admin"}
        </button>

        {/* Error Message */}
        {error && (
          <p className="mt-4 text-red-600 text-center font-medium">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
