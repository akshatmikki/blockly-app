import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "local";

  // 🔒 ADMIN RESET PASSWORD RATE LIMIT
  if (!rateLimit(`admin-reset-password:${ip}`, 10, 60_000)) {
    return NextResponse.json(
      { message: "Rate limited" },
      { status: 429 }
    );
  }

  requireAdmin();

  const { userId, newPassword } = await req.json();

  const hash = await bcrypt.hash(newPassword, 12);

  await pool.query(
    `
    UPDATE "Identity"."Users"
    SET "PasswordHash" = $1
    WHERE "UserId" = $2
    `,
    [hash, userId]
  );

  return NextResponse.json({ message: "Password reset" });
}
