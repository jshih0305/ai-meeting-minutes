import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true }, // bcrypt 雜湊，不存明碼
    name: { type: String, default: "", trim: true },
    // 登出時 +1，舊的 JWT 版本號對不上就失效（JWT 本身無法撤銷，靠這個做伺服器端登出）
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User: Model<UserDoc> =
  mongoose.models.User ?? mongoose.model<UserDoc>("User", userSchema);
