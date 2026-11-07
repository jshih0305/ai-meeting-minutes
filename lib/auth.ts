import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE, signToken, verifyToken } from "@/lib/jwt";
import { User } from "@/lib/models/User";

// 只在伺服器使用（route handler）

export type SessionUser = { userId: string; email: string; name: string };

/** 登入成功：簽 JWT 放進 httpOnly cookie */
export async function startSession(user: { _id: unknown; email: string; tokenVersion?: number | null }) {
  const token = await signToken({
    userId: String(user._id),
    email: user.email,
    ver: user.tokenVersion ?? 0,
  });
  (await cookies()).set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true, // 前端 JS 讀不到，防 XSS 偷 token
    secure: process.env.NODE_ENV === "production", // 正式環境只走 HTTPS
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * 取得目前登入的使用者；未登入或憑證失效回傳 null。
 * 除了驗 JWT 簽章，還會到資料庫確認帳號還在、且沒有因為登出而作廢。
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const payload = await verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  await connectDB();
  const user = await User.findById(payload.userId, { email: 1, name: 1, tokenVersion: 1 }).lean();
  if (!user || (user.tokenVersion ?? 0) !== payload.ver) return null;
  return { userId: payload.userId, email: user.email, name: user.name ?? "" };
}

/** 登出：讓這個帳號所有已發出的 token 失效，並清掉 cookie */
export async function endSession() {
  const store = await cookies();
  const payload = await verifyToken(store.get(SESSION_COOKIE)?.value);
  if (payload) {
    await connectDB();
    await User.updateOne({ _id: payload.userId }, { $inc: { tokenVersion: 1 } });
  }
  store.delete(SESSION_COOKIE);
}

/** API 用：沒登入就回 401 */
export const unauthorized = () => Response.json({ error: "請先登入" }, { status: 401 });
