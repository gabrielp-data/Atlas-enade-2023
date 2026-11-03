-- =====================================================================
-- TCC ENADE 2023 — PASSO 3: CHAVES ESTRANGEIRAS (FK) E ÍNDICES
-- Rodar depois que os dados estiverem carregados.
--
-- Como as tabelas se ligam:
--
--   inep_censo_2023_ies  (1 linha por IES)
--          ^
--          | co_ies
--   inep_enade_2023_cadastro_curso  (1 linha por curso)
--          ^
--          | (nu_ano, co_curso)   -> as 10 tabelas dos arquivos do ENADE
--   inep_enade_2023_curso, inep_enade_2023_aluno_*  (1 linha por estudante)
--
-- Por que a ligação é pelo curso e não por estudante?
-- Todos os arquivos do INEP têm NU_ANO e CO_CURSO, mas nenhum código de
-- estudante. O Manual do Usuário do INEP (seção 2, LGPD) informa que cada
-- arquivo é ordenado por variáveis diferentes, então a ligação possível
-- é pelo curso.
--
-- Lista completa de chaves estrangeiras (12):
--   - cadastro_curso.co_ies         -> inep_censo_2023_ies
--   - curso.co_ies                  -> inep_censo_2023_ies
--   - (nu_ano, co_curso) das 10 tabelas do ENADE -> cadastro_curso
-- =====================================================================

SET search_path TO gabriel;

-- ---------------------------------------------------------------------
-- Ligações com as IES
-- NOT VALID: 13 IES que aparecem no ENADE 2023 (33 cursos) não constam
-- no Censo da Educação Superior 2023. A regra vale para dados novos, mas
-- não bloqueia esses registros que já existem.
-- ---------------------------------------------------------------------
ALTER TABLE inep_enade_2023_cadastro_curso
    ADD CONSTRAINT fk_cadastro_curso_ies
    FOREIGN KEY (co_ies) REFERENCES inep_censo_2023_ies (co_ies) NOT VALID;

ALTER TABLE inep_enade_2023_curso
    ADD CONSTRAINT fk_curso_ies
    FOREIGN KEY (co_ies) REFERENCES inep_censo_2023_ies (co_ies) NOT VALID;

-- ---------------------------------------------------------------------
-- Tabelas do ENADE -> cadastro de cursos, por (nu_ano, co_curso)
-- ---------------------------------------------------------------------
ALTER TABLE inep_enade_2023_curso
    ADD CONSTRAINT fk_curso_cadastro_curso
    FOREIGN KEY (nu_ano, co_curso) REFERENCES inep_enade_2023_cadastro_curso (nu_ano, co_curso);

ALTER TABLE inep_enade_2023_aluno_formacao_academica
    ADD CONSTRAINT fk_formacao_academica_cadastro_curso
    FOREIGN KEY (nu_ano, co_curso) REFERENCES inep_enade_2023_cadastro_curso (nu_ano, co_curso);

ALTER TABLE inep_enade_2023_aluno_resultado_prova
    ADD CONSTRAINT fk_resultado_prova_cadastro_curso
    FOREIGN KEY (nu_ano, co_curso) REFERENCES inep_enade_2023_cadastro_curso (nu_ano, co_curso);

ALTER TABLE inep_enade_2023_aluno_avaliacao_curso
    ADD CONSTRAINT fk_avaliacao_curso_cadastro_curso
    FOREIGN KEY (nu_ano, co_curso) REFERENCES inep_enade_2023_cadastro_curso (nu_ano, co_curso);

ALTER TABLE inep_enade_2023_aluno_sexo
    ADD CONSTRAINT fk_sexo_cadastro_curso
    FOREIGN KEY (nu_ano, co_curso) REFERENCES inep_enade_2023_cadastro_curso (nu_ano, co_curso);

ALTER TABLE inep_enade_2023_aluno_idade
    ADD CONSTRAINT fk_idade_cadastro_curso
    FOREIGN KEY (nu_ano, co_curso) REFERENCES inep_enade_2023_cadastro_curso (nu_ano, co_curso);

ALTER TABLE inep_enade_2023_aluno_cor_raca
    ADD CONSTRAINT fk_cor_raca_cadastro_curso
    FOREIGN KEY (nu_ano, co_curso) REFERENCES inep_enade_2023_cadastro_curso (nu_ano, co_curso);

ALTER TABLE inep_enade_2023_aluno_escolaridade_pai
    ADD CONSTRAINT fk_escolaridade_pai_cadastro_curso
    FOREIGN KEY (nu_ano, co_curso) REFERENCES inep_enade_2023_cadastro_curso (nu_ano, co_curso);

ALTER TABLE inep_enade_2023_aluno_escolaridade_mae
    ADD CONSTRAINT fk_escolaridade_mae_cadastro_curso
    FOREIGN KEY (nu_ano, co_curso) REFERENCES inep_enade_2023_cadastro_curso (nu_ano, co_curso);

ALTER TABLE inep_enade_2023_aluno_renda_familiar
    ADD CONSTRAINT fk_renda_familiar_cadastro_curso
    FOREIGN KEY (nu_ano, co_curso) REFERENCES inep_enade_2023_cadastro_curso (nu_ano, co_curso);

-- ---------------------------------------------------------------------
-- Índices nas colunas de ligação (deixam os JOINs por curso rápidos)
-- ---------------------------------------------------------------------
CREATE INDEX ix_cadastro_curso_co_ies          ON inep_enade_2023_cadastro_curso (co_ies);
CREATE INDEX ix_curso_co_curso                 ON inep_enade_2023_curso (co_curso, nu_ano);
CREATE INDEX ix_formacao_academica_co_curso    ON inep_enade_2023_aluno_formacao_academica (co_curso, nu_ano);
CREATE INDEX ix_resultado_prova_co_curso       ON inep_enade_2023_aluno_resultado_prova (co_curso, nu_ano);
CREATE INDEX ix_avaliacao_curso_co_curso       ON inep_enade_2023_aluno_avaliacao_curso (co_curso, nu_ano);
CREATE INDEX ix_sexo_co_curso                  ON inep_enade_2023_aluno_sexo (co_curso, nu_ano);
CREATE INDEX ix_idade_co_curso                 ON inep_enade_2023_aluno_idade (co_curso, nu_ano);
CREATE INDEX ix_cor_raca_co_curso              ON inep_enade_2023_aluno_cor_raca (co_curso, nu_ano);
CREATE INDEX ix_escolaridade_pai_co_curso      ON inep_enade_2023_aluno_escolaridade_pai (co_curso, nu_ano);
CREATE INDEX ix_escolaridade_mae_co_curso      ON inep_enade_2023_aluno_escolaridade_mae (co_curso, nu_ano);
CREATE INDEX ix_renda_familiar_co_curso        ON inep_enade_2023_aluno_renda_familiar (co_curso, nu_ano);
