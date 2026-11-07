import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 中文字型檔很大，不預載，由 Google Fonts 依用到的字分段下載
const notoSans = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  weight: ["400", "500", "700"],
  preload: false,
});

const notoSerif = Noto_Serif_TC({
  variable: "--font-noto-serif-tc",
  weight: ["600", "900"],
  preload: false,
});

export const metadata: Metadata = {
  title: "會記 — AI 會議紀錄",
  description: "上傳會議錄音，自動產出逐字稿、摘要、重點與待辦事項。",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#12110f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-Hant"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSans.variable} ${notoSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
