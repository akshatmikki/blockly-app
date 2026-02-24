import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const token = cookies().get("auth_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
  if (decoded.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { newPassword } = await req.json();
  const hash = await bcrypt.hash(newPassword, 12);

  await pool.query(
    `
    UPDATE "Identity"."Users"
    SET "PasswordHash" = $1
    WHERE "UserId" = $2
    `,
    [hash, decoded.userId]
  );

  // 🔔 EMAIL HOOK (stub)
  console.log(
    `ADMIN PASSWORD RESET ALERT → ${process.env.ADMIN_ALERT_EMAIL}`
  );

  return NextResponse.json({ message: "Admin password updated" });
}
