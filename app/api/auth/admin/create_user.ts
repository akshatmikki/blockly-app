import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

export async function POST(req: Request) {
  requireAdmin();

  const { email, username, password } = await req.json();
  const hash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO "Identity"."Users"
     ("Email","Username","PasswordHash","Role")
     VALUES ($1,$2,$3,'user')`,
    [email, username, hash]
  );

  return NextResponse.json({ message: "User created" });
}
