import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) throw new Error("UNAUTHORIZED");

  const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET!
  ) as { userId: number; role: string };

  if (decoded.role?.toLowerCase() !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return decoded;
}
