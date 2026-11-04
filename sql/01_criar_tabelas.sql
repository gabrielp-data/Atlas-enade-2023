-- =====================================================================
-- TCC ENADE 2023 — PASSO 1: CRIAÇÃO DAS TABELAS
-- Banco: PostgreSQL | Schema: gabriel
--
-- Cria todas as tabelas com tipos de dados e chave primária (PK).
-- As chaves estrangeiras (FK) ficam no arquivo 03, porque só podem ser
-- criadas depois que os dados forem carregados.
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS gabriel;
SET search_path TO gabriel;

-- Este arquivo só cria tabelas. Se elas já existem, a execução para sem apagá-las.
-- Recriação explícita: python montar_banco.py --recriar

-- =====================================================================
-- TABELA DE CATEGORIAS — significado de todos os códigos
-- Ex.: variavel = 'TP_SEXO', codigo = 'F', descricao = 'Feminino'
-- =====================================================================
CREATE TABLE inep_2023_categorias (
    variavel   VARCHAR(30)  NOT NULL,
    codigo     VARCHAR(10)  NOT NULL,
    descricao  VARCHAR(250) NOT NULL,
    CONSTRAINT pk_categorias PRIMARY KEY (variavel, codigo)
);


-- =====================================================================
-- CADASTRO DAS IES — Censo da Educação Superior 2023
-- 1 linha por instituição
-- =====================================================================
CREATE TABLE inep_censo_2023_ies (
    co_ies                      INTEGER      NOT NULL,
    nu_ano_censo                SMALLINT,
    no_ies                      VARCHAR(200),
    sg_ies                      VARCHAR(20),
    tp_organizacao_academica    SMALLINT,
    tp_categoria_administrativa SMALLINT,
    no_mantenedora              VARCHAR(100),
    co_mantenedora              INTEGER,
    no_regiao_ies               VARCHAR(20),
    co_regiao_ies               SMALLINT,
    sg_uf_ies                   CHAR(2),
    no_uf_ies                   VARCHAR(50),
    co_uf_ies                   SMALLINT,
    no_municipio_ies            VARCHAR(150),
    co_municipio_ies            INTEGER,
    in_capital_ies              SMALLINT,
    CONSTRAINT pk_ies PRIMARY KEY (co_ies)
);


-- =====================================================================
-- CADASTRO DOS CURSOS — 1 linha por curso em cada edição do ENADE
-- Montada a partir do arq1. É a tabela central do modelo: todas as
-- tabelas de estudantes se ligam a ela por (nu_ano, co_curso), as duas
-- colunas que aparecem em todos os arquivos do INEP.
-- =====================================================================
CREATE TABLE inep_enade_2023_cadastro_curso (
    nu_ano           SMALLINT NOT NULL,
    co_curso         INTEGER  NOT NULL,
    co_ies           INTEGER,
    co_categad       SMALLINT,
    co_orgacad       SMALLINT,
    co_grupo         SMALLINT,
    co_modalidade    SMALLINT,
    co_munic_curso   INTEGER,
    co_uf_curso      SMALLINT,
    co_regiao_curso  SMALLINT,
    qt_estudantes    INTEGER,
    CONSTRAINT pk_cadastro_curso PRIMARY KEY (nu_ano, co_curso)
);


-- =====================================================================
-- TABELAS DOS ARQUIVOS DO INEP — 1 linha por estudante
--
-- id_registro = número da linha no arquivo original do INEP.
-- Ele identifica a linha só DENTRO da própria tabela: a linha 10 da
-- tabela de sexo NÃO é o mesmo estudante da linha 10 da tabela de renda,
-- porque o INEP ordena cada arquivo de um jeito diferente (LGPD).
-- =====================================================================

-- arq1 — Caracterização do curso (arquivo original, sem alteração)
CREATE TABLE inep_enade_2023_curso (
    id_registro      INTEGER  NOT NULL,
    nu_ano           SMALLINT NOT NULL,
    co_curso         INTEGER  NOT NULL,
    co_ies           INTEGER,
    co_categad       SMALLINT,
    co_orgacad       SMALLINT,
    co_grupo         SMALLINT,
    co_modalidade    SMALLINT,
    co_munic_curso   INTEGER,
    co_uf_curso      SMALLINT,
    co_regiao_curso  SMALLINT,
    CONSTRAINT pk_curso PRIMARY KEY (id_registro)
);

-- arq2 — Informações acadêmicas
CREATE TABLE inep_enade_2023_aluno_formacao_academica (
    id_registro         INTEGER  NOT NULL,
    nu_ano              SMALLINT NOT NULL,
    co_curso            INTEGER  NOT NULL,
    ano_fim_em          SMALLINT,
    ano_in_grad         SMALLINT,
    co_turno_graduacao  SMALLINT,
    CONSTRAINT pk_formacao_academica PRIMARY KEY (id_registro)
);

-- arq3 — Resultado da prova (todas as 44 colunas do arquivo)
CREATE TABLE inep_enade_2023_aluno_resultado_prova (
    id_registro        INTEGER  NOT NULL,
    nu_ano             SMALLINT NOT NULL,
    co_curso           INTEGER  NOT NULL,
    nu_item_ofg        SMALLINT,
    nu_item_ofg_z      SMALLINT,
    nu_item_ofg_x      SMALLINT,
    nu_item_ofg_n      SMALLINT,
    nu_item_oce        SMALLINT,
    nu_item_oce_z      SMALLINT,
    nu_item_oce_x      SMALLINT,
    nu_item_oce_n      SMALLINT,
    ds_vt_gab_ofg_fin  VARCHAR(9),
    ds_vt_gab_oce_fin  VARCHAR(29),
    ds_vt_esc_ofg      VARCHAR(9),
    ds_vt_ace_ofg      VARCHAR(9),
    ds_vt_esc_oce      VARCHAR(29),
    ds_vt_ace_oce      VARCHAR(29),
    tp_pres            SMALLINT,
    tp_pr_ger          SMALLINT,
    tp_pr_ob_fg        SMALLINT,
    tp_pr_di_fg        SMALLINT,
    tp_pr_ob_ce        SMALLINT,
    tp_pr_di_ce        SMALLINT,
    tp_sfg_d1          SMALLINT,
    tp_sce_d1          SMALLINT,
    nt_ger             NUMERIC(4,1),
    nt_fg              NUMERIC(4,1),
    nt_obj_fg          NUMERIC(4,1),
    nt_dis_fg          NUMERIC(4,1),
    nt_fg_d1           NUMERIC(4,1),
    nt_fg_d1_pt        NUMERIC(4,1),
    nt_fg_d1_ct        NUMERIC(4,1),
    nt_ce              NUMERIC(4,1),
    nt_obj_ce          NUMERIC(4,1),
    nt_dis_ce          NUMERIC(4,1),
    nt_ce_d1           NUMERIC(4,1),
    co_rs_i1           CHAR(1),
    co_rs_i2           CHAR(1),
    co_rs_i3           CHAR(1),
    co_rs_i4           CHAR(1),
    co_rs_i5           CHAR(1),
    co_rs_i6           CHAR(1),
    co_rs_i7           CHAR(1),
    co_rs_i8           CHAR(1),
    co_rs_i9           CHAR(1),
    CONSTRAINT pk_resultado_prova PRIMARY KEY (id_registro)
);

-- arq4 — Avaliação do curso pelo estudante (escala de 1 a 8)
CREATE TABLE inep_enade_2023_aluno_avaliacao_curso (
    id_registro  INTEGER  NOT NULL,
    nu_ano       SMALLINT NOT NULL,
    co_curso     INTEGER  NOT NULL,
    qe_i27 SMALLINT, qe_i28 SMALLINT, qe_i29 SMALLINT, qe_i30 SMALLINT,
    qe_i31 SMALLINT, qe_i32 SMALLINT, qe_i33 SMALLINT, qe_i34 SMALLINT,
    qe_i35 SMALLINT, qe_i36 SMALLINT, qe_i37 SMALLINT, qe_i38 SMALLINT,
    qe_i39 SMALLINT, qe_i40 SMALLINT, qe_i41 SMALLINT, qe_i42 SMALLINT,
    qe_i43 SMALLINT, qe_i44 SMALLINT, qe_i45 SMALLINT, qe_i46 SMALLINT,
    qe_i47 SMALLINT, qe_i48 SMALLINT, qe_i49 SMALLINT, qe_i50 SMALLINT,
    qe_i51 SMALLINT, qe_i52 SMALLINT, qe_i53 SMALLINT, qe_i54 SMALLINT,
    qe_i55 SMALLINT, qe_i56 SMALLINT, qe_i57 SMALLINT, qe_i58 SMALLINT,
    qe_i59 SMALLINT, qe_i60 SMALLINT, qe_i61 SMALLINT, qe_i62 SMALLINT,
    qe_i63 SMALLINT, qe_i64 SMALLINT, qe_i65 SMALLINT, qe_i66 SMALLINT,
    qe_i67 SMALLINT, qe_i68 SMALLINT,
    CONSTRAINT pk_avaliacao_curso PRIMARY KEY (id_registro)
);

-- arq5 — Sexo
CREATE TABLE inep_enade_2023_aluno_sexo (
    id_registro  INTEGER  NOT NULL,
    nu_ano       SMALLINT NOT NULL,
    co_curso     INTEGER  NOT NULL,
    tp_sexo      CHAR(1),
    CONSTRAINT pk_sexo PRIMARY KEY (id_registro)
);

-- arq6 — Idade
CREATE TABLE inep_enade_2023_aluno_idade (
    id_registro  INTEGER  NOT NULL,
    nu_ano       SMALLINT NOT NULL,
    co_curso     INTEGER  NOT NULL,
    nu_idade     SMALLINT,
    CONSTRAINT pk_idade PRIMARY KEY (id_registro)
);

-- arq8 — Cor ou raça (QE_I02)
CREATE TABLE inep_enade_2023_aluno_cor_raca (
    id_registro  INTEGER  NOT NULL,
    nu_ano       SMALLINT NOT NULL,
    co_curso     INTEGER  NOT NULL,
    qe_i02       CHAR(1),
    CONSTRAINT pk_cor_raca PRIMARY KEY (id_registro)
);

-- arq10 — Escolaridade do pai (QE_I04)
CREATE TABLE inep_enade_2023_aluno_escolaridade_pai (
    id_registro  INTEGER  NOT NULL,
    nu_ano       SMALLINT NOT NULL,
    co_curso     INTEGER  NOT NULL,
    qe_i04       CHAR(1),
    CONSTRAINT pk_escolaridade_pai PRIMARY KEY (id_registro)
);

-- arq11 — Escolaridade da mãe (QE_I05)
CREATE TABLE inep_enade_2023_aluno_escolaridade_mae (
    id_registro  INTEGER  NOT NULL,
    nu_ano       SMALLINT NOT NULL,
    co_curso     INTEGER  NOT NULL,
    qe_i05       CHAR(1),
    CONSTRAINT pk_escolaridade_mae PRIMARY KEY (id_registro)
);

-- arq14 — Renda familiar (QE_I08)
CREATE TABLE inep_enade_2023_aluno_renda_familiar (
    id_registro  INTEGER  NOT NULL,
    nu_ano       SMALLINT NOT NULL,
    co_curso     INTEGER  NOT NULL,
    qe_i08       CHAR(1),
    CONSTRAINT pk_renda_familiar PRIMARY KEY (id_registro)
);
