import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "@/styles/globals.css";
import { VantaBackground } from "@/components/layout/VantaBackground";
import styles from "./layout.module.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "variable",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://shelbyscribe.vercel.app"),
  title: {
    default: "Shelby Scribe",
    template: "%s | Shelby Scribe",
  },
  description: "Independent research and market intelligence, stored on Shelby and settled on Aptos.",
  applicationName: "Shelby Scribe",
  openGraph: {
    type: "website",
    siteName: "Shelby Scribe",
    title: "Shelby Scribe",
    description: "Independent research and market intelligence, stored on Shelby and settled on Aptos.",
    url: "/",
    images: [{
      url: "/images/shelby-hero-panorama.jpg",
      width: 1920,
      height: 1080,
      alt: "Shelby Scribe research campus",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shelby Scribe",
    description: "Independent research and market intelligence, stored on Shelby and settled on Aptos.",
    images: ["/images/shelby-hero-panorama.jpg"],
  },
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

const materialSymbolsUrl = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded&icon_names=add,arrow_back,arrow_downward,arrow_forward,arrow_outward,arrow_upward,audio_file,check,check_circle,chevron_left,chevron_right,close,code,content_copy,dark_mode,delete,description,download,error,expand_more,favorite,file_upload,image,info,light_mode,link,lock,menu,mode_edit,monitoring,open_in_new,person,progress_activity,refresh,search,share,table,upload_file,video_file,warning&display=block'

const analyticsId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? 'G-YPQQTEZWGV'
const analyticsEnabled = process.env.VERCEL_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={materialSymbolsUrl} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={styles.body}>
        <VantaBackground />
        {children}
      </body>
      {analyticsEnabled && <GoogleAnalytics gaId={analyticsId} />}
    </html>
  );
}
