import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "./providers";
import { VantaBackground } from "@/components/layout/VantaBackground";
import styles from "./layout.module.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "variable",
});

export const metadata: Metadata = {
  title: "Shelby Scribe",
  description: "Independent research and market intelligence, secured on Aptos.",
  icons: {
    icon: [
      { url: "/images/shelby-icon-on-light.svg", type: "image/svg+xml" },
      { url: "/images/shelby-icon-on-light.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/images/shelby-icon-on-dark.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
    ],
    shortcut: [{ url: "/images/shelby-icon-on-light.svg", type: "image/svg+xml" }],
  },
};

const themeScript = `(function(){try{var t=localStorage.getItem('shelby-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} ${styles.root}`}
    >
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className={styles.body}>
        <VantaBackground />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
