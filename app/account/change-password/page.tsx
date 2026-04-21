"use client";

import { useState } from "react";

export default function ChangePassword() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async () => {
    const res = await fetch("/api/auth/change_password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: password }),
    });

    const data = await res.json();
    setMsg(data.message);
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Change Password</h1>

      <input
        type="password"
        className="border p-2 w-full mb-4"
        placeholder="New password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      <button
        onClick={submit}
        className="bg-blue-600 text-white px-4 py-2 rounded w-full"
      >
        Update Password
      </button>

      {msg && <p className="mt-4">{msg}</p>}
    </div>
  );
}
