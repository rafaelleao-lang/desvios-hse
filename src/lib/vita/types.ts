export interface VitaAuthResponse {
  auth: boolean
  token: string
  expiresIn: number
  empresas: Array<{ idempresa: string; nome: string }>
}

export interface VitaRespostaPergunta {
  idpergunta_formulario: string
  idopcao_resposta: string
  txcaminho_foto: unknown[]
  plano_acao: unknown[]
  imagem_resposta_pergunta: unknown[]
  isplano_acao_obrigatorio: boolean
  isvinculado_matriz_risco: boolean
  isobservacao_obrigatoria: boolean
}

export interface VitaSyncPayload {
  cdstatus_resposta_formulario: 'statusRespostaConcluido'
  idempresa: string
  idlocalizacao: string
  responsavel_resposta_formulario: unknown[]
  idempregado_gestor: string
  dtresposta_formulario: string
  idformulario_inspecao: string
  cdformulario_inspecao: string
  txformulario_inspecao: string
  iddisciplina: string
  isrestrito_disciplina: boolean
  idtipo_inspecao: string
  isutilizar_mobilizacao: boolean
  isativo: boolean
  isobrigatorio_equipamento: boolean
  idoperador_alteracao: string
  resposta_pergunta_formulario: VitaRespostaPergunta[]
}

export interface VitaFormConfig {
  idformulario_inspecao: string
  cdformulario_inspecao: string
  txformulario_inspecao: string
  idtipo_inspecao: string
  iddisciplina: string
  perguntas: Array<{ idpergunta: string; idopcao_ok: string }>
}

export interface VitaObraConfig {
  idempresa: string
  idlocalizacao: string
  idempregado_gestor: string
  idoperador_alteracao: string
}
