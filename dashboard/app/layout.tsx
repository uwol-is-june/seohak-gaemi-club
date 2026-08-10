import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

// Universal Sans는 xAI 독점 폰트 → Inter(가변)로 대체(디스플레이+본문).
// Geist Mono는 문서가 명시한 브랜드 동반 폰트 — 대문자 eyebrow/label 전용.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
    <html
      lang="ko"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-body">{children}</body>
    </html>
  );
}
