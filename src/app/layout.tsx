import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import type { LayoutProps } from "next/dist/shared/lib/app-router-context.shared-runtime";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://blogsphere.vercel.app",
  ),
  title: {
    default: "BlogSphere — Where Ideas Take Shape",
    template: "%s · BlogSphere",
  },
  description:
    "BlogSphere is a modern, collaborative blogging platform. Discover thought-provoking articles, share your perspective, and connect with a community of curious minds.",
  keywords: ["blog", "writing", "community", "articles", "publishing"],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "BlogSphere",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
