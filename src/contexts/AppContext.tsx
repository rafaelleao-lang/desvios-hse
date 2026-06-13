'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { obrasDB, tstsDB, encarregadosDB, coordenadoresDB, desviosDB, inspecoesDB, computeDesvio } from '@/lib/db'
import type { Obra, TST, Encarregado, Coordenador, Desvio, DesvioComputado, Inspecao } from '@/types'

interface AppState {
  obras: Obra[]
  tsts: TST[]
  encarregados: Encarregado[]
  coordenadores: Coordenador[]
  desvios: Desvio[]
  desviosComputados: DesvioComputado[]
  inspecoes: Inspecao[]
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
  const [inspecoes, setInspecoes] = useState<Inspecao[]>([])
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const [o, t, e, c, d, i] = await Promise.all([
      obrasDB.list().catch(err => { console.error('[AppContext] obras:', err); return [] as Obra[] }),
      tstsDB.list().catch(err => { console.error('[AppContext] tsts:', err); return [] as TST[] }),
      encarregadosDB.list().catch(err => { console.error('[AppContext] encarregados:', err); return [] as Encarregado[] }),
      coordenadoresDB.list().catch(err => { console.error('[AppContext] coordenadores:', err); return [] as Coordenador[] }),
      desviosDB.list().catch(err => { console.error('[AppContext] desvios:', err); return [] as Desvio[] }),
      inspecoesDB.list().catch(err => { console.error('[AppContext] inspecoes:', err); return [] as Inspecao[] }),
    ])
    setObras(o)
    setTsts(t)
    setEncarregados(e)
    setCoordenadores(c)
    setDesvios(d)
    setInspecoes(i)
    setLoaded(true)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const desviosComputados = desvios.map(d => computeDesvio(d, obras, tsts, encarregados, coordenadores))

  return (
    <AppContext.Provider value={{ obras, tsts, encarregados, coordenadores, desvios, desviosComputados, inspecoes, loaded, refresh }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp fora do AppProvider')
  return ctx
}
