"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, User } from "lucide-react";

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
};

export default function AddUserForm({ onSuccess, onCancel }: Props) {
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

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (username.length < 3 || username.includes(" ")) {
      setUsernameError("Username must be 3+ chars, no spaces");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

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
      alert(data.message || "Failed to create user");
      return;
    }

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
      <Input placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />

      <Input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
      {usernameError && <p className="text-red-500 text-sm">{usernameError}</p>}

      <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      {emailError && <p className="text-red-500 text-sm">{emailError}</p>}

      <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
      <Input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
      {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="button" onClick={onCancel} className="flex-1 bg-gray-200">
          Cancel
        </Button>
        <Button type="submit" className="flex-1 bg-blue-600" disabled={loading}>
          {loading ? "Creating..." : "Create User"}
        </Button>
      </div>
    </form>
  );
}
