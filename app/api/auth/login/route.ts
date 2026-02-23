import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "@/lib/sqlite";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {

  // 🔒 Rate limit
  const ip =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "local";

  if (!rateLimit(`login:${ip}`, 5, 60_000)) {
    return NextResponse.json(
      { message: "Too many login attempts" },
      { status: 429 }
    );
  }

  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { message: "Email and password required" },
      { status: 400 }
    );
  }

  // 🧠 SQLite query (sync)
  const user = db.prepare(`
    SELECT 
      UserId,
      Email,
      PasswordHash,
      Role,
      IsActive
    FROM users
    WHERE Email = ?
      AND DeletedAt IS NULL
  `).get(email);

  if (!user) {
    return NextResponse.json(
      { message: "Invalid email or password" },
      { status: 401 }
    );
  }

  if (!user.IsActive) {
    return NextResponse.json(
      { message: "Account disabled" },
      { status: 403 }
    );
  }

  const ok = await bcrypt.compare(password, user.PasswordHash);

  if (!ok) {
    return NextResponse.json(
      { message: "Invalid email or password" },
      { status: 401 }
    );
  }

  const token = jwt.sign(
    { userId: user.UserId, role: user.Role },
    process.env.JWT_SECRET || "offline_secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

  const res = NextResponse.json({
    message: "Login successful",
    user: {
      UserId: user.UserId,
      Email: user.Email,
      Role: user.Role,
    },
  });

  res.cookies.set("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  });

  return res;
}