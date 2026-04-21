"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!email || !password) {
    alert("Email and password required");
    return;
  }

  try {
    if (typeof window !== "undefined" && !window.electronAPI) {
      console.warn("Electron API not found. If you are in a web browser, some features will be unavailable.");
      alert("This feature is only available in the Desktop application.");
      return;
    }

    const result = await window.electronAPI.loginUser({
      email,
      password,
    });

    if (!result.success) {
      alert(result.message);
      return;
    }

    localStorage.setItem("userId", result.user.UserId);
    localStorage.setItem("userEmail", result.user.Email);

    router.push("/dashboard");
  } catch (err) {
    console.error("Login failed:", err);
    alert("Something went wrong");
  }
};

  const handleGoogleLogin = () => {
    localStorage.setItem("userEmail", "akshatsinghal0204@gmail.com");
    router.push("/dashboard");
  };

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
        <h1 className="text-2xl font-semibold text-center text-gray-800 mb-8">
          Login to Continue
        </h1>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>

          {/* Forgot password */}
          {/* <div className="text-right">
            <a
              href="/admin_login"
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot password?
            </a>
          </div> */}

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              type="submit"
              className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 cursor-pointer"
            >
              Login
            </Button>
            {/* <Button
              type="button"
              className="flex-1 h-12 bg-green-600 hover:bg-green-700 cursor-pointer"
            >
              Callback
            </Button> */}
          </div>
          {/* <p className="text-sm text-center text-gray-600 mt-6">
  Don't have an account already?{" "}
  <a href="/sign_up" className="text-orange-600 hover:underline">
    Sign up
  </a>
</p> */}
          {/* Divider */}
         
        </form>
      </div>
    </div>
  );
}
