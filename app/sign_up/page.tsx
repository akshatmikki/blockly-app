"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, User } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [loading, setLoading] = useState(false);

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    // Validate username
    if (username.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return;
    }

    if (username.includes(' ')) {
      setUsernameError("Username cannot contain spaces");
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    setPasswordError("");
    setEmailError("");
    setUsernameError("");
    setLoading(true);

    const res = await fetch("/api/auth/sign_up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        username,
        password,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.message || "Signup failed");
      return;
    }

    // Optional: auto-login UX
    localStorage.setItem("userId", data.user.UserId);
    localStorage.setItem("userEmail", data.user.Email);

    router.push("/dashboard");
  };

  return (
 <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-orange-100">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/images/logo.jpg"
            alt="AICONNECTO"
            width={220}
            height={60}
            className="object-contain rounded-lg"
          />
        </div>



        <h1 className="text-2xl font-semibold text-center text-gray-800 mb-8">
          Create an Account
        </h1>

        <form onSubmit={handleSignup} className="space-y-5">
          {/* First Name */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              First Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Enter your first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>

          {/* Last Name */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Last Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Enter your last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Choose a username (min 3 characters, no spaces)"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  // Real-time validation
                  if (e.target.value.length > 0 && e.target.value.length < 3) {
                    setUsernameError("Username must be at least 3 characters");
                  } else if (e.target.value.includes(' ')) {
                    setUsernameError("Username cannot contain spaces");
                  } else {
                    setUsernameError("");
                  }
                }}
                className="pl-10 h-12"
                required
              />
            </div>
            {usernameError && (
              <p className="text-red-500 text-sm mt-1">{usernameError}</p>
            )}
          </div>

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
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Real-time validation
                  if (e.target.value.length > 0 && !validateEmail(e.target.value)) {
                    setEmailError("Please enter a valid email address");
                  } else {
                    setEmailError("");
                  }
                }}
                className="pl-10 h-12"
                required
              />
            </div>
            {emailError && (
              <p className="text-red-500 text-sm mt-1">{emailError}</p>
            )}
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
                placeholder="Create a password (min 6 characters)"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  // Real-time validation
                  if (confirmPassword && e.target.value !== confirmPassword) {
                    setPasswordError("Passwords do not match");
                  } else {
                    setPasswordError("");
                  }
                }}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  // Real-time validation
                  if (password && e.target.value !== password) {
                    setPasswordError("Passwords do not match");
                  } else {
                    setPasswordError("");
                  }
                }}
                className="pl-10 h-12"
                required
              />
            </div>
            {passwordError && (
              <p className="text-red-500 text-sm mt-1">{passwordError}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 cursor-pointer"
            disabled={loading || !!passwordError || !!emailError || !!usernameError || !password || !confirmPassword || !email || !username || !firstName || !lastName}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </Button>

          <p className="text-sm text-center text-gray-600">
            Already have an account?{" "}
            <a href="/login" className="text-blue-600 hover:underline">
              Login
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
