import type { Metadata } from "next";
import { Playfair_Display, Source_Serif_4, JetBrains_Mono, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "BİTİG — Belgelerinizle Konuşun",
  description: "PDF belgelerinizi yükleyin, yapay zeka ile analiz edin ve akademik konularda anında cevap alın. Göktürkçe bir kelime: yazıt, kitabe, yazılı belge.",
  other: {
    google: "notranslate",
  },
};

import { Navbar } from "@/components/navbar";
import { AuthProvider } from "@/lib/auth-context";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" translate="no" suppressHydrationWarning className="overflow-x-hidden">
      <body
        className={`${playfair.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} ${cormorant.variable} antialiased overflow-x-hidden`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
