import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
// NotificationStack removed - migrated to sonner toast

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "笔境 AI - 智能网文创作平台",
  description: "AI 驱动的智能网文创作平台，从灵感到完稿，全流程辅助您的网文创作。12步智能引导、对话式设定构建、章节自动生成。",
  keywords: ["笔境AI", "网文创作", "AI写作", "小说生成", "网络小说", "创作平台"],
  authors: [{ name: "笔境 AI Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "笔境 AI - 智能网文创作平台",
    description: "AI 驱动的智能网文创作平台，全流程辅助您的网文创作。",
    siteName: "笔境 AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "笔境 AI - 智能网文创作平台",
    description: "AI 驱动的智能网文创作平台，全流程辅助您的网文创作。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
