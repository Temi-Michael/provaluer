// Shared admin API helpers.
// Centralises token handling so every admin page reacts to an expired session
// the same way instead of silently failing on a 401.

export const ADMIN_TOKEN_KEY = "provaluer_admin_token";
export const ADMIN_USER_KEY = "provaluer_admin_user";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function clearAdminSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
}

/** Thrown when the server rejects the admin token; callers can ignore it since
 *  adminFetch has already redirected to the login page. */
export class AdminUnauthorizedError extends Error {
  constructor() {
    super("Admin session expired");
    this.name = "AdminUnauthorizedError";
  }
}

/**
 * fetch() wrapper that attaches the admin bearer token and, on a 401,
 * clears the stale session and sends the user back to the login page.
 */
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();

  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    clearAdminSession();
    if (typeof window !== "undefined") {
      window.location.href = "/admin-login";
    }
    throw new AdminUnauthorizedError();
  }

  return res;
}

/**
 * Ends the admin session on the server (invalidating the stored session row)
 * before clearing local state. Always clears locally even if the call fails,
 * so a network error can't trap the user in a signed-in UI.
 */
export async function adminLogout() {
  const token = getAdminToken();
  if (token) {
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore — local session is cleared regardless.
    }
  }
  clearAdminSession();
}
