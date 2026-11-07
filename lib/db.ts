import mongoose from "mongoose";

// 開發時熱重載、正式環境每個請求都共用同一條連線，避免連線數爆掉
const g = globalThis as typeof globalThis & { _mongoose?: Promise<typeof mongoose> };

export function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI 沒有設定，請檢查 .env.local");
  g._mongoose ??= mongoose.connect(uri).catch((e) => {
    g._mongoose = undefined; // 連線失敗就清掉，下一個請求可以重試
    throw e;
  });
  return g._mongoose;
}
