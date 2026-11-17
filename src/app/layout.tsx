import type { Metadata } from "next";
import App from "@/components/app";
import "./globals.css";
export const metadata: Metadata = {
  title: "교냥픽 | 나에게 맞는 교양을 고르는 방법",
  description:
    "가능 시간과 성향으로 찾는 교양 추천. 1·2·3지망과 모의 경쟁률 리포트를 한곳에서 확인하세요.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body>
        <App />
        {children}
      </body>
    </html>
  );
}
