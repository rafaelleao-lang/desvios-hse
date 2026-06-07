/**
 * Script de migração única: atualiza obra_id nas tabelas do gestaoresiduos
 * para usar os mesmos IDs do módulo Obras do sistema MSE.
 *
 * O que faz:
 *  1. Lê as obras do gestaoresiduos (tabela legada)
 *  2. Lê as obras do banco desvios (MSE Obras)
 *  3. Faz match por nome (case-insensitive, trim)
 *  4. Remove os FK constraints de obra_id nas tabelas filhas
 *  5. Atualiza os obra_id em saldos, retiradas, solicitacoes, alertas_estoque
 *
 * Como rodar (uma única vez):
 *   npx tsx scripts/migrate-obras-residuos.ts
 *
 * Variáveis de ambiente necessárias: mesmas do .env.local
 */

import mysql from 'mysql2/promise'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function main() {
  const cfg = {
    host:     process.env.DB_HOST     || '127.0.0.1',
    port:     Number(process.env.DB_PORT || 3306),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  }

  const dbDesvios   = process.env.DB_NAME          || 'desvios'
  const dbResiduos  = process.env.DB_RESIDUOS_NAME || 'gestaoresiduos'

  console.log(`\nConectando em ${cfg.host}:${cfg.port}…`)
  const conn = await mysql.createConnection(cfg)

  // 1. Buscar obras legadas
  const [obrasLegadas] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT id, nome FROM \`${dbResiduos}\`.obras ORDER BY nome`
  )
  console.log(`\nObras no ${dbResiduos}: ${obrasLegadas.length}`)

  // 2. Buscar obras MSE
  const [obrasMSE] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT id, nome FROM \`${dbDesvios}\`.obras WHERE ativa = 1 ORDER BY nome`
  )
  console.log(`Obras no ${dbDesvios}: ${obrasMSE.length}`)

  // 3. Construir mapeamento por nome
  const mapa: Map<string, string> = new Map() // legado_id → mse_id
  const semMatch: string[] = []

  for (const legada of obrasLegadas) {
    const nomeNorm = (s: string) => s.toLowerCase().trim()
    const mse = obrasMSE.find(o => nomeNorm(o.nome) === nomeNorm(legada.nome))
    if (mse) {
      mapa.set(legada.id, mse.id)
      console.log(`  ✓ "${legada.nome}" → MSE id: ${mse.id}`)
    } else {
      semMatch.push(legada.nome)
      console.log(`  ✗ "${legada.nome}" — SEM correspondência no MSE`)
    }
  }

  if (semMatch.length > 0) {
    console.log(`\n⚠  ${semMatch.length} obras sem correspondência. Crie-as no módulo Obras do MSE antes de continuar.`)
    console.log('   Abortando.\n')
    await conn.end()
    process.exit(1)
  }

  console.log(`\nTodas as obras têm correspondência. Iniciando migração…`)

  // 4. Remover FK constraints nas tabelas filhas
  const tabelas: Array<{ table: string; fk: string }> = [
    { table: 'saldos',          fk: 'fk_saldo_obra' },
    { table: 'retiradas',       fk: 'fk_ret_obra'   },
    { table: 'solicitacoes',    fk: 'fk_sol_obra'   },
    { table: 'alertas_estoque', fk: 'fk_alt_obra'   },
  ]

  for (const { table, fk } of tabelas) {
    try {
      await conn.query(`ALTER TABLE \`${dbResiduos}\`.\`${table}\` DROP FOREIGN KEY \`${fk}\``)
      console.log(`  FK removida: ${table}.${fk}`)
    } catch {
      console.log(`  FK ${table}.${fk} já removida ou inexistente — ok`)
    }
  }

  // 5. Atualizar obra_ids
  for (const [legadoId, mseId] of mapa.entries()) {
    for (const { table } of tabelas) {
      const [res] = await conn.query<mysql.ResultSetHeader>(
        `UPDATE \`${dbResiduos}\`.\`${table}\` SET obra_id = ? WHERE obra_id = ?`,
        [mseId, legadoId]
      )
      if (res.affectedRows > 0) {
        console.log(`  ${table}: ${res.affectedRows} registro(s) atualizado(s)`)
      }
    }
  }

  console.log('\n✅ Migração concluída. O módulo Gestão de Resíduos agora usa os IDs do módulo Obras do MSE.\n')
  await conn.end()
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message)
  process.exit(1)
})
