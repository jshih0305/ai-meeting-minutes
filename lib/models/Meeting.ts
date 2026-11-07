import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

// ---------- 逐字稿 ----------

/** 逐字稿的一段：誰、什麼時候、說了什麼（語音轉文字才會有，手動貼上的逐字稿可以沒有） */
const segmentSchema = new Schema(
  {
    speaker: { type: String, default: "" }, // 發言者，例如「主持人」或「Speaker 1」
    start: { type: Number }, // 開始秒數
    end: { type: Number }, // 結束秒數
    text: { type: String, required: true },
  },
  { _id: false },
);

// ---------- AI 整理結果 ----------

/** 待辦事項 */
const actionItemSchema = new Schema(
  {
    task: { type: String, required: true },
    owner: { type: String, default: "" }, // 負責人
    due: { type: String, default: "" }, // 期限原話，例如「下週三」
    dueDate: { type: Date }, // 換算成日期的期限（之後要做提醒時再填）
    done: { type: Boolean, default: false },
  },
  { _id: true }, // 保留 _id，之後才能單獨勾選完成
);

const aiResultSchema = new Schema(
  {
    summary: { type: String, default: "" }, // 會議摘要（一段話）
    keyPoints: { type: [String], default: [] }, // 討論重點
    decisions: { type: [String], default: [] }, // 會議決議
    actionItems: { type: [actionItemSchema], default: [] }, // 待辦事項
    openQuestions: { type: [String], default: [] }, // 尚未解決、下次要追的問題
    topics: { type: [String], default: [] }, // 主題標籤，方便之後搜尋分類
    aiModel: { type: String }, // 用哪個 AI 模型整理的（不叫 model，避免跟 mongoose 的 model 撞名）
    generatedAt: { type: Date },
  },
  { _id: false },
);

// ---------- 會議紀錄 ----------

/** 存在 Vercel Blob 的錄音檔。url 只給後端用，前端一律透過 /api/meetings/[id]/audio 播放 */
const audioSchema = new Schema(
  {
    url: { type: String, required: true },
    pathname: { type: String, required: true },
    contentType: { type: String, default: "" },
    size: { type: Number }, // bytes
    access: { type: String, enum: ["public", "private"], required: true },
  },
  { _id: false },
);

const meetingSchema = new Schema(
  {
    // 這筆會議紀錄屬於哪個使用者；所有查詢都要帶這個條件
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    meetingDate: { type: Date, default: Date.now }, // 會議日期時間
    participants: { type: [String], default: [] }, // 與會者
    language: { type: String, default: "zh-TW" },

    // 逐字稿從哪來：直接貼文字，或上傳錄音再轉文字
    source: { type: String, enum: ["text", "audio"], default: "text" },
    audioFileName: { type: String }, // 錄音檔原始檔名（source = audio 時）
    audio: { type: audioSchema }, // 存到 Vercel Blob 後的資訊
    durationSec: { type: Number }, // 會議長度（秒）
    transcribeModel: { type: String }, // 語音轉文字用的模型

    transcript: {
      text: { type: String, required: true }, // 完整逐字稿
      segments: { type: [segmentSchema], default: [] }, // 分段（有的話）
    },

    // AI 整理流程狀態
    status: {
      type: String,
      enum: ["pending", "processing", "done", "failed"],
      default: "pending",
    },
    error: { type: String }, // status = failed 時的錯誤訊息
    ai: { type: aiResultSchema }, // AI 整理完才會有

    tags: { type: [String], default: [] }, // 使用者自己加的標籤
  },
  { timestamps: true }, // 自動加 createdAt / updatedAt
);

// 歷史紀錄：某個使用者的會議，新到舊
meetingSchema.index({ userId: 1, createdAt: -1 });

export type MeetingDoc = InferSchemaType<typeof meetingSchema>;

export const Meeting: Model<MeetingDoc> =
  mongoose.models.Meeting ?? mongoose.model<MeetingDoc>("Meeting", meetingSchema);
