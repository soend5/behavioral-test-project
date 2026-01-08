import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { PRODUCT_NAME_CN, PRODUCT_TAGLINE_CN } from "@/lib/ui-copy";

export const metadata: Metadata = {
  title: PRODUCT_NAME_CN,
  description: PRODUCT_TAGLINE_CN,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

