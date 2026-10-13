import type { Metadata, Viewport } from "next";
import { DM_Mono, Manrope, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { siteDescription, siteKeywords, siteName, siteTagline, siteUrl } from "@/lib/seo";
import { getCurrentSession } from "@/server/auth/session";
import { InactivityLogout } from "@/components/auth/inactivity-logout";
import { MessageNotifications } from "@/components/notifications/message-notifications";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const defaultTitle = `${siteName} | COD4 servers, mods and support`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: siteKeywords,
  applicationName: siteName,
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  category: "shopping",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_LK",
    url: "/",
    siteName,
    title: defaultTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    shortcut: ["/icon.png"],
    apple: [{ url: "/icon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#171717",
  colorScheme: "light",
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
      logo: `${siteUrl}/logo.png`,
      description: siteDescription,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@ceylonhosting.com",
        availableLanguage: ["en", "si", "ta"],
      },
    },
    {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
      description: siteTagline,
    },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const currentSession = await getCurrentSession();

  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        manrope.variable,
        dmMono.variable,
        "font-sans",
        geist.variable,
      )}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        <InactivityLogout enabled={Boolean(currentSession && !currentSession.rememberMe)} />
        <MessageNotifications enabled={Boolean(currentSession)} />
        {children}
      </body>
    </html>
  );
}
