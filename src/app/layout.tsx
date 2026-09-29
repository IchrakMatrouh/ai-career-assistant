import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Streaming AI Chat · FE-06",
  description:
    "Streaming AI chat interface built with Next.js 16, a custom SSE consumer, and GLM-4.6. Tokens arrive one at a time, stop works mid-stream, conversation state survives multiple turns.",
  keywords: [
    "AI chat",
    "streaming",
    "SSE",
    "Next.js",
    "GLM-4.6",
    "FE-06",
    "frontend AI",
  ],
  authors: [{ name: "FE-06 Capstone" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Streaming AI Chat · FE-06",
    description:
      "Token-by-token streaming, robust Stop button, multi-turn state, mobile-friendly input.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Streaming AI Chat · FE-06",
    description:
      "Token-by-token streaming, robust Stop button, multi-turn state, mobile-friendly input.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
