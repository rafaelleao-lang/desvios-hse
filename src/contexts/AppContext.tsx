'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { obrasDB, tstsDB, encarregadosDB, coordenadoresDB, desviosDB, computeDesvio } from '@/lib/db'
import type { Obra, TST, Encarregado, Coordenador, Desvio, DesvioComputado } from '@/types'

interface AppState {
  obras: Obra[]
  tsts: TST[]
  encarregados: Encarregado[]
  coordenadores: Coordenador[]
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
  const [coordenadores, setCoordenadores] = useState<Coordenador[]>([])
  const [desvios, setDesvios] = useState<Desvio[]>([])
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const [o, t, e, c, d] = await Promise.all([
      obrasDB.list(),
      tstsDB.list(),
      encarregadosDB.list(),
      coordenadoresDB.list(),
      desviosDB.list(),
    ])
    setObras(o)
    setTsts(t)
    setEncarregados(e)
    setCoordenadores(c)
    setDesvios(d)
    setLoaded(true)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const desviosComputados = desvios.map(d => computeDesvio(d, obras, tsts, encarregados, coordenadores))

  return (
    <AppContext.Provider value={{ obras, tsts, encarregados, coordenadores, desvios, desviosComputados, loaded, refresh }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp fora do AppProvider')
  return ctx
}
