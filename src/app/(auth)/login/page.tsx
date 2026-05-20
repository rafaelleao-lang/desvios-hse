'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, Eye, EyeOff, Loader2, AlertTriangle, HardHat } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('E-mail ou senha incorretos. Verifique suas credenciais.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col lg:flex-row">
      {/* Left panel — branding */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" />
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(245,158,11,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(245,158,11,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Glow orbs */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-amber-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-32 right-10 w-48 h-48 bg-amber-600/6 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-zinc-950" />
            </div>
            <span className="text-xl font-bold text-zinc-50">Desvios HSE</span>
          </div>

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-amber-400">Plataforma Enterprise HSE/SST</span>
            </div>

            <h1 className="text-5xl font-black text-zinc-50 leading-tight">
              Segurança em
              <br />
              <span className="text-amber-400">primeiro lugar.</span>
            </h1>

            <p className="text-lg text-zinc-400 leading-relaxed max-w-md">
              Gerencie desvios de segurança, acompanhe tratativas e proteja vidas
              com tecnologia de ponta nas suas obras.
            </p>
          </div>
        </div>

        {/* Stats bottom */}
        <div className="relative z-10 grid grid-cols-3 gap-6">
          {[
            { value: '99.9%', label: 'Uptime' },
            { value: '< 2s', label: 'Resposta' },
            { value: '100%', label: 'Mobile' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-black text-amber-400">{stat.value}</div>
              <div className="text-xs text-zinc-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Right panel — login form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex-1 flex items-center justify-center p-6 lg:p-12"
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-zinc-950" />
            </div>
            <span className="text-xl font-bold text-zinc-50">Desvios HSE</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-zinc-50">Bem-vindo de volta</h2>
            <p className="text-zinc-400 mt-2">Entre com suas credenciais para acessar o sistema</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full h-12 px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600
                  focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20
                  transition-all duration-200"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-12 px-4 pr-12 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600
                    focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20
                    transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold
                flex items-center justify-center gap-2 transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
                active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar no Sistema'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <HardHat className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Acesso Demo</span>
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => { setEmail('admin@demo.com'); setPassword('demo123456') }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <span className="text-xs text-zinc-500">Admin</span>
                <span className="block text-sm text-zinc-300">admin@demo.com</span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('tecnico@demo.com'); setPassword('demo123456') }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <span className="text-xs text-zinc-500">Técnico SST</span>
                <span className="block text-sm text-zinc-300">tecnico@demo.com</span>
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-zinc-600 mt-6">
            © {new Date().getFullYear()} Desvios HSE. Todos os direitos reservados.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
