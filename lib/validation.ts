const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD = 8;

/** 讀 JSON body；格式錯誤回傳 null */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** 檢查 email / 密碼，回傳錯誤訊息或 null */
export function checkCredentials(email: unknown, password: unknown): string | null {
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) return "請輸入正確的 Email";
  if (typeof password !== "string" || password.length < MIN_PASSWORD) {
    return `密碼至少 ${MIN_PASSWORD} 個字元`;
  }
  if (password.length > 72) return "密碼最多 72 個字元"; // bcrypt 只看前 72 bytes
  return null;
}
