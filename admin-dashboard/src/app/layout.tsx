import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { supabase } from "@/lib/supabase";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const { data } = await supabase
      .from("ticker_settings")
      .select("meta_title, meta_description, meta_image")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const title = data?.meta_title || "FIFA World Cup 2026 Streaming Platform";
    const description = data?.meta_description || "Live sports streams, matches schedules, team databases, and earnings scripts.";
    const imageUrl = data?.meta_image || null;

    return {
      title,
      description,
      referrer: "no-referrer",
      openGraph: {
        title,
        description,
        ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        ...(imageUrl ? { images: [imageUrl] } : {}),
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "FIFA World Cup 2026 Streaming Platform",
      description: "Live sports streams, matches schedules, team databases, and earnings scripts.",
      referrer: "no-referrer",
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col bg-background text-foreground antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
