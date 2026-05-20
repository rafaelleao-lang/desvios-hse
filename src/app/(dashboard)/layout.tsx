'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'
import { AppProvider } from '@/contexts/AppContext'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <AppProvider>
      <div className="min-h-screen bg-zinc-950">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="lg:pl-[260px] pt-16 pb-24 lg:pb-6 min-h-screen">
          <div className="p-4 lg:p-6 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
    </AppProvider>
  )
}
