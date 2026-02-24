import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

const SALT_ROUNDS = 12;

export async function POST(req: Request) {
  try {
    const { email, password, username, firstName, lastName } = await req.json();

    if (!email || !password || !username || !firstName || !lastName) {
      return NextResponse.json(
        { message: "Email, username, password, first name, and last name are required" },
        { status: 400 }
      );
    }

    // Check if user already exists (only check active users, not soft-deleted)
    const existingUser = await pool.query(
      `
      SELECT "UserId", "IsActive", "DeletedAt"
      FROM "Identity"."Users"
      WHERE ("Email" = $1 OR "Username" = $2)
      `,
      [email, username]
    );

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    let result;

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];

      // If user is soft-deleted, reactivate them with new details
      if (!user.IsActive || user.DeletedAt) {
        result = await pool.query(
          `
          UPDATE "Identity"."Users"
          SET
            "Email" = $1,
            "Username" = $2,
            "PasswordHash" = $3,
            "PlainPassword" = $4,
            "FirstName" = $5,
            "LastName" = $6,
            "IsActive" = TRUE,
            "DeletedAt" = NULL,
            "CreatedOn" = NOW()
          WHERE "UserId" = $7
          RETURNING "UserId", "Email", "Username", "FirstName", "LastName", "CreatedOn"
          `,
          [email, username, passwordHash, password, firstName, lastName, user.UserId]
        );
      } else {
        // User is active and not deleted, cannot sign up again
        return NextResponse.json(
          { message: "Email or username already in use" },
          { status: 409 }
        );
      }
    } else {
      // Insert new user with FirstName and LastName
      result = await pool.query(
        `
        INSERT INTO "Identity"."Users"
          ("Email", "Username", "PasswordHash", "PlainPassword", "FirstName", "LastName", "Role", "IsActive")
        VALUES ($1, $2, $3, $4, $5, $6, 'user', TRUE)
        RETURNING "UserId", "Email", "Username", "FirstName", "LastName", "CreatedOn"
        `,
        [email, username, passwordHash, password, firstName, lastName]
      );
    }

    return NextResponse.json(
      {
        message: "Signup successful",
        user: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
