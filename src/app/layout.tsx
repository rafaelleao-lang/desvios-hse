import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Desvios HSE | Gestão de Segurança',
    template: '%s | Desvios HSE',
  },
  description: 'Plataforma corporativa de gestão de desvios de segurança HSE/SST',
  keywords: ['HSE', 'SST', 'segurança', 'desvios', 'gestão', 'obras'],
  manifest: '/manifest.json',
  themeColor: '#09090B',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Desvios HSE',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#09090B',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-zinc-950 font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
