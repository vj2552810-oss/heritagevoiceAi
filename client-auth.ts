"use client";

import type { User } from "@/db/schema";

export type SafeUser = Omit<User, "passwordHash">;

let memoryToken = "";
let memoryUser: SafeUser | null = null;

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  try {
    const match = document.cookie.match(
      new RegExp("(^| )" + name + "=([^;]+)")
    );
    return match ? decodeURIComponent(match[2]) : "";
  } catch {
    return "";
  }
}

export function saveClientSession(token: string, user: SafeUser): void {
  if (!token || !user) return;
  memoryToken = token;
  memoryUser = user;

  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem("hv_token", token);
    window.localStorage.setItem("hv_user_cache", JSON.stringify(user));
  } catch {
    // Ignore SecurityError in strict sandboxed iframes
  }

  try {
    window.sessionStorage.setItem("hv_token", token);
    window.sessionStorage.setItem("hv_user_cache", JSON.stringify(user));
  } catch {
    // Ignore SecurityError
  }

  try {
    const isSecure = window.location.protocol === "https:";
    const sameSite = isSecure
      ? "SameSite=None; Secure; Partitioned"
      : "SameSite=Lax";
    document.cookie = `hv_client_token=${encodeURIComponent(
      token
    )}; path=/; max-age=${60 * 60 * 24 * 30}; ${sameSite}`;
  } catch {
    // Ignore cookie error
  }

  try {
    window.name = JSON.stringify({
      __hv_auth: true,
      token,
      user,
    });
  } catch {
    // Ignore window.name error
  }
}

export function loadClientSession(): {
  token: string;
  user: SafeUser | null;
} {
  if (memoryToken && memoryUser) {
    return { token: memoryToken, user: memoryUser };
  }

  if (typeof window === "undefined") {
    return { token: "", user: null };
  }

  let foundToken = memoryToken || "";
  let foundUser: SafeUser | null = memoryUser;

  // 1. Check localStorage
  try {
    const lsToken = window.localStorage.getItem("hv_token");
    const lsUser = window.localStorage.getItem("hv_user_cache");
    if (lsToken && !foundToken) foundToken = lsToken;
    if (lsUser && !foundUser) foundUser = JSON.parse(lsUser) as SafeUser;
  } catch {
    // Ignore SecurityError
  }

  // 2. Check sessionStorage
  if (!foundToken || !foundUser) {
    try {
      const ssToken = window.sessionStorage.getItem("hv_token");
      const ssUser = window.sessionStorage.getItem("hv_user_cache");
      if (ssToken && !foundToken) foundToken = ssToken;
      if (ssUser && !foundUser) foundUser = JSON.parse(ssUser) as SafeUser;
    } catch {
      // Ignore SecurityError
    }
  }

  // 3. Check window.name (survives page navigation and reload inside cross-origin iframes)
  if (!foundToken || !foundUser) {
    try {
      if (window.name && window.name.startsWith("{")) {
        const parsed = JSON.parse(window.name);
        if (parsed && parsed.__hv_auth) {
          if (parsed.token && !foundToken) foundToken = String(parsed.token);
          if (parsed.user && !foundUser) foundUser = parsed.user as SafeUser;
        }
      }
    } catch {
      // Ignore parse error
    }
  }

  // 4. Check document.cookie
  if (!foundToken) {
    const cookieToken = readCookie("hv_client_token");
    if (cookieToken) foundToken = cookieToken;
  }

  if (foundToken) memoryToken = foundToken;
  if (foundUser) memoryUser = foundUser;

  return { token: foundToken, user: foundUser };
}

export function clearClientSession(): void {
  memoryToken = "";
  memoryUser = null;

  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem("hv_token");
    window.localStorage.removeItem("hv_user_cache");
  } catch {
    // Ignore
  }

  try {
    window.sessionStorage.removeItem("hv_token");
    window.sessionStorage.removeItem("hv_user_cache");
  } catch {
    // Ignore
  }

  try {
    const isSecure = window.location.protocol === "https:";
    const sameSite = isSecure
      ? "SameSite=None; Secure; Partitioned"
      : "SameSite=Lax";
    document.cookie = `hv_client_token=; path=/; max-age=0; ${sameSite}`;
  } catch {
    // Ignore
  }

  try {
    if (window.name && window.name.includes("__hv_auth")) {
      window.name = "";
    }
  } catch {
    // Ignore
  }
}

export function getAuthHeaders(
  extraHeaders: Record<string, string> = {},
  explicitToken?: string
): Record<string, string> {
  const { token } = loadClientSession();
  const activeToken = explicitToken || token;
  const headers: Record<string, string> = { ...extraHeaders };
  if (activeToken) {
    headers["Authorization"] = `Bearer ${activeToken}`;
    headers["x-hv-token"] = activeToken;
  }
  return headers;
}
