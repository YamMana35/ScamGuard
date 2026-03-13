import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://scam-guard-umber.vercel.app"),
  title: 'ScamGuard - Free Phishing Detector for Links, Emails, Messages and Screenshots',
  description: 'ScamGuard is a free phishing detector that scans suspicious links, scam emails, fake SMS messages, and screenshots using AI-powered analysis.',
  generator: 'v0.app',
  applicationName: 'ScamGuard',
  keywords: [
    'phishing detector',
    'scam detector',
    'cybersecurity',
    'email scam checker',
    'sms scam detector',
    'fake link checker',
    'screenshot phishing detector',
    'online fraud protection',
    'ScamGuard',
  ],
  authors: [{ name: 'Yam Mana', url: 'https://scam-guard-umber.vercel.app' }],
  creator: 'Yam Mana',
  publisher: 'Yam Mana',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
  openGraph: {
    title: 'ScamGuard - Detect Phishing & Scams',
    description:
      'Analyze suspicious websites, scam emails, messages, and screenshots with ScamGuard.',
    url: 'https://scam-guard-umber.vercel.app',
    siteName: 'ScamGuard',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'ScamGuard logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ScamGuard - Detect Phishing & Scams',
    description:
      'Analyze suspicious websites, emails, messages, and screenshots with ScamGuard.',
    images: ['/logo.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
