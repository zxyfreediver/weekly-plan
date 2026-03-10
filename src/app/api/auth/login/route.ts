import { NextResponse } from "next/server";
import { z } from "zod";
import {
  SESSION_COOKIE_NAME,
  validateCredentials,
  AUTH_USERNAME,
} from "@/lib/auth";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = loginSchema.parse(json);

    const ok = validateCredentials(body.username, body.password);
    if (!ok) {
      return NextResponse.json(
        { error: "账号或密码不正确" },
        { status: 401 },
      );
    }

    const res = NextResponse.json({ ok: true, user: AUTH_USERNAME });
    res.cookies.set(SESSION_COOKIE_NAME, AUTH_USERNAME, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 天
    });
    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "登录失败，请稍后再试" },
      { status: 400 },
    );
  }
}

