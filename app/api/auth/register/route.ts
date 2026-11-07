import bcrypt from "bcryptjs";
import { startSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { checkCredentials, readJson } from "@/lib/validation";

// POST /api/auth/register  { email, password, name? } → 建立帳號並直接登入
export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return Response.json({ error: "請用 JSON 格式送出" }, { status: 400 });

  const invalid = checkCredentials(body.email, body.password);
  if (invalid) return Response.json({ error: invalid }, { status: 400 });

  const email = String(body.email).trim().toLowerCase();
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 50) : "";

  await connectDB();
  if (await User.exists({ email })) {
    return Response.json({ error: "這個 Email 已經註冊過了" }, { status: 409 });
  }
  try {
    const user = await User.create({
      email,
      name,
      passwordHash: await bcrypt.hash(String(body.password), 12),
    });
    await startSession(user);
    return Response.json({ user: { email: user.email, name: user.name } }, { status: 201 });
  } catch (e) {
    // 兩個請求同時註冊同一個 Email 時，unique 索引會擋下第二個
    if ((e as { code?: number }).code === 11000) {
      return Response.json({ error: "這個 Email 已經註冊過了" }, { status: 409 });
    }
    throw e;
  }
}
