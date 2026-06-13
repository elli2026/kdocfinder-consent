import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "K-DocFinder Consent",
  description: "K-DocFinder 인터뷰 동의서",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
