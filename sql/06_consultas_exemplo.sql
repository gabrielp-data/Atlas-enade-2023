-- =====================================================================
-- TCC ENADE 2023 — CONSULTAS DE EXEMPLO
-- Copie e rode no DBeaver (Ctrl+Enter com o cursor dentro da consulta).
-- =====================================================================

SET search_path TO gabriel;

-- 1) O que significa cada código de uma variável? (ex.: renda familiar)
SELECT codigo, descricao
FROM inep_2023_categorias
WHERE variavel = 'QE_I08'
ORDER BY codigo;

-- 2) Quantos cursos e estudantes por área
SELECT ds_co_grupo AS area, COUNT(*) AS cursos, SUM(qt_estudantes) AS estudantes
FROM inep_enade_2023_cadastro_curso_desc
GROUP BY ds_co_grupo
ORDER BY estudantes DESC;

-- 3) Distribuição da renda familiar (uma tabela só)
SELECT ds_qe_i08 AS renda,
       COUNT(*) AS estudantes,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM inep_enade_2023_aluno_renda_familiar_desc
WHERE qe_i08 IS NOT NULL
GROUP BY qe_i08, ds_qe_i08
ORDER BY qe_i08;

-- 4) Tabela de estudantes + dados do curso (ligação correta: nu_ano + co_curso)
--    Renda familiar por modalidade (Presencial x EaD), em %
SELECT c.ds_co_modalidade AS modalidade,
       r.ds_qe_i08 AS renda,
       COUNT(*) AS estudantes,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY c.ds_co_modalidade), 1) AS pct
FROM inep_enade_2023_aluno_renda_familiar_desc r
JOIN inep_enade_2023_cadastro_curso_desc c ON c.nu_ano = r.nu_ano AND c.co_curso = r.co_curso
WHERE r.qe_i08 IS NOT NULL
GROUP BY c.ds_co_modalidade, r.qe_i08, r.ds_qe_i08
ORDER BY c.ds_co_modalidade, r.qe_i08;

-- 5) Nota média por região e categoria administrativa
--    (só presentes com resultado válido: tp_pres = 555)
SELECT c.ds_co_regiao_curso AS regiao,
       c.ds_co_categad AS categoria,
       COUNT(*) AS presentes,
       ROUND(AVG(p.nt_ger), 1) AS nota_media
FROM inep_enade_2023_aluno_resultado_prova p
JOIN inep_enade_2023_cadastro_curso_desc c ON c.nu_ano = p.nu_ano AND c.co_curso = p.co_curso
WHERE p.tp_pres = 555
GROUP BY c.ds_co_regiao_curso, c.ds_co_categad
ORDER BY regiao, nota_media DESC;

-- 6) Indicadores por curso: os 10 cursos de Medicina com maior nota média
SELECT no_ies, uf_curso, qt_presentes, media_nota_geral,
       pct_feminino, media_idade, pct_renda_ate_3_sm
FROM inep_enade_2023_indicadores_curso
WHERE area_curso = 'Medicina' AND qt_presentes >= 30
ORDER BY media_nota_geral DESC
LIMIT 10;

-- 7) Renda x nota: correlação entre os cursos de cada área
--    (negativo = cursos com mais estudantes de baixa renda têm nota menor)
SELECT area_curso,
       COUNT(*) AS cursos,
       ROUND(CORR(pct_renda_ate_3_sm, media_nota_geral)::numeric, 2) AS correlacao_renda_nota
FROM inep_enade_2023_indicadores_curso
WHERE qt_presentes >= 10
GROUP BY area_curso
ORDER BY correlacao_renda_nota;

-- 8) IES do ENADE que não estão no Censo 2023 (motivo da FK NOT VALID)
SELECT c.co_ies, COUNT(*) AS cursos, SUM(c.qt_estudantes) AS estudantes
FROM inep_enade_2023_cadastro_curso c
LEFT JOIN inep_censo_2023_ies i ON i.co_ies = c.co_ies
WHERE i.co_ies IS NULL
GROUP BY c.co_ies
ORDER BY c.co_ies;

-- ---------------------------------------------------------------------
-- O QUE NÃO FAZER
--
-- Juntar duas tabelas de ESTUDANTES pela linha mistura pessoas diferentes,
-- porque cada arquivo do INEP vem numa ordem diferente (LGPD):
--   ERRADO: FROM inep_enade_2023_aluno_sexo s
--           JOIN inep_enade_2023_aluno_renda_familiar r ON r.id_registro = s.id_registro
--
-- Juntar duas tabelas de ESTUDANTES direto pelo co_curso multiplica as
-- linhas (cada estudante x todos os estudantes do mesmo curso):
--   ERRADO: FROM inep_enade_2023_aluno_sexo s
--           JOIN inep_enade_2023_aluno_renda_familiar r ON r.co_curso = s.co_curso
--
-- CERTO: agrupar cada tabela de estudantes por curso (nu_ano, co_curso) e só depois juntar,
-- como faz a view inep_enade_2023_indicadores_curso.
-- Juntar UMA tabela de estudantes com o cadastro de cursos (consultas 4 e 5)
-- também está certo, porque cada estudante tem um único curso.
-- ---------------------------------------------------------------------
