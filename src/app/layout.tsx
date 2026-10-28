import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { BottomNav, TopNav } from "@/components/app-shell/navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: { default: "Expenses", template: "%s · Expenses" },
  description: "Track spending without typing: snap a receipt or upload a bank dekont.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-dvh">
        <ThemeProvider>
          <TopNav />
          <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-6 md:pt-8 md:pb-12">
            {children}
          </main>
          <BottomNav />
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
