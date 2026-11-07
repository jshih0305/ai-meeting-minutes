import { getSessionUser, unauthorized } from "@/lib/auth";
import { findOwnMeeting, toDetail } from "@/lib/meetings";

// GET /api/meetings/:id → 一筆完整會議紀錄（只能看自己的）
export async function GET(_req: Request, ctx: RouteContext<"/api/meetings/[id]">) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const meeting = await findOwnMeeting(user.userId, (await ctx.params).id);
  if (!meeting) return Response.json({ error: "找不到這筆會議紀錄" }, { status: 404 });
  return Response.json(toDetail(meeting));
}
