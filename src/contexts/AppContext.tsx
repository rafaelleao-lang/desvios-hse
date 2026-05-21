'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { obrasDB, tstsDB, encarregadosDB, desviosDB, computeDesvio } from '@/lib/db'
import type { Obra, TST, Encarregado, Desvio, DesvioComputado } from '@/types'

interface AppState {
  obras: Obra[]
  tsts: TST[]
  encarregados: Encarregado[]
  desvios: Desvio[]
  desviosComputados: DesvioComputado[]
  loaded: boolean
  refresh: () => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [obras, setObras] = useState<Obra[]>([])
  const [tsts, setTsts] = useState<TST[]>([])
  const [encarregados, setEncarregados] = useState<Encarregado[]>([])
  const [desvios, setDesvios] = useState<Desvio[]>([])
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const [o, t, e, d] = await Promise.all([
      obrasDB.list(),
      tstsDB.list(),
      encarregadosDB.list(),
      desviosDB.list(),
    ])
    setObras(o)
    setTsts(t)
    setEncarregados(e)
    setDesvios(d)
    setLoaded(true)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const desviosComputados = desvios.map(d => computeDesvio(d, obras, tsts, encarregados))

  return (
    <AppContext.Provider value={{ obras, tsts, encarregados, desvios, desviosComputados, loaded, refresh }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp fora do AppProvider')
  return ctx
}
