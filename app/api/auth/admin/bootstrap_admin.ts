import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const exists = await pool.query(
    `SELECT 1 FROM "Identity"."Users" WHERE "Role"='admin' LIMIT 1`
  );

  if (exists.rowCount > 0) {
    return NextResponse.json({ message: "Admin already exists" }, { status: 403 });
  }

  const { email, username, password } = await req.json();
  const hash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO "Identity"."Users"
     ("Email","Username","PasswordHash","Role")
     VALUES ($1,$2,$3,'admin')`,
    [email, username, hash]
  );

  return NextResponse.json({ message: "Admin created" });
}