"use client";

import { useState } from "react";

export default function BootstrapAdmin() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const submit = async () => {
    const res = await fetch("/api/auth/bootstrap_admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    });

    const data = await res.json();
    setMessage(data.message);

    if (res.ok) {
      window.location.href = "/login";
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Create Admin Account</h1>

      <input
        className="border p-2 w-full mb-2"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />

      <input
        className="border p-2 w-full mb-2"
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
      />

      <input
        type="password"
        className="border p-2 w-full mb-4"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      <button
        onClick={submit}
        className="bg-blue-600 text-white px-4 py-2 rounded w-full"
      >
        Create Admin
      </button>

      {message && <p className="mt-4 text-sm">{message}</p>}
    </div>
  );
}
