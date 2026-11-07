import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/jwt";

const AUTH_PAGES = ["/login", "/register"];
const PUBLIC_PAGES = ["/", ...AUTH_PAGES]; // 不用登入就能看的頁面
const APP_HOME = "/app";

// 頁面守門：沒登入的人導到登入頁；已登入的人直接進工作台，不用再看首頁和登入/註冊頁。
// 這裡只驗 JWT 簽章（不查資料庫），真正的權限檢查在每支 API 裡（會查資料庫確認沒登出）。
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const loggedIn = Boolean(await verifyToken(request.cookies.get(SESSION_COOKIE)?.value));

  if (!loggedIn && !PUBLIC_PAGES.includes(pathname)) {
    const url = new URL("/login", request.url);
    if (pathname !== APP_HOME) url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (loggedIn && PUBLIC_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL(APP_HOME, request.url));
  }
  return NextResponse.next();
}

export const config = {
  // API 不經過 proxy：每支 API 自己檢查登入；而且 proxy 會限制請求大小，錄音檔上傳會被截斷
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|ico)$).*)"],
};
