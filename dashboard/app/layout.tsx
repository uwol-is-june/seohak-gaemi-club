import type { Metadata } from "next";
import { Noto_Sans_KR, Geist_Mono } from "next/font/google";
import "./globals.css";

// Toss Product Sans는 배포되지 않는 독점 폰트 → Noto Sans KR로 대체.
// 이전 Inter는 한글 글리프가 없어 한국어가 시스템 폰트로 폴백하고 있었다.
// (더 가까운 대체는 Pretendard지만 Google Fonts에 없어 별도 파일이 필요하다)
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "서학개미클럽",
  description: "미국 주식 가치투자 리서치 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 한컴(data-hwp-extension) 등 브라우저 확장이 <html>에 속성을 주입해 하이드레이션
    // 불일치가 뜬다. suppressHydrationWarning은 이 엘리먼트에만 적용된다.
    <html
      lang="ko"
      className={`${notoSansKr.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-canvas text-body">{children}</body>
    </html>
  );
}
