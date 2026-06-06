'use client'

export default function ManualDesviosPage() {
  return (
    // Mobile:  100dvh - 64px (header) - 96px (pb-24 layout) = 160px deduzidos
    // Desktop: 100dvh - 64px (header) - 24px (lg:pb-6 layout) = 88px deduzidos
    <div className="-m-4 lg:-m-6 h-[calc(100dvh-160px)] lg:h-[calc(100dvh-88px)]">
      <iframe
        src="/manuais/manual-desvios.html"
        className="w-full h-full border-0"
        title="Manual de Desvios HSE"
      />
    </div>
  )
}
