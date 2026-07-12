import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ToastViewport } from "@/components/shared/toast-viewport";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "NepalYatra — Smart Travel Guide to Nepal", template: "%s · NepalYatra" },
  description:
    "Explore Nepal by district, city and destination. Travel guides, trip planning, weather and reviews — your complete Himalayan travel companion.",
  keywords: ["Nepal travel", "Kathmandu", "Pokhara", "Everest", "trekking", "travel guide"],
  openGraph: { title: "NepalYatra", description: "Your smart guide to Nepal.", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="font-sans antialiased">
        {/* Skip navigation — visually hidden until focused, first tab stop on every page */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-xl focus:bg-brand-600 focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-600"
        >
          Skip to main content
        </a>
        <QueryProvider><AuthProvider>{children}</AuthProvider></QueryProvider>
        <ToastViewport />
      </body>
    </html>
  );
}
