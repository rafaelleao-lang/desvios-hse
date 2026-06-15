import type { InspecaoMaquina } from '@/types/maquinas'
import type { VitaSyncPayload, VitaRespostaPergunta } from './types'
import { VITA_FORM_POR_TIPO } from './forms'
import { VITA_OBRA_CONFIG, submitVitaForm } from './client'

function formatVitaDate(isoDate: string): string {
  return `${isoDate} 12:00`
}

export type VitaSyncResult =
  | { ok: true;  vitaId: string }
  | { ok: false; reason: string }

export async function syncInspecaoToVita(insp: InspecaoMaquina): Promise<VitaSyncResult> {
  if (insp.resultado !== 'aprovado') {
    return { ok: false, reason: 'inspeção não aprovada — sem sync' }
  }

  const tipo = insp.equipamento_tipo
  if (!tipo) {
    return { ok: false, reason: 'tipo de equipamento não informado' }
  }

  const form = VITA_FORM_POR_TIPO[tipo]
  if (!form) {
    return { ok: false, reason: `formulário VITA não configurado para tipo "${tipo}"` }
  }

  const obraConfig = VITA_OBRA_CONFIG[insp.obra_id]
  if (!obraConfig) {
    return { ok: false, reason: `obra "${insp.obra_nome ?? insp.obra_id}" não mapeada para VITA — adicione em VITA_OBRA_CONFIG` }
  }

  const respostas: VitaRespostaPergunta[] = form.perguntas.map(p => ({
    idpergunta_formulario:    p.idpergunta,
    idopcao_resposta:         p.idopcao_ok,
    txcaminho_foto:           [],
    plano_acao:               [],
    imagem_resposta_pergunta: [],
    isplano_acao_obrigatorio: false,
    isvinculado_matriz_risco: false,
    isobservacao_obrigatoria: false,
  }))

  const payload: VitaSyncPayload = {
    cdstatus_resposta_formulario:    'statusRespostaConcluido',
    idempresa:                        obraConfig.idempresa,
    idlocalizacao:                    obraConfig.idlocalizacao,
    responsavel_resposta_formulario:  [],
    idempregado_gestor:               obraConfig.idempregado_gestor,
    dtresposta_formulario:            formatVitaDate(insp.data_inspecao),
    idformulario_inspecao:            form.idformulario_inspecao,
    cdformulario_inspecao:            form.cdformulario_inspecao,
    txformulario_inspecao:            form.txformulario_inspecao,
    iddisciplina:                     form.iddisciplina,
    isrestrito_disciplina:            false,
    idtipo_inspecao:                  form.idtipo_inspecao,
    isutilizar_mobilizacao:           false,
    isativo:                          true,
    isobrigatorio_equipamento:        false,
    idoperador_alteracao:             obraConfig.idoperador_alteracao,
    resposta_pergunta_formulario:     respostas,
  }

  try {
    const result = await submitVitaForm(payload)
    return { ok: true, vitaId: result.id }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) }
  }
}
