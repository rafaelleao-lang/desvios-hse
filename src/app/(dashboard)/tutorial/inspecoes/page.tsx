'use client'

export default function ManualInspecoesPage() {
  return (
    <div className="-m-4 lg:-m-6 -mt-4 lg:-mt-6" style={{ height: 'calc(100vh - 64px)' }}>
      <iframe
        src="/manuais/manual-inspecoes.html"
        className="w-full h-full border-0"
        title="Manual de Inspeções HSE"
      />
    </div>
  )
}
