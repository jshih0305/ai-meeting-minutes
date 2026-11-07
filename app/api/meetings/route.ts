import { isValidObjectId } from "mongoose";
import { getSessionUser, unauthorized } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import type { MeetingListItem } from "@/lib/meetings";
import { Meeting, type MeetingDoc } from "@/lib/models/Meeting";

// GET /api/meetings?limit=20&before=<上一頁最後一筆的 id>
// 只回傳「目前登入的使用者」自己的會議紀錄，新到舊
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const params = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit")) || 20, 1), 50);
  const before = params.get("before");

  const filter: Record<string, unknown> = { userId: user.userId };
  // ObjectId 本身就照建立時間遞增，用它當游標分頁
  if (before && isValidObjectId(before)) filter._id = { $lt: before };

  await connectDB();
  const docs = await Meeting.find(filter, {
    title: 1,
    createdAt: 1,
    durationSec: 1,
    status: 1,
    "ai.summary": 1,
    "ai.actionItems": 1,
  })
    .sort({ _id: -1 })
    .limit(limit + 1) // 多抓一筆，判斷還有沒有下一頁
    .lean<
      (Pick<MeetingDoc, "title" | "durationSec" | "status" | "ai"> & { _id: unknown; createdAt: Date })[]
    >();

  const items: MeetingListItem[] = docs.slice(0, limit).map((m) => ({
    id: String(m._id),
    title: m.title,
    createdAt: m.createdAt.toISOString(),
    durationSec: m.durationSec ?? null,
    status: m.status,
    summary: m.ai?.summary ?? "",
    actionItemCount: m.ai?.actionItems?.length ?? 0,
  }));
  return Response.json({
    items,
    nextCursor: docs.length > limit ? items.at(-1)!.id : null,
  });
}
