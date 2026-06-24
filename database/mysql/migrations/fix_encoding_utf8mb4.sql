-- ============================================================
-- FIX: Corrige dados com encoding quebrado (caracteres ?? )
-- Causa: conexões sem charset: 'utf8mb4' gravaram acentos como ??
-- Rodar UMA VEZ no MySQL/phpMyAdmin/Workbench
-- ============================================================

SET NAMES utf8mb4;

-- ── res_tipos: nomes ──────────────────────────────────────────
UPDATE res_tipos SET nome = 'Não recicláveis'
  WHERE nome = 'N??o recicl??veis';

UPDATE res_tipos SET nome = 'RCC - aço com concreto'
  WHERE nome = 'RCC - a??o com concreto';

UPDATE res_tipos SET nome = 'Recicláveis - papel, plástico'
  WHERE nome = 'Recicl??veis - papel, pl??stico';

UPDATE res_tipos SET nome = 'Resíduos contaminados'
  WHERE nome = 'Res??duos contaminados';

UPDATE res_tipos SET nome = 'Resíduos de alvenaria - blocos, gesso, concreto'
  WHERE nome = 'Res??duos de alvenaria - blocos, gesso, concreto';

-- ── res_tipos: unidade_medida ────────────────────────────────
UPDATE res_tipos SET unidade_medida = 'Caçamba 5m³'
  WHERE unidade_medida = 'Ca??amba 5m??';

-- ── res_saldos: unidade_medida (copiado no momento do INSERT) ─
UPDATE res_saldos SET unidade_medida = 'Caçamba 5m³'
  WHERE unidade_medida = 'Ca??amba 5m??';

-- ── res_retiradas: unidade_medida ────────────────────────────
UPDATE res_retiradas SET unidade_medida = 'Caçamba 5m³'
  WHERE unidade_medida = 'Ca??amba 5m??';

-- ── obras ─────────────────────────────────────────────────────
UPDATE obras SET nome = 'NN - Eletromecânica AP'
  WHERE nome LIKE 'NN - Eletromec%nica AP'
    AND nome NOT LIKE 'NN - Eletromec_nica%';

-- ── encarregados ──────────────────────────────────────────────
UPDATE encarregados SET nome = 'João de Sousa Barroso'               WHERE nome = 'Jo??o de Sousa Barroso';
UPDATE encarregados SET nome = 'Josué Alves da Silva - Carol'        WHERE nome = 'Josu?? Alves da Silva - Carol';
UPDATE encarregados SET nome = 'Sebastião dos Santos - Carol'        WHERE nome = 'Sebasti??o dos Santos - Carol';
UPDATE encarregados SET nome = 'Heridanio Fabrício - Herson'         WHERE nome = 'Heridanio Fabr??cio - Herson';
UPDATE encarregados SET nome = 'Edenildo Gonçalves - José Lito'      WHERE nome = 'Edenildo Gon??alves - Jos?? Lito';
UPDATE encarregados SET nome = 'Ed Gonçalves - José Lito'            WHERE nome = 'Ed Gon??alves - Jos?? Lito';
UPDATE encarregados SET nome = 'Heider Dias - José Lito'             WHERE nome = 'Heider Dias - Jos?? Lito';
UPDATE encarregados SET nome = 'José dos Santos - Heber'             WHERE nome = 'Jos?? dos Santos - Heber';
UPDATE encarregados SET nome = 'Paulo Henrique da Conceição - Heber' WHERE nome = 'Paulo Henrique da Concei????o - Heber';
UPDATE encarregados SET nome = 'JOSÉ MENDES'                         WHERE nome = 'JOS?? MENDES';
UPDATE encarregados SET nome = 'João Santana - Nadilson'             WHERE nome = 'Jo??o Santana - Nadilson';
UPDATE encarregados SET nome = 'João'                                WHERE nome = 'Jo??o';
UPDATE encarregados SET nome = 'GREGÓRIO (MTB)'                      WHERE nome = 'GREG??RIO (MTB)';
UPDATE encarregados SET nome = 'Não identificado'                    WHERE nome = 'N??o identificado';
UPDATE encarregados SET nome = 'João Pedro Cristofolio Pessoa'       WHERE nome = 'Jo??o Pedro Cristofolio Pessoa';
UPDATE encarregados SET nome = 'José Afonso Junior - Herson'         WHERE nome = 'Jos?? Afonso Junior - Herson';
UPDATE encarregados SET nome = 'Gilmar Gildásio - Herson/José Lito'  WHERE nome = 'Gilmar Gild??sio - Herson/Jos?? Lito';
UPDATE encarregados SET nome = 'Roberto Conceição - Nadilson'        WHERE nome = 'Roberto Concei????o - Nadilson';
UPDATE encarregados SET nome = 'Renato César'                        WHERE nome = 'Renato C??sar';
UPDATE encarregados SET nome = 'João Paulo'                          WHERE nome = 'Jo??o Paulo';
UPDATE encarregados SET nome = 'Marcos André de Miranda'             WHERE nome = 'Marcos Andr?? de Miranda';
UPDATE encarregados SET nome = 'Fábio Aurélio Junio Lopes'           WHERE nome = 'F??bio Aur??lio Junio Lopes';
UPDATE encarregados SET nome = 'Marcos Aurélio'                      WHERE nome = 'Marcos Aur??lio';
UPDATE encarregados SET nome = 'Deividis Felício Fernandes'          WHERE nome = 'Deividis Fel??cio Fernandes';

-- ── coordenadores ─────────────────────────────────────────────
UPDATE coordenadores SET nome = 'Cícero Soares de Holanda Júnior' WHERE nome = 'C??cero Soares de Holanda J??nior';
UPDATE coordenadores SET nome = 'José Lito Barbosa da Silva'       WHERE nome = 'Jos?? Lito Barbosa da Silva';
UPDATE coordenadores SET nome = 'Rafael Leão'                      WHERE nome = 'Rafael Le??o';
UPDATE coordenadores SET nome = 'Fábio Aurélio Junio Lopes'        WHERE nome = 'F??bio Aur??lio Junio Lopes';

-- ── tsts ──────────────────────────────────────────────────────
UPDATE tsts SET nome = 'João Vitor'                      WHERE nome = 'Jo??o Vitor';
UPDATE tsts SET nome = 'Paula Gardênia'                  WHERE nome = 'Paula Gard??nia';
UPDATE tsts SET nome = 'João Jaques'                     WHERE nome = 'Jo??o Jaques';
UPDATE tsts SET nome = 'João Pedro Cristofolo Pessoa'    WHERE nome = 'Jo??o Pedro Cristofolo Pessoa';
UPDATE tsts SET nome = 'Francisco José Carmo da Silva'   WHERE nome = 'Francisco Jos?? Carmo da Silva';

-- ── Diagnóstico pós-fix: deve retornar 0 linhas ──────────────
SELECT 'res_tipos'     AS tabela, id, nome AS campo, nome     AS valor FROM res_tipos     WHERE nome           LIKE '%??%' OR unidade_medida LIKE '%??%'
UNION ALL
SELECT 'obras',           id, 'nome',           nome           FROM obras           WHERE nome           LIKE '%??%'
UNION ALL
SELECT 'res_saldos',      id, 'unidade_medida', unidade_medida FROM res_saldos      WHERE unidade_medida LIKE '%??%'
UNION ALL
SELECT 'res_retiradas',   id, 'unidade_medida', unidade_medida FROM res_retiradas   WHERE unidade_medida LIKE '%??%'
UNION ALL
SELECT 'encarregados',    id, 'nome',           nome           FROM encarregados    WHERE nome           LIKE '%??%'
UNION ALL
SELECT 'coordenadores',   id, 'nome',           nome           FROM coordenadores   WHERE nome           LIKE '%??%'
UNION ALL
SELECT 'tsts',            id, 'nome',           nome           FROM tsts            WHERE nome           LIKE '%??%';
