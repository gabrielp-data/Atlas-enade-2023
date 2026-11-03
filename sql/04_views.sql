-- =====================================================================
-- TCC ENADE 2023 — PASSO 4: VIEWS (arquivo gerado pelo montar_banco.py)
--
-- Views _desc: a mesma tabela, com uma coluna ds_<código> ao lado de cada
-- código trazendo o significado em texto (vem de inep_2023_categorias).
-- View de indicadores: 1 linha por curso, cruzando as tabelas corretamente.
-- =====================================================================

SET search_path TO gabriel;

CREATE VIEW inep_censo_2023_ies_desc AS
SELECT
    t.co_ies,
    t.nu_ano_censo,
    t.no_ies,
    t.sg_ies,
    t.tp_organizacao_academica,
    k_tp_organizacao_academica.descricao AS ds_tp_organizacao_academica,
    t.tp_categoria_administrativa,
    k_tp_categoria_administrativa.descricao AS ds_tp_categoria_administrativa,
    t.no_mantenedora,
    t.co_mantenedora,
    t.no_regiao_ies,
    t.co_regiao_ies,
    t.sg_uf_ies,
    t.no_uf_ies,
    t.co_uf_ies,
    t.no_municipio_ies,
    t.co_municipio_ies,
    t.in_capital_ies,
    k_in_capital_ies.descricao AS ds_in_capital_ies
FROM inep_censo_2023_ies t
LEFT JOIN inep_2023_categorias k_tp_organizacao_academica ON k_tp_organizacao_academica.variavel = 'TP_ORGANIZACAO_ACADEMICA' AND k_tp_organizacao_academica.codigo = t.tp_organizacao_academica::text
LEFT JOIN inep_2023_categorias k_tp_categoria_administrativa ON k_tp_categoria_administrativa.variavel = 'TP_CATEGORIA_ADMINISTRATIVA' AND k_tp_categoria_administrativa.codigo = t.tp_categoria_administrativa::text
LEFT JOIN inep_2023_categorias k_in_capital_ies ON k_in_capital_ies.variavel = 'IN_CAPITAL_IES' AND k_in_capital_ies.codigo = t.in_capital_ies::text;

CREATE VIEW inep_enade_2023_cadastro_curso_desc AS
SELECT
    t.nu_ano,
    t.co_curso,
    t.co_ies,
    ies.no_ies,
    ies.sg_ies,
    t.co_categad,
    k_co_categad.descricao AS ds_co_categad,
    t.co_orgacad,
    k_co_orgacad.descricao AS ds_co_orgacad,
    t.co_grupo,
    k_co_grupo.descricao AS ds_co_grupo,
    t.co_modalidade,
    k_co_modalidade.descricao AS ds_co_modalidade,
    t.co_munic_curso,
    k_co_munic_curso.descricao AS ds_co_munic_curso,
    t.co_uf_curso,
    k_co_uf_curso.descricao AS ds_co_uf_curso,
    t.co_regiao_curso,
    k_co_regiao_curso.descricao AS ds_co_regiao_curso,
    t.qt_estudantes
FROM inep_enade_2023_cadastro_curso t
LEFT JOIN inep_censo_2023_ies ies ON ies.co_ies = t.co_ies
LEFT JOIN inep_2023_categorias k_co_categad ON k_co_categad.variavel = 'CO_CATEGAD' AND k_co_categad.codigo = t.co_categad::text
LEFT JOIN inep_2023_categorias k_co_orgacad ON k_co_orgacad.variavel = 'CO_ORGACAD' AND k_co_orgacad.codigo = t.co_orgacad::text
LEFT JOIN inep_2023_categorias k_co_grupo ON k_co_grupo.variavel = 'CO_GRUPO' AND k_co_grupo.codigo = t.co_grupo::text
LEFT JOIN inep_2023_categorias k_co_modalidade ON k_co_modalidade.variavel = 'CO_MODALIDADE' AND k_co_modalidade.codigo = t.co_modalidade::text
LEFT JOIN inep_2023_categorias k_co_munic_curso ON k_co_munic_curso.variavel = 'CO_MUNIC_CURSO' AND k_co_munic_curso.codigo = t.co_munic_curso::text
LEFT JOIN inep_2023_categorias k_co_uf_curso ON k_co_uf_curso.variavel = 'CO_UF_CURSO' AND k_co_uf_curso.codigo = t.co_uf_curso::text
LEFT JOIN inep_2023_categorias k_co_regiao_curso ON k_co_regiao_curso.variavel = 'CO_REGIAO_CURSO' AND k_co_regiao_curso.codigo = t.co_regiao_curso::text;

CREATE VIEW inep_enade_2023_curso_desc AS
SELECT
    t.id_registro,
    t.nu_ano,
    t.co_curso,
    t.co_ies,
    ies.no_ies,
    ies.sg_ies,
    t.co_categad,
    k_co_categad.descricao AS ds_co_categad,
    t.co_orgacad,
    k_co_orgacad.descricao AS ds_co_orgacad,
    t.co_grupo,
    k_co_grupo.descricao AS ds_co_grupo,
    t.co_modalidade,
    k_co_modalidade.descricao AS ds_co_modalidade,
    t.co_munic_curso,
    k_co_munic_curso.descricao AS ds_co_munic_curso,
    t.co_uf_curso,
    k_co_uf_curso.descricao AS ds_co_uf_curso,
    t.co_regiao_curso,
    k_co_regiao_curso.descricao AS ds_co_regiao_curso
FROM inep_enade_2023_curso t
LEFT JOIN inep_censo_2023_ies ies ON ies.co_ies = t.co_ies
LEFT JOIN inep_2023_categorias k_co_categad ON k_co_categad.variavel = 'CO_CATEGAD' AND k_co_categad.codigo = t.co_categad::text
LEFT JOIN inep_2023_categorias k_co_orgacad ON k_co_orgacad.variavel = 'CO_ORGACAD' AND k_co_orgacad.codigo = t.co_orgacad::text
LEFT JOIN inep_2023_categorias k_co_grupo ON k_co_grupo.variavel = 'CO_GRUPO' AND k_co_grupo.codigo = t.co_grupo::text
LEFT JOIN inep_2023_categorias k_co_modalidade ON k_co_modalidade.variavel = 'CO_MODALIDADE' AND k_co_modalidade.codigo = t.co_modalidade::text
LEFT JOIN inep_2023_categorias k_co_munic_curso ON k_co_munic_curso.variavel = 'CO_MUNIC_CURSO' AND k_co_munic_curso.codigo = t.co_munic_curso::text
LEFT JOIN inep_2023_categorias k_co_uf_curso ON k_co_uf_curso.variavel = 'CO_UF_CURSO' AND k_co_uf_curso.codigo = t.co_uf_curso::text
LEFT JOIN inep_2023_categorias k_co_regiao_curso ON k_co_regiao_curso.variavel = 'CO_REGIAO_CURSO' AND k_co_regiao_curso.codigo = t.co_regiao_curso::text;

CREATE VIEW inep_enade_2023_aluno_formacao_academica_desc AS
SELECT
    t.id_registro,
    t.nu_ano,
    t.co_curso,
    t.ano_fim_em,
    t.ano_in_grad,
    t.co_turno_graduacao,
    k_co_turno_graduacao.descricao AS ds_co_turno_graduacao
FROM inep_enade_2023_aluno_formacao_academica t
LEFT JOIN inep_2023_categorias k_co_turno_graduacao ON k_co_turno_graduacao.variavel = 'CO_TURNO_GRADUACAO' AND k_co_turno_graduacao.codigo = t.co_turno_graduacao::text;

CREATE VIEW inep_enade_2023_aluno_resultado_prova_desc AS
SELECT
    t.id_registro,
    t.nu_ano,
    t.co_curso,
    t.nu_item_ofg,
    t.nu_item_ofg_z,
    t.nu_item_ofg_x,
    t.nu_item_ofg_n,
    t.nu_item_oce,
    t.nu_item_oce_z,
    t.nu_item_oce_x,
    t.nu_item_oce_n,
    t.ds_vt_gab_ofg_fin,
    t.ds_vt_gab_oce_fin,
    t.ds_vt_esc_ofg,
    t.ds_vt_ace_ofg,
    t.ds_vt_esc_oce,
    t.ds_vt_ace_oce,
    t.tp_pres,
    k_tp_pres.descricao AS ds_tp_pres,
    t.tp_pr_ger,
    k_tp_pr_ger.descricao AS ds_tp_pr_ger,
    t.tp_pr_ob_fg,
    k_tp_pr_ob_fg.descricao AS ds_tp_pr_ob_fg,
    t.tp_pr_di_fg,
    k_tp_pr_di_fg.descricao AS ds_tp_pr_di_fg,
    t.tp_pr_ob_ce,
    k_tp_pr_ob_ce.descricao AS ds_tp_pr_ob_ce,
    t.tp_pr_di_ce,
    k_tp_pr_di_ce.descricao AS ds_tp_pr_di_ce,
    t.tp_sfg_d1,
    k_tp_sfg_d1.descricao AS ds_tp_sfg_d1,
    t.tp_sce_d1,
    k_tp_sce_d1.descricao AS ds_tp_sce_d1,
    t.nt_ger,
    t.nt_fg,
    t.nt_obj_fg,
    t.nt_dis_fg,
    t.nt_fg_d1,
    t.nt_fg_d1_pt,
    t.nt_fg_d1_ct,
    t.nt_ce,
    t.nt_obj_ce,
    t.nt_dis_ce,
    t.nt_ce_d1,
    t.co_rs_i1,
    k_co_rs_i1.descricao AS ds_co_rs_i1,
    t.co_rs_i2,
    k_co_rs_i2.descricao AS ds_co_rs_i2,
    t.co_rs_i3,
    k_co_rs_i3.descricao AS ds_co_rs_i3,
    t.co_rs_i4,
    k_co_rs_i4.descricao AS ds_co_rs_i4,
    t.co_rs_i5,
    k_co_rs_i5.descricao AS ds_co_rs_i5,
    t.co_rs_i6,
    k_co_rs_i6.descricao AS ds_co_rs_i6,
    t.co_rs_i7,
    k_co_rs_i7.descricao AS ds_co_rs_i7,
    t.co_rs_i8,
    k_co_rs_i8.descricao AS ds_co_rs_i8,
    t.co_rs_i9,
    k_co_rs_i9.descricao AS ds_co_rs_i9
FROM inep_enade_2023_aluno_resultado_prova t
LEFT JOIN inep_2023_categorias k_tp_pres ON k_tp_pres.variavel = 'TP_PRES' AND k_tp_pres.codigo = t.tp_pres::text
LEFT JOIN inep_2023_categorias k_tp_pr_ger ON k_tp_pr_ger.variavel = 'TP_PR_GER' AND k_tp_pr_ger.codigo = t.tp_pr_ger::text
LEFT JOIN inep_2023_categorias k_tp_pr_ob_fg ON k_tp_pr_ob_fg.variavel = 'TP_PR_OB_FG' AND k_tp_pr_ob_fg.codigo = t.tp_pr_ob_fg::text
LEFT JOIN inep_2023_categorias k_tp_pr_di_fg ON k_tp_pr_di_fg.variavel = 'TP_PR_DI_FG' AND k_tp_pr_di_fg.codigo = t.tp_pr_di_fg::text
LEFT JOIN inep_2023_categorias k_tp_pr_ob_ce ON k_tp_pr_ob_ce.variavel = 'TP_PR_OB_CE' AND k_tp_pr_ob_ce.codigo = t.tp_pr_ob_ce::text
LEFT JOIN inep_2023_categorias k_tp_pr_di_ce ON k_tp_pr_di_ce.variavel = 'TP_PR_DI_CE' AND k_tp_pr_di_ce.codigo = t.tp_pr_di_ce::text
LEFT JOIN inep_2023_categorias k_tp_sfg_d1 ON k_tp_sfg_d1.variavel = 'TP_SFG_D1' AND k_tp_sfg_d1.codigo = t.tp_sfg_d1::text
LEFT JOIN inep_2023_categorias k_tp_sce_d1 ON k_tp_sce_d1.variavel = 'TP_SCE_D1' AND k_tp_sce_d1.codigo = t.tp_sce_d1::text
LEFT JOIN inep_2023_categorias k_co_rs_i1 ON k_co_rs_i1.variavel = 'CO_RS_I1' AND k_co_rs_i1.codigo = t.co_rs_i1::text
LEFT JOIN inep_2023_categorias k_co_rs_i2 ON k_co_rs_i2.variavel = 'CO_RS_I2' AND k_co_rs_i2.codigo = t.co_rs_i2::text
LEFT JOIN inep_2023_categorias k_co_rs_i3 ON k_co_rs_i3.variavel = 'CO_RS_I3' AND k_co_rs_i3.codigo = t.co_rs_i3::text
LEFT JOIN inep_2023_categorias k_co_rs_i4 ON k_co_rs_i4.variavel = 'CO_RS_I4' AND k_co_rs_i4.codigo = t.co_rs_i4::text
LEFT JOIN inep_2023_categorias k_co_rs_i5 ON k_co_rs_i5.variavel = 'CO_RS_I5' AND k_co_rs_i5.codigo = t.co_rs_i5::text
LEFT JOIN inep_2023_categorias k_co_rs_i6 ON k_co_rs_i6.variavel = 'CO_RS_I6' AND k_co_rs_i6.codigo = t.co_rs_i6::text
LEFT JOIN inep_2023_categorias k_co_rs_i7 ON k_co_rs_i7.variavel = 'CO_RS_I7' AND k_co_rs_i7.codigo = t.co_rs_i7::text
LEFT JOIN inep_2023_categorias k_co_rs_i8 ON k_co_rs_i8.variavel = 'CO_RS_I8' AND k_co_rs_i8.codigo = t.co_rs_i8::text
LEFT JOIN inep_2023_categorias k_co_rs_i9 ON k_co_rs_i9.variavel = 'CO_RS_I9' AND k_co_rs_i9.codigo = t.co_rs_i9::text;

CREATE VIEW inep_enade_2023_aluno_avaliacao_curso_desc AS
SELECT
    t.id_registro,
    t.nu_ano,
    t.co_curso,
    t.qe_i27,
    k_qe_i27.descricao AS ds_qe_i27,
    t.qe_i28,
    k_qe_i28.descricao AS ds_qe_i28,
    t.qe_i29,
    k_qe_i29.descricao AS ds_qe_i29,
    t.qe_i30,
    k_qe_i30.descricao AS ds_qe_i30,
    t.qe_i31,
    k_qe_i31.descricao AS ds_qe_i31,
    t.qe_i32,
    k_qe_i32.descricao AS ds_qe_i32,
    t.qe_i33,
    k_qe_i33.descricao AS ds_qe_i33,
    t.qe_i34,
    k_qe_i34.descricao AS ds_qe_i34,
    t.qe_i35,
    k_qe_i35.descricao AS ds_qe_i35,
    t.qe_i36,
    k_qe_i36.descricao AS ds_qe_i36,
    t.qe_i37,
    k_qe_i37.descricao AS ds_qe_i37,
    t.qe_i38,
    k_qe_i38.descricao AS ds_qe_i38,
    t.qe_i39,
    k_qe_i39.descricao AS ds_qe_i39,
    t.qe_i40,
    k_qe_i40.descricao AS ds_qe_i40,
    t.qe_i41,
    k_qe_i41.descricao AS ds_qe_i41,
    t.qe_i42,
    k_qe_i42.descricao AS ds_qe_i42,
    t.qe_i43,
    k_qe_i43.descricao AS ds_qe_i43,
    t.qe_i44,
    k_qe_i44.descricao AS ds_qe_i44,
    t.qe_i45,
    k_qe_i45.descricao AS ds_qe_i45,
    t.qe_i46,
    k_qe_i46.descricao AS ds_qe_i46,
    t.qe_i47,
    k_qe_i47.descricao AS ds_qe_i47,
    t.qe_i48,
    k_qe_i48.descricao AS ds_qe_i48,
    t.qe_i49,
    k_qe_i49.descricao AS ds_qe_i49,
    t.qe_i50,
    k_qe_i50.descricao AS ds_qe_i50,
    t.qe_i51,
    k_qe_i51.descricao AS ds_qe_i51,
    t.qe_i52,
    k_qe_i52.descricao AS ds_qe_i52,
    t.qe_i53,
    k_qe_i53.descricao AS ds_qe_i53,
    t.qe_i54,
    k_qe_i54.descricao AS ds_qe_i54,
    t.qe_i55,
    k_qe_i55.descricao AS ds_qe_i55,
    t.qe_i56,
    k_qe_i56.descricao AS ds_qe_i56,
    t.qe_i57,
    k_qe_i57.descricao AS ds_qe_i57,
    t.qe_i58,
    k_qe_i58.descricao AS ds_qe_i58,
    t.qe_i59,
    k_qe_i59.descricao AS ds_qe_i59,
    t.qe_i60,
    k_qe_i60.descricao AS ds_qe_i60,
    t.qe_i61,
    k_qe_i61.descricao AS ds_qe_i61,
    t.qe_i62,
    k_qe_i62.descricao AS ds_qe_i62,
    t.qe_i63,
    k_qe_i63.descricao AS ds_qe_i63,
    t.qe_i64,
    k_qe_i64.descricao AS ds_qe_i64,
    t.qe_i65,
    k_qe_i65.descricao AS ds_qe_i65,
    t.qe_i66,
    k_qe_i66.descricao AS ds_qe_i66,
    t.qe_i67,
    k_qe_i67.descricao AS ds_qe_i67,
    t.qe_i68,
    k_qe_i68.descricao AS ds_qe_i68
FROM inep_enade_2023_aluno_avaliacao_curso t
LEFT JOIN inep_2023_categorias k_qe_i27 ON k_qe_i27.variavel = 'QE_I27' AND k_qe_i27.codigo = t.qe_i27::text
LEFT JOIN inep_2023_categorias k_qe_i28 ON k_qe_i28.variavel = 'QE_I28' AND k_qe_i28.codigo = t.qe_i28::text
LEFT JOIN inep_2023_categorias k_qe_i29 ON k_qe_i29.variavel = 'QE_I29' AND k_qe_i29.codigo = t.qe_i29::text
LEFT JOIN inep_2023_categorias k_qe_i30 ON k_qe_i30.variavel = 'QE_I30' AND k_qe_i30.codigo = t.qe_i30::text
LEFT JOIN inep_2023_categorias k_qe_i31 ON k_qe_i31.variavel = 'QE_I31' AND k_qe_i31.codigo = t.qe_i31::text
LEFT JOIN inep_2023_categorias k_qe_i32 ON k_qe_i32.variavel = 'QE_I32' AND k_qe_i32.codigo = t.qe_i32::text
LEFT JOIN inep_2023_categorias k_qe_i33 ON k_qe_i33.variavel = 'QE_I33' AND k_qe_i33.codigo = t.qe_i33::text
LEFT JOIN inep_2023_categorias k_qe_i34 ON k_qe_i34.variavel = 'QE_I34' AND k_qe_i34.codigo = t.qe_i34::text
LEFT JOIN inep_2023_categorias k_qe_i35 ON k_qe_i35.variavel = 'QE_I35' AND k_qe_i35.codigo = t.qe_i35::text
LEFT JOIN inep_2023_categorias k_qe_i36 ON k_qe_i36.variavel = 'QE_I36' AND k_qe_i36.codigo = t.qe_i36::text
LEFT JOIN inep_2023_categorias k_qe_i37 ON k_qe_i37.variavel = 'QE_I37' AND k_qe_i37.codigo = t.qe_i37::text
LEFT JOIN inep_2023_categorias k_qe_i38 ON k_qe_i38.variavel = 'QE_I38' AND k_qe_i38.codigo = t.qe_i38::text
LEFT JOIN inep_2023_categorias k_qe_i39 ON k_qe_i39.variavel = 'QE_I39' AND k_qe_i39.codigo = t.qe_i39::text
LEFT JOIN inep_2023_categorias k_qe_i40 ON k_qe_i40.variavel = 'QE_I40' AND k_qe_i40.codigo = t.qe_i40::text
LEFT JOIN inep_2023_categorias k_qe_i41 ON k_qe_i41.variavel = 'QE_I41' AND k_qe_i41.codigo = t.qe_i41::text
LEFT JOIN inep_2023_categorias k_qe_i42 ON k_qe_i42.variavel = 'QE_I42' AND k_qe_i42.codigo = t.qe_i42::text
LEFT JOIN inep_2023_categorias k_qe_i43 ON k_qe_i43.variavel = 'QE_I43' AND k_qe_i43.codigo = t.qe_i43::text
LEFT JOIN inep_2023_categorias k_qe_i44 ON k_qe_i44.variavel = 'QE_I44' AND k_qe_i44.codigo = t.qe_i44::text
LEFT JOIN inep_2023_categorias k_qe_i45 ON k_qe_i45.variavel = 'QE_I45' AND k_qe_i45.codigo = t.qe_i45::text
LEFT JOIN inep_2023_categorias k_qe_i46 ON k_qe_i46.variavel = 'QE_I46' AND k_qe_i46.codigo = t.qe_i46::text
LEFT JOIN inep_2023_categorias k_qe_i47 ON k_qe_i47.variavel = 'QE_I47' AND k_qe_i47.codigo = t.qe_i47::text
LEFT JOIN inep_2023_categorias k_qe_i48 ON k_qe_i48.variavel = 'QE_I48' AND k_qe_i48.codigo = t.qe_i48::text
LEFT JOIN inep_2023_categorias k_qe_i49 ON k_qe_i49.variavel = 'QE_I49' AND k_qe_i49.codigo = t.qe_i49::text
LEFT JOIN inep_2023_categorias k_qe_i50 ON k_qe_i50.variavel = 'QE_I50' AND k_qe_i50.codigo = t.qe_i50::text
LEFT JOIN inep_2023_categorias k_qe_i51 ON k_qe_i51.variavel = 'QE_I51' AND k_qe_i51.codigo = t.qe_i51::text
LEFT JOIN inep_2023_categorias k_qe_i52 ON k_qe_i52.variavel = 'QE_I52' AND k_qe_i52.codigo = t.qe_i52::text
LEFT JOIN inep_2023_categorias k_qe_i53 ON k_qe_i53.variavel = 'QE_I53' AND k_qe_i53.codigo = t.qe_i53::text
LEFT JOIN inep_2023_categorias k_qe_i54 ON k_qe_i54.variavel = 'QE_I54' AND k_qe_i54.codigo = t.qe_i54::text
LEFT JOIN inep_2023_categorias k_qe_i55 ON k_qe_i55.variavel = 'QE_I55' AND k_qe_i55.codigo = t.qe_i55::text
LEFT JOIN inep_2023_categorias k_qe_i56 ON k_qe_i56.variavel = 'QE_I56' AND k_qe_i56.codigo = t.qe_i56::text
LEFT JOIN inep_2023_categorias k_qe_i57 ON k_qe_i57.variavel = 'QE_I57' AND k_qe_i57.codigo = t.qe_i57::text
LEFT JOIN inep_2023_categorias k_qe_i58 ON k_qe_i58.variavel = 'QE_I58' AND k_qe_i58.codigo = t.qe_i58::text
LEFT JOIN inep_2023_categorias k_qe_i59 ON k_qe_i59.variavel = 'QE_I59' AND k_qe_i59.codigo = t.qe_i59::text
LEFT JOIN inep_2023_categorias k_qe_i60 ON k_qe_i60.variavel = 'QE_I60' AND k_qe_i60.codigo = t.qe_i60::text
LEFT JOIN inep_2023_categorias k_qe_i61 ON k_qe_i61.variavel = 'QE_I61' AND k_qe_i61.codigo = t.qe_i61::text
LEFT JOIN inep_2023_categorias k_qe_i62 ON k_qe_i62.variavel = 'QE_I62' AND k_qe_i62.codigo = t.qe_i62::text
LEFT JOIN inep_2023_categorias k_qe_i63 ON k_qe_i63.variavel = 'QE_I63' AND k_qe_i63.codigo = t.qe_i63::text
LEFT JOIN inep_2023_categorias k_qe_i64 ON k_qe_i64.variavel = 'QE_I64' AND k_qe_i64.codigo = t.qe_i64::text
LEFT JOIN inep_2023_categorias k_qe_i65 ON k_qe_i65.variavel = 'QE_I65' AND k_qe_i65.codigo = t.qe_i65::text
LEFT JOIN inep_2023_categorias k_qe_i66 ON k_qe_i66.variavel = 'QE_I66' AND k_qe_i66.codigo = t.qe_i66::text
LEFT JOIN inep_2023_categorias k_qe_i67 ON k_qe_i67.variavel = 'QE_I67' AND k_qe_i67.codigo = t.qe_i67::text
LEFT JOIN inep_2023_categorias k_qe_i68 ON k_qe_i68.variavel = 'QE_I68' AND k_qe_i68.codigo = t.qe_i68::text;

CREATE VIEW inep_enade_2023_aluno_sexo_desc AS
SELECT
    t.id_registro,
    t.nu_ano,
    t.co_curso,
    t.tp_sexo,
    k_tp_sexo.descricao AS ds_tp_sexo
FROM inep_enade_2023_aluno_sexo t
LEFT JOIN inep_2023_categorias k_tp_sexo ON k_tp_sexo.variavel = 'TP_SEXO' AND k_tp_sexo.codigo = t.tp_sexo::text;

CREATE VIEW inep_enade_2023_aluno_cor_raca_desc AS
SELECT
    t.id_registro,
    t.nu_ano,
    t.co_curso,
    t.qe_i02,
    k_qe_i02.descricao AS ds_qe_i02
FROM inep_enade_2023_aluno_cor_raca t
LEFT JOIN inep_2023_categorias k_qe_i02 ON k_qe_i02.variavel = 'QE_I02' AND k_qe_i02.codigo = t.qe_i02::text;

CREATE VIEW inep_enade_2023_aluno_escolaridade_pai_desc AS
SELECT
    t.id_registro,
    t.nu_ano,
    t.co_curso,
    t.qe_i04,
    k_qe_i04.descricao AS ds_qe_i04
FROM inep_enade_2023_aluno_escolaridade_pai t
LEFT JOIN inep_2023_categorias k_qe_i04 ON k_qe_i04.variavel = 'QE_I04' AND k_qe_i04.codigo = t.qe_i04::text;

CREATE VIEW inep_enade_2023_aluno_escolaridade_mae_desc AS
SELECT
    t.id_registro,
    t.nu_ano,
    t.co_curso,
    t.qe_i05,
    k_qe_i05.descricao AS ds_qe_i05
FROM inep_enade_2023_aluno_escolaridade_mae t
LEFT JOIN inep_2023_categorias k_qe_i05 ON k_qe_i05.variavel = 'QE_I05' AND k_qe_i05.codigo = t.qe_i05::text;

CREATE VIEW inep_enade_2023_aluno_renda_familiar_desc AS
SELECT
    t.id_registro,
    t.nu_ano,
    t.co_curso,
    t.qe_i08,
    k_qe_i08.descricao AS ds_qe_i08
FROM inep_enade_2023_aluno_renda_familiar t
LEFT JOIN inep_2023_categorias k_qe_i08 ON k_qe_i08.variavel = 'QE_I08' AND k_qe_i08.codigo = t.qe_i08::text;

-- Indicadores por curso: cada tabela de estudantes é agrupada por curso
-- (nu_ano, co_curso) e só depois juntada. É a forma correta de cruzar os dados do ENADE.
CREATE VIEW inep_enade_2023_indicadores_curso AS
WITH
prova AS (
    SELECT nu_ano, co_curso,
           COUNT(*) FILTER (WHERE tp_pres = 555)              AS qt_presentes,
           ROUND(AVG(nt_ger) FILTER (WHERE tp_pres = 555), 1) AS media_nota_geral,
           ROUND(AVG(nt_fg)  FILTER (WHERE tp_pres = 555), 1) AS media_nota_fg,
           ROUND(AVG(nt_ce)  FILTER (WHERE tp_pres = 555), 1) AS media_nota_ce
    FROM inep_enade_2023_aluno_resultado_prova
    GROUP BY nu_ano, co_curso
),
sexo AS (
    SELECT nu_ano, co_curso,
           ROUND(100.0 * COUNT(*) FILTER (WHERE tp_sexo = 'F')
                 / NULLIF(COUNT(*) FILTER (WHERE tp_sexo IN ('F', 'M')), 0), 1) AS pct_feminino
    FROM inep_enade_2023_aluno_sexo
    GROUP BY nu_ano, co_curso
),
idade AS (
    SELECT nu_ano, co_curso, ROUND(AVG(nu_idade), 1) AS media_idade
    FROM inep_enade_2023_aluno_idade
    GROUP BY nu_ano, co_curso
),
cor AS (
    SELECT nu_ano, co_curso,
           ROUND(100.0 * COUNT(*) FILTER (WHERE qe_i02 IN ('B', 'D', 'E'))
                 / NULLIF(COUNT(qe_i02), 0), 1) AS pct_pretos_pardos_indigenas
    FROM inep_enade_2023_aluno_cor_raca
    GROUP BY nu_ano, co_curso
),
pai AS (
    SELECT nu_ano, co_curso,
           ROUND(100.0 * COUNT(*) FILTER (WHERE qe_i04 IN ('E', 'F'))
                 / NULLIF(COUNT(qe_i04), 0), 1) AS pct_pai_com_superior
    FROM inep_enade_2023_aluno_escolaridade_pai
    GROUP BY nu_ano, co_curso
),
mae AS (
    SELECT nu_ano, co_curso,
           ROUND(100.0 * COUNT(*) FILTER (WHERE qe_i05 IN ('E', 'F'))
                 / NULLIF(COUNT(qe_i05), 0), 1) AS pct_mae_com_superior
    FROM inep_enade_2023_aluno_escolaridade_mae
    GROUP BY nu_ano, co_curso
),
renda AS (
    SELECT nu_ano, co_curso,
           ROUND(100.0 * COUNT(*) FILTER (WHERE qe_i08 IN ('A', 'B'))
                 / NULLIF(COUNT(qe_i08), 0), 1) AS pct_renda_ate_3_sm
    FROM inep_enade_2023_aluno_renda_familiar
    GROUP BY nu_ano, co_curso
)
SELECT
    nu_ano,
    co_curso,
    c.no_ies,
    c.sg_ies,
    c.ds_co_grupo        AS area_curso,
    c.ds_co_modalidade   AS modalidade,
    c.ds_co_categad      AS categoria_administrativa,
    c.ds_co_uf_curso     AS uf_curso,
    c.ds_co_regiao_curso AS regiao_curso,
    c.qt_estudantes,
    prova.qt_presentes,
    prova.media_nota_geral,
    prova.media_nota_fg,
    prova.media_nota_ce,
    sexo.pct_feminino,
    idade.media_idade,
    cor.pct_pretos_pardos_indigenas,
    pai.pct_pai_com_superior,
    mae.pct_mae_com_superior,
    renda.pct_renda_ate_3_sm
FROM inep_enade_2023_cadastro_curso_desc c
LEFT JOIN prova USING (nu_ano, co_curso)
LEFT JOIN sexo  USING (nu_ano, co_curso)
LEFT JOIN idade USING (nu_ano, co_curso)
LEFT JOIN cor   USING (nu_ano, co_curso)
LEFT JOIN pai   USING (nu_ano, co_curso)
LEFT JOIN mae   USING (nu_ano, co_curso)
LEFT JOIN renda USING (nu_ano, co_curso);
