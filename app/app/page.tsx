import type { Metadata } from "next";
import AppShell from "@/app/components/app-shell";

export const metadata: Metadata = { title: "我的會議紀錄｜會記" };

// 工作台：沒登入的人會先被 proxy.ts 導到 /login
export default function AppPage() {
  return <AppShell />;
}
