import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sharext — AI Event Photo Retrieval Platform",
  description: "Find and share your event photos in seconds using AI facial recognition and vector similarity search.",
  icons: {
    icon: "/nextshare-logo-3d.png?v=3d",
    shortcut: "/nextshare-logo-3d.png?v=3d",
    apple: "/nextshare-logo-3d.png?v=3d",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-balimo">{children}</body>
    </html>
  );
}
