import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "助教营销工具",
  description: "销售陪跑营销工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

