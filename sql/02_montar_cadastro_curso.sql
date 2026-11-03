-- =====================================================================
-- TCC ENADE 2023 — PASSO 2: CADASTRO DE CURSOS (1 linha por curso)
-- Rodar depois de carregar o arq1 na tabela inep_enade_2023_curso.
--
-- O arq1 repete os dados do curso para cada estudante (406.294 linhas).
-- Aqui guardamos cada curso uma única vez (9.812 cursos) e contamos
-- quantos estudantes ele tem. Os dados do curso são sempre iguais para
-- todos os estudantes do mesmo curso, então nada se perde.
-- =====================================================================

SET search_path TO gabriel;

INSERT INTO inep_enade_2023_cadastro_curso
      (nu_ano, co_curso, co_ies, co_categad, co_orgacad, co_grupo,
       co_modalidade, co_munic_curso, co_uf_curso, co_regiao_curso, qt_estudantes)
SELECT nu_ano, co_curso, co_ies, co_categad, co_orgacad, co_grupo,
       co_modalidade, co_munic_curso, co_uf_curso, co_regiao_curso, COUNT(*)
FROM inep_enade_2023_curso
GROUP BY nu_ano, co_curso, co_ies, co_categad, co_orgacad, co_grupo,
         co_modalidade, co_munic_curso, co_uf_curso, co_regiao_curso
ORDER BY nu_ano, co_curso;
