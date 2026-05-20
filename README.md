# Desvios HSE — Plataforma de Gestão de Segurança

Plataforma corporativa enterprise para gestão de desvios HSE/SST em obras industriais e construtoras.

## Stack

- **Frontend**: Next.js 14 + React 18 + TypeScript
- **Estilização**: Tailwind CSS + Framer Motion + Shadcn/UI
- **Backend/DB**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Auth**: Supabase Auth
- **Gráficos**: Recharts
- **Deploy**: Vercel

## Início rápido

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
```

### 3. Configurar o banco Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Acesse **SQL Editor** no dashboard
3. Execute o arquivo `supabase/migrations/001_initial_schema.sql`
4. Isso cria todas as tabelas, índices, RLS e dados de demonstração

### 4. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

## Estrutura do Projeto

```
src/
├── app/
│   ├── (auth)/login/          # Página de login
│   └── (dashboard)/           # Área autenticada
│       ├── dashboard/          # Dashboard executivo
│       ├── desvios/            # Lista + Novo + Detalhe
│       ├── obras/              # Gestão de obras
│       └── relatorios/         # Geração de relatórios
├── components/
│   ├── ui/                     # Primitivos (Button, Card, Input...)
│   ├── layout/                 # Sidebar, Header, MobileNav
│   ├── dashboard/              # StatsCards, Charts, DesviosTable
│   └── desvios/                # Formulários, badges, upload de fotos
├── lib/
│   ├── supabase.ts             # Cliente Supabase (client-side)
│   ├── supabase-server.ts      # Cliente Supabase (server-side)
│   └── utils.ts                # Helpers, formatadores, configs
└── types/
    └── index.ts                # Todos os tipos TypeScript
```

## Funcionalidades

### Dashboard Executivo
- 9 cards de KPIs com animação e tendências
- 6 gráficos interativos (Recharts): donut, barras, linhas, ranking
- Atualização em tempo real
- Filtros por período

### Gestão de Desvios
- Formulário multi-step com validação (Zod + React Hook Form)
- Upload de fotos com abertura automática de câmera no celular
- Compressão automática de imagens
- Status workflow: Aberto → Em Tratativa → Pendente → Concluído → Fechado
- SLA visual com alertas de prazo
- Filtros avançados (obra, gravidade, status, encarregado, período)

### Notificações
- Alertas automáticos para responsáveis ao criar desvio crítico
- E-mail de lembrete de prazo vencido
- Histórico completo de status

### Relatórios
- PDF e Excel
- 6 tipos: Executivo, por Obra, por Encarregado, por Período, SLA, Reincidências

### Mobile-First
- Bottom navigation com FAB (+)
- Câmera integrada no upload
- Interface responsiva otimizada para obras
- PWA-ready

## Perfis de Acesso

| Perfil | Criar | Editar | Fechar | Admin |
|--------|-------|--------|--------|-------|
| Administrador | ✅ | ✅ | ✅ | ✅ |
| Engenheiro | ✅ | ✅ | ✅ | ❌ |
| Técnico SST | ✅ | ✅ | ❌ | ❌ |
| Supervisor | ✅ | ❌ | ❌ | ❌ |
| Encarregado | ❌ | ✅ (próprios) | ❌ | ❌ |
| Visualizador | ❌ | ❌ | ❌ | ❌ |

## Deploy no Vercel

```bash
npx vercel
```

Configure as variáveis de ambiente no painel do Vercel.

## Personalização

### Cores e Tema
Edite `tailwind.config.js` → cores `safety.*` e `globals.css` → variáveis CSS.

### Categorias de Desvio
Adicione/edite no `supabase/migrations/001_initial_schema.sql` ou diretamente na tabela `categorias_desvio`.

### Notificações por E-mail
Configure as variáveis SMTP no `.env.local` e implemente a função de envio em `src/lib/email.ts`.
