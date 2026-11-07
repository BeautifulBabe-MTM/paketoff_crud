import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";

const JWT_SECRET = process.env.ADMIN_JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("ADMIN_JWT_SECRET не указан в .env.local");
}

const secret = new TextEncoder().encode(JWT_SECRET);

const COOKIE_NAME = "admin_token";

export type AdminRole = "admin" | "manager";

export interface AuthUser {
  id: string;
  name: string;
  login: string;
  role: AdminRole;
}

export async function createToken(user: AuthUser) {
  return new SignJWT({
    name: user.name,
    login: user.login,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentAdmin(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    if (!payload.sub || typeof payload.sub !== "string") {
      return null;
    }

    await connectDB();

    const admin = await AdminUser.findById(payload.sub)
      .select("_id name login role isActive")
      .lean();

    if (!admin || !admin.isActive) {
      return null;
    }

    return {
      id: String(admin._id),
      name: admin.name,
      login: admin.login,
      role: admin.role as AdminRole,
    };
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const user = await getCurrentAdmin();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}

export async function requireRole(roles: AdminRole[]) {
  const user = await requireAdmin();

  if (!roles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}