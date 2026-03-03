import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import { TRPCReactProvider } from "@/trpc/react";
import { Navigation } from "@/components/navigation";
import { Toaster } from "@/components/ui/sonner";

const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inventorizer - Inventory Tracking",
  description: "Track and manage fungible inventory items",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={jetbrainsMono.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} dark antialiased`}
      >
        <TRPCReactProvider>
          <div className="min-h-screen flex flex-col pb-25">
            <Navigation />
            <main className="flex-1">
              {children}
            </main>
          </div>
          <Toaster />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
