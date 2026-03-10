import { cookies } from "next/headers";

export const AUTH_USERNAME =
  process.env.AUTH_USERNAME && process.env.AUTH_USERNAME.length > 0
    ? process.env.AUTH_USERNAME
    : "zhaoxing";

export const AUTH_PASSWORD =
  process.env.AUTH_PASSWORD && process.env.AUTH_PASSWORD.length > 0
    ? process.env.AUTH_PASSWORD
    : "zhao19931209";

export const SESSION_COOKIE_NAME = "wj_session_user";

export function validateCredentials(username: string, password: string) {
  return username === AUTH_USERNAME && password === AUTH_PASSWORD;
}

export async function getCurrentUser(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}

