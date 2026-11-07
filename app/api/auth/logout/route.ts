import { endSession } from "@/lib/auth";

// POST /api/auth/logout
export async function POST() {
  await endSession();
  return Response.json({ ok: true });
}
