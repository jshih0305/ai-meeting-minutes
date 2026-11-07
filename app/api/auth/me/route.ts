import { getSessionUser, unauthorized } from "@/lib/auth";

// GET /api/auth/me → 目前登入的使用者
export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  return Response.json({ user: { email: user.email, name: user.name } });
}
