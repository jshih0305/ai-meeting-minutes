import { SignJWT, jwtVerify } from "jose";

// 只做 JWT 簽發與驗證，不碰資料庫，所以 proxy.ts 也能用

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 天

export type TokenPayload = { userId: string; email: string; ver: number };

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET 未設定或長度不足 32 字元");
  return new TextEncoder().encode(secret);
}

export async function signToken(p: TokenPayload): Promise<string> {
  return new SignJWT({ email: p.email, ver: p.ver })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

/** 只檢查簽章與期限；無效或過期回傳 null */
export async function verifyToken(token: string | undefined): Promise<TokenPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string" || typeof payload.ver !== "number") {
      return null;
    }
    return { userId: payload.sub, email: payload.email, ver: payload.ver };
  } catch {
    return null;
  }
}
