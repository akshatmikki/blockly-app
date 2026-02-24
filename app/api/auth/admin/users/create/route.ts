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

  // 🔒 ADMIN CREATE USER RATE LIMIT
  if (!rateLimit(`admin-create-user:${ip}`, 20, 60_000)) {
    return NextResponse.json(
      { message: "Rate limited" },
      { status: 429 }
    );
  }

  requireAdmin();

  const { email, username, password } = await req.json();

  const hash = await bcrypt.hash(password, 12);

  await pool.query(
    `
    INSERT INTO "Identity"."Users"
      ("Email","Username","PasswordHash","Role","IsActive")
    VALUES ($1,$2,$3,'user',TRUE)
    `,
    [email, username, hash]
  );

  return NextResponse.json({ message: "User created" });
}
