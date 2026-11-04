-- Usado somente por: python montar_banco.py --recriar
-- O Python executa a limpeza e toda a carga na MESMA transação.
-- Lista fechada de objetos deste projeto. RESTRICT preserva dependências externas:
-- se outra view ou tabela depender deles, a recriação para e é desfeita.
DO $$
BEGIN
    IF current_setting('atlas.recriar', true) IS DISTINCT FROM 'sim' THEN
        RAISE EXCEPTION 'Recriação não autorizada. Use montar_banco.py --recriar.';
    END IF;
END $$;

DROP VIEW IF EXISTS
    gabriel.inep_enade_2023_indicadores_curso,
    gabriel.inep_censo_2023_ies_desc,
    gabriel.inep_enade_2023_cadastro_curso_desc,
    gabriel.inep_enade_2023_curso_desc,
    gabriel.inep_enade_2023_aluno_formacao_academica_desc,
    gabriel.inep_enade_2023_aluno_resultado_prova_desc,
    gabriel.inep_enade_2023_aluno_avaliacao_curso_desc,
    gabriel.inep_enade_2023_aluno_sexo_desc,
    gabriel.inep_enade_2023_aluno_cor_raca_desc,
    gabriel.inep_enade_2023_aluno_escolaridade_pai_desc,
    gabriel.inep_enade_2023_aluno_escolaridade_mae_desc,
    gabriel.inep_enade_2023_aluno_renda_familiar_desc
RESTRICT;

DROP TABLE IF EXISTS
    gabriel.inep_enade_2023_aluno_renda_familiar,
    gabriel.inep_enade_2023_aluno_escolaridade_mae,
    gabriel.inep_enade_2023_aluno_escolaridade_pai,
    gabriel.inep_enade_2023_aluno_cor_raca,
    gabriel.inep_enade_2023_aluno_idade,
    gabriel.inep_enade_2023_aluno_sexo,
    gabriel.inep_enade_2023_aluno_avaliacao_curso,
    gabriel.inep_enade_2023_aluno_resultado_prova,
    gabriel.inep_enade_2023_aluno_formacao_academica,
    gabriel.inep_enade_2023_curso,
    gabriel.inep_enade_2023_cadastro_curso,
    gabriel.inep_censo_2023_ies,
    gabriel.inep_2023_categorias
RESTRICT;
