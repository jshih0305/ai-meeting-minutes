import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5-mini";

export type ActionItem = {
  task: string; // 要做什麼
  owner: string; // 負責人（逐字稿沒提到就空字串）
  due: string; // 期限，照會議裡講的寫，例如「下週三」「12/15」；沒提到就空字串
};

export type MeetingMinutes = {
  summary: string; // 會議摘要
  keyPoints: string[]; // 討論重點
  actionItems: ActionItem[]; // 待辦事項
  model: string;
};

// Structured Outputs：強制 AI 照這個格式回傳，欄位不會缺也不會多
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "keyPoints", "actionItems"],
  properties: {
    summary: { type: "string", description: "會議摘要，2~4 句" },
    keyPoints: {
      type: "array",
      description: "討論重點，每點一句",
      items: { type: "string" },
    },
    actionItems: {
      type: "array",
      description: "會議中明確提到要去做的事",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["task", "owner", "due"],
        properties: {
          task: { type: "string" },
          owner: { type: "string", description: "負責人；沒提到填空字串" },
          due: { type: "string", description: "期限，照原話寫；沒提到填空字串" },
        },
      },
    },
  },
} as const;

const SYSTEM_PROMPT = [
  "你是專業的會議記錄助理，使用繁體中文（台灣用語）。",
  "使用者會提供會議逐字稿，每行格式為「講者：內容」，講者可能只是代號（A、B…）。",
  "先判斷講者身分：如果某位講者被點名後，下一位講者接著回答，就可以確定那位講者是被點名的人（例如 A 問「小美，進度如何？」接著 B 回答，B 就是小美）。",
  "能確定名字的講者，在所有欄位都一律用名字稱呼，不要名字和代號混用；無法確定的才用代號。",
  "請整理成：",
  "1. summary：2~4 句說明這場會議在討論什麼、得出什麼結論。",
  "2. keyPoints：討論重點與決議（例如定下的日期、數字、方向），每點一句、具體寫出數字與日期，依重要性排序，3~8 點。",
  "3. actionItems：之後要有人去執行的具體工作，包括被指派的事、以及有人自己承諾要完成或交付的事（例如「我預計下週三可以交」就是一項待辦）。決議、目標、里程碑（例如「上線日訂在 12/15」）屬於 keyPoints，不要放進待辦。",
  "   owner 是負責人：只有被指派、或自己說要做的人才算，用上述規則決定的名字或代號；沒有明確負責人就填空字串，不要猜。",
  "   due 照原話寫（例如「下週三」），沒提到填空字串。沒有待辦就回傳空陣列。",
  "只根據逐字稿內容整理，不要自行補充或臆測沒提到的資訊。",
].join("\n");

export async function summarizeTranscript(transcript: string): Promise<MeetingMinutes> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: transcript },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "meeting_minutes", strict: true, schema: SCHEMA },
    },
  });

  const msg = completion.choices[0]?.message;
  if (msg?.refusal) throw new Error(`AI 拒絕整理：${msg.refusal}`);
  if (!msg?.content) throw new Error("AI 沒有回傳內容");
  const data = JSON.parse(msg.content) as Omit<MeetingMinutes, "model">;
  return { ...data, model: MODEL };
}
