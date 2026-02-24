import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "local";

  // 🔒 ADMIN LOGIN / CREATION RATE LIMIT
  if (!rateLimit(`admin-login:${ip}`, 5, 60_000)) {
    return NextResponse.json(
      { message: "Rate limited" },
      { status: 429 }
    );
  }

  const existing = await pool.query(
    `SELECT 1 FROM "Identity"."Users" WHERE "Role" = 'admin' LIMIT 1`
  );

  if (existing.rowCount > 0) {
    return NextResponse.json(
      { message: "Admin already exists" },
      { status: 403 }
    );
  }

  const { email, username, password } = await req.json();

  const hash = await bcrypt.hash(password, 12);

  await pool.query(
    `
    INSERT INTO "Identity"."Users"
      ("Email","Username","PasswordHash","Role","IsActive")
    VALUES ($1,$2,$3,'admin',TRUE)
    `,
    [email, username, hash]
  );

  return NextResponse.json({ message: "Admin created" });
}
