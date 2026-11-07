import bcrypt from "bcryptjs";
import { startSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { readJson } from "@/lib/validation";

// 帳號不存在時也跑一次 bcrypt，讓回應時間一樣，避免被用來試探哪些 Email 有註冊
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

// POST /api/auth/login  { email, password }
export async function POST(request: Request) {
  const body = await readJson(request);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return Response.json({ error: "請輸入 Email 和密碼" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ email });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    return Response.json({ error: "Email 或密碼錯誤" }, { status: 401 });
  }

  await startSession(user);
  return Response.json({ user: { email: user.email, name: user.name } });
}
