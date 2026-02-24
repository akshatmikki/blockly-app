import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ip =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "local";

  if (!rateLimit(`admin-reset-password:${ip}`, 10, 60_000)) {
    return NextResponse.json(
      { message: "Rate limited" },
      { status: 429 }
    );
  }

  try {
    await requireAdmin();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }

  const { userId } = await params;
  const { password } = await req.json();

  if (!password || password.length < 6) {
    return NextResponse.json(
      { message: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  // Hash the password
  const hash = await bcrypt.hash(password, 12);

  // Update PasswordHash and PlainPassword (if column exists)
  try {
    await pool.query(
      `UPDATE "Identity"."Users"
       SET "PasswordHash" = $1, "PlainPassword" = $2
       WHERE "UserId" = $3`,
      [hash, password, userId]
    );
  } catch (error: any) {
    // If PlainPassword column doesn't exist, just update PasswordHash
    if (error.message?.includes('column "PlainPassword" does not exist')) {
      await pool.query(
        `UPDATE "Identity"."Users"
         SET "PasswordHash" = $1
         WHERE "UserId" = $2`,
        [hash, userId]
      );
    } else {
      throw error;
    }
  }

  return NextResponse.json({ message: "Password reset successfully" });
}
