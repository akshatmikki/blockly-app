"use client";

export default function DeleteAccount() {
  const destroy = async () => {
    if (!confirm("This cannot be undone. Continue?")) return;

    await fetch("/api/auth/delete_self", { method: "DELETE" });
    window.location.href = "/login";
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4 text-red-600">
        Delete Account
      </h1>

      <button
        onClick={destroy}
        className="bg-red-600 text-white px-4 py-2 rounded w-full"
      >
        Permanently Delete My Account
      </button>
    </div>
  );
}
