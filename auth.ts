import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, authSessions, User } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "heritagevoice-ai-production-jwt-secret-2026-bca-project";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp: number;
}

export function signToken(payload: Omit<TokenPayload, "exp" | "iat">): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 24 * 30; // 30 days persistent session
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");
  const fullPayload: TokenPayload = { ...payload, iat, exp };
  const body = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signingInput = `${header}.${body}`;
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(signingInput)
    .digest("base64url");
  return `${signingInput}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    if (!token || typeof token !== "string") return null;
    const clean = token.trim();
    const parts = clean.split(".");

    // Standard 3-part JWT (header.payload.signature)
    if (parts.length === 3) {
      const [header, body, signature] = parts;
      const signingInput = `${header}.${body}`;
      const expectedSig = crypto
        .createHmac("sha256", JWT_SECRET)
        .update(signingInput)
        .digest("base64url");

      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expectedSig);
      if (
        sigBuf.length !== expBuf.length ||
        !crypto.timingSafeEqual(sigBuf, expBuf)
      ) {
        return null;
      }

      const payload = JSON.parse(
        Buffer.from(body, "base64url").toString("utf-8")
      ) as TokenPayload;
      if (payload.exp < Math.floor(Date.now() / 1000)) return null;
      return payload;
    }

    // Legacy 2-part token fallback (payload.signature)
    if (parts.length === 2) {
      const [data, signature] = parts;
      const expectedSig = crypto
        .createHmac("sha256", JWT_SECRET)
        .update(data)
        .digest("base64url");
      if (signature !== expectedSig) return null;
      const payload = JSON.parse(
        Buffer.from(data, "base64url").toString("utf-8")
      ) as TokenPayload;
      if (payload.exp < Math.floor(Date.now() / 1000)) return null;
      return payload;
    }

    return null;
  } catch {
    return null;
  }
}

export function isHttpsRequest(req?: Request): boolean {
  if (!req) return false;
  const forwardedProto = req.headers.get("x-forwarded-proto") || "";
  if (forwardedProto.toLowerCase().includes("https")) return true;
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  if (origin.toLowerCase().startsWith("https://")) return true;
  if (req.url.toLowerCase().startsWith("https://")) return true;
  return false;
}

export function setAuthCookies(
  res: NextResponse,
  token: string,
  req?: Request
): void {
  const isHttps = isHttpsRequest(req);
  const maxAge = 60 * 60 * 24 * 30; // 30 days

  res.cookies.set("hv_token", token, {
    httpOnly: true,
    path: "/",
    maxAge,
    sameSite: isHttps ? "none" : "lax",
    secure: isHttps,
    ...(isHttps ? { partitioned: true } : {}),
  });

  res.cookies.set("hv_client_token", token, {
    httpOnly: false,
    path: "/",
    maxAge,
    sameSite: isHttps ? "none" : "lax",
    secure: isHttps,
    ...(isHttps ? { partitioned: true } : {}),
  });
}

export function clearAuthCookies(res: NextResponse, req?: Request): void {
  const isHttps = isHttpsRequest(req);

  res.cookies.set("hv_token", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: isHttps ? "none" : "lax",
    secure: isHttps,
  });

  res.cookies.set("hv_client_token", "", {
    httpOnly: false,
    path: "/",
    maxAge: 0,
    sameSite: isHttps ? "none" : "lax",
    secure: isHttps,
  });
}

export async function persistServerSession(
  token: string,
  userId: number,
  req?: Request
): Promise<void> {
  try {
    const ua = req?.headers.get("user-agent") || "browser";
    // Clear older sessions so the most recent active session on this sandbox is unambiguous
    await db.delete(authSessions);
    await db.insert(authSessions).values({
      token,
      userId,
      userAgent: ua.slice(0, 250),
    });
  } catch (err) {
    console.error("persistServerSession error:", err);
  }
}

export async function clearServerSession(): Promise<void> {
  try {
    await db.delete(authSessions);
  } catch (err) {
    console.error("clearServerSession error:", err);
  }
}

export async function getAuthSession(req?: Request): Promise<{
  user: Omit<User, "passwordHash"> | null;
  token: string | null;
}> {
  try {
    let candidateToken: string | undefined;

    // 1. Check Authorization header or custom x-hv-token header
    if (req) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const extracted = authHeader.slice(7).trim();
        if (extracted && extracted !== "null" && extracted !== "undefined") {
          candidateToken = extracted;
        }
      }
      if (!candidateToken) {
        const customHeader = req.headers.get("x-hv-token")?.trim();
        if (
          customHeader &&
          customHeader !== "null" &&
          customHeader !== "undefined"
        ) {
          candidateToken = customHeader;
        }
      }
    }

    // 2. Check HTTP cookies
    if (!candidateToken) {
      try {
        const cookieStore = await cookies();
        candidateToken =
          cookieStore.get("hv_token")?.value ||
          cookieStore.get("hv_client_token")?.value;
      } catch {
        // cookies() may not be available outside request context
      }
    }

    // Verify token if found from header or cookie
    if (candidateToken) {
      const payload = verifyToken(candidateToken);
      if (payload) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, payload.userId))
          .limit(1);

        if (user) {
          const { passwordHash: _removed, ...safeUser } = user;
          return { user: safeUser, token: candidateToken };
        }
      }
    }

    // 3. Check PostgreSQL persistent session store (fallback when iframe third-party cookies/storage are blocked on refresh)
    const [latestSession] = await db
      .select()
      .from(authSessions)
      .orderBy(desc(authSessions.createdAt))
      .limit(1);

    if (latestSession && latestSession.token) {
      const payload = verifyToken(latestSession.token);
      if (payload) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, payload.userId))
          .limit(1);

        if (user) {
          const { passwordHash: _removed, ...safeUser } = user;
          return { user: safeUser, token: latestSession.token };
        }
      }
    }

    return { user: null, token: null };
  } catch (err) {
    console.error("getAuthSession error:", err);
    return { user: null, token: null };
  }
}

export async function getAuthUser(
  req?: Request
): Promise<Omit<User, "passwordHash"> | null> {
  const { user } = await getAuthSession(req);
  return user;
}
