import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Fraunces,
  Plus_Jakarta_Sans,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HeritageVoice AI — Local Heritage & Dialect Preserver",
  description:
    "An AI-powered digital archive for local languages, stories, traditions and cultural heritage.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${jakarta.variable} ${jetbrains.variable}`}
    >
      <body className="bg-[#FBF9F5] text-[#1E1B18] font-sans antialiased selection:bg-[#B84A27]/20 selection:text-[#1E1B18]">
        {children}
      </body>
    </html>
  );
}
