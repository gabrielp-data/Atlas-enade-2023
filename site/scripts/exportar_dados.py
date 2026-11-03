"""
Exporta do banco os dados que o site usa.

Gera, na pasta site/dados/:
  dados.js      -> números por curso (somas e contagens, para o site agregar
                   por região, estado, município e área sem errar as médias)
  auditoria.js  -> as conferências da página "Como os dados foram tratados"
  malha.js      -> a malha do IBGE em TopoJSON (estados e municípios)

Como rodar (com o banco montado):  python site/scripts/exportar_dados.py
"""
import datetime
import getpass
import json
import os
import re

import pandas as pd
import psycopg2

AQUI = os.path.dirname(os.path.abspath(__file__))
PASTA_DADOS = os.path.join(os.path.dirname(AQUI), "dados")
SCHEMA = "gabriel"
PASTA_ENADE = r"C:\Users\gabri\Downloads\Microdados_Enade_2023\DADOS"
CADASTRO_CURSOS_CENSO = (r"C:\Users\gabri\Downloads\microdados_censo_da_educacao_superior_2023"
                         r"\microdados_censo_da_educacao_superior_2023\dados\MICRODADOS_CADASTRO_CURSOS_2023.CSV")
MALHA_TOPOJSON = os.path.join(PASTA_DADOS, "malha_br.topojson")

ARQUIVOS = {
    1: "inep_enade_2023_curso",
    2: "inep_enade_2023_aluno_formacao_academica",
    3: "inep_enade_2023_aluno_resultado_prova",
    4: "inep_enade_2023_aluno_avaliacao_curso",
    5: "inep_enade_2023_aluno_sexo",
    6: "inep_enade_2023_aluno_idade",
    8: "inep_enade_2023_aluno_cor_raca",
    10: "inep_enade_2023_aluno_escolaridade_pai",
    11: "inep_enade_2023_aluno_escolaridade_mae",
    14: "inep_enade_2023_aluno_renda_familiar",
}

# Agrupamento das 28 áreas do ENADE 2023 em grandes áreas (filtros do site)
GRANDES_AREAS = {
    "Saúde": [6, 12, 19, 23, 27, 28, 36, 55],
    "Ciências agrárias": [5, 17, 51],
    "Engenharias e arquitetura": [21, 5710, 5806, 5814, 5902, 6002, 6008, 6208, 6307, 6405, 6411],
    "Cursos de tecnologia": [69, 90, 91, 92, 95, 6410],
}

# Rede pública x privada pela categoria administrativa. No Censo 2023, a
# categoria 7 (Especial) está na rede pública e a 8 (Comunitária/Confessional) na privada.
CATEGORIAS_PUBLICAS = {1, 2, 3, 7}

SQL_CURSOS = """
WITH
prova AS (
    SELECT co_curso,
           COUNT(nt_ger) FILTER (WHERE tp_pres = 555)            AS n_ger,
           ROUND(10 * SUM(nt_ger) FILTER (WHERE tp_pres = 555))  AS s_ger,
           COUNT(nt_fg)  FILTER (WHERE tp_pres = 555)            AS n_fg,
           ROUND(10 * SUM(nt_fg)  FILTER (WHERE tp_pres = 555))  AS s_fg,
           COUNT(nt_ce)  FILTER (WHERE tp_pres = 555)            AS n_ce,
           ROUND(10 * SUM(nt_ce)  FILTER (WHERE tp_pres = 555))  AS s_ce
    FROM inep_enade_2023_aluno_resultado_prova GROUP BY co_curso),
sexo AS (
    SELECT co_curso, COUNT(*) FILTER (WHERE tp_sexo = 'F') AS n_fem,
           COUNT(*) FILTER (WHERE tp_sexo IN ('F', 'M')) AS n_sexo
    FROM inep_enade_2023_aluno_sexo GROUP BY co_curso),
idade AS (
    SELECT co_curso, SUM(nu_idade) AS s_idade, COUNT(nu_idade) AS n_idade
    FROM inep_enade_2023_aluno_idade GROUP BY co_curso),
cor AS (
    SELECT co_curso, COUNT(*) FILTER (WHERE qe_i02 IN ('B', 'D', 'E')) AS n_ppi, COUNT(qe_i02) AS n_cor
    FROM inep_enade_2023_aluno_cor_raca GROUP BY co_curso),
pai AS (
    SELECT co_curso, COUNT(*) FILTER (WHERE qe_i04 IN ('E', 'F')) AS n_pai_sup, COUNT(qe_i04) AS n_pai
    FROM inep_enade_2023_aluno_escolaridade_pai GROUP BY co_curso),
mae AS (
    SELECT co_curso, COUNT(*) FILTER (WHERE qe_i05 IN ('E', 'F')) AS n_mae_sup, COUNT(qe_i05) AS n_mae
    FROM inep_enade_2023_aluno_escolaridade_mae GROUP BY co_curso),
renda AS (
    SELECT co_curso, COUNT(*) FILTER (WHERE qe_i08 IN ('A', 'B')) AS n_renda3, COUNT(qe_i08) AS n_renda
    FROM inep_enade_2023_aluno_renda_familiar GROUP BY co_curso),
aval AS (
    SELECT a.co_curso, SUM(u.v) AS s_aval, COUNT(u.v) AS n_aval
    FROM inep_enade_2023_aluno_avaliacao_curso a
    CROSS JOIN LATERAL unnest(ARRAY[
        qe_i27, qe_i28, qe_i29, qe_i30, qe_i31, qe_i32, qe_i33, qe_i34, qe_i35, qe_i36, qe_i37, qe_i38,
        qe_i39, qe_i40, qe_i41, qe_i42, qe_i43, qe_i44, qe_i45, qe_i46, qe_i47, qe_i48, qe_i49, qe_i50,
        qe_i51, qe_i52, qe_i53, qe_i54, qe_i55, qe_i56, qe_i57, qe_i58, qe_i59, qe_i60, qe_i61, qe_i62,
        qe_i63, qe_i64, qe_i65, qe_i66, qe_i67, qe_i68]) AS u(v)
    WHERE u.v BETWEEN 1 AND 6          -- 7 = não sei e 8 = não se aplica ficam de fora
    GROUP BY a.co_curso)
SELECT c.co_curso, c.co_ies, c.co_munic_curso, c.co_uf_curso, c.co_grupo, c.co_modalidade, c.co_categad,
       c.qt_estudantes,
       prova.n_ger, prova.s_ger, prova.n_fg, prova.s_fg, prova.n_ce, prova.s_ce,
       sexo.n_fem, sexo.n_sexo, idade.s_idade, idade.n_idade, cor.n_ppi, cor.n_cor,
       pai.n_pai_sup, pai.n_pai, mae.n_mae_sup, mae.n_mae, renda.n_renda3, renda.n_renda,
       aval.s_aval, aval.n_aval
FROM inep_enade_2023_cadastro_curso c
LEFT JOIN prova USING (co_curso) LEFT JOIN sexo USING (co_curso) LEFT JOIN idade USING (co_curso)
LEFT JOIN cor USING (co_curso)   LEFT JOIN pai USING (co_curso)  LEFT JOIN mae USING (co_curso)
LEFT JOIN renda USING (co_curso) LEFT JOIN aval USING (co_curso)
ORDER BY c.co_curso
"""

MINUSCULAS = {"de", "da", "do", "das", "dos", "e", "em", "a", "o", "para", "na", "no", "à", "ao"}


def nome_bonito(texto):
    """'UNIVERSIDADE FEDERAL DE MATO GROSSO' -> 'Universidade Federal de Mato Grosso'"""
    if not texto:
        return texto
    if texto != texto.upper():
        return texto.strip()
    palavras = texto.strip().lower().split()
    return " ".join(p if (i > 0 and p in MINUSCULAS) else p[:1].upper() + p[1:] for i, p in enumerate(palavras))


def contar_linhas(caminho):
    """Linhas de dados do arquivo (sem o cabeçalho)."""
    n, ultimo = 0, b"\n"
    with open(caminho, "rb") as f:
        for bloco in iter(lambda: f.read(1 << 20), b""):
            n += bloco.count(b"\n")
            ultimo = bloco[-1:]
    if ultimo != b"\n":
        n += 1
    return n - 1


def colunas(cur, tabela):
    cur.execute("""SELECT column_name FROM information_schema.columns
                   WHERE table_schema = %s AND table_name = %s ORDER BY ordinal_position""", (SCHEMA, tabela))
    return [r[0] for r in cur.fetchall()]


def escrever_js(nome, variavel, conteudo):
    with open(os.path.join(PASTA_DADOS, nome), "w", encoding="utf-8") as f:
        f.write(f"window.{variavel} = ")
        f.write(conteudo if isinstance(conteudo, str) else json.dumps(conteudo, ensure_ascii=False, separators=(",", ":")))
        f.write(";\n")


def montar_auditoria(cur, cursos):
    print("Conferindo os dados para a página de auditoria...")
    arquivos = []
    for n, tabela in ARQUIVOS.items():
        caminho = os.path.join(PASTA_ENADE, f"microdados2023_arq{n}.txt")
        with open(caminho, encoding="latin1") as f:
            cab = [c.strip().lower() for c in f.readline().split(";")]
        cur.execute(f"SELECT COUNT(*) FROM {tabela}")
        linhas_banco = cur.fetchone()[0]
        cols_banco = [c for c in colunas(cur, tabela) if c != "id_registro"]
        arquivos.append({"arquivo": f"microdados2023_arq{n}.txt", "tabela": tabela,
                         "linhas_arquivo": contar_linhas(caminho), "linhas_banco": linhas_banco,
                         "colunas_arquivo": len(cab), "colunas_banco": len(cols_banco),
                         "colunas_iguais": sorted(cab) == sorted(cols_banco)})

    cur.execute("SELECT COUNT(DISTINCT variavel), COUNT(*) FROM inep_2023_categorias")
    variaveis, codigos = cur.fetchone()
    cur.execute("SELECT DISTINCT variavel FROM inep_2023_categorias")
    codificadas = {r[0] for r in cur.fetchall()}
    sem_significado = 0
    for tabela in ["inep_censo_2023_ies", "inep_enade_2023_cadastro_curso"] + list(ARQUIVOS.values()):
        for c in colunas(cur, tabela):
            if c.upper() in codificadas:
                cur.execute(f"""SELECT COUNT(*) FROM {tabela} t LEFT JOIN inep_2023_categorias k
                                ON k.variavel = %s AND k.codigo = t.{c}::text
                                WHERE t.{c} IS NOT NULL AND k.codigo IS NULL""", (c.upper(),))
                sem_significado += cur.fetchone()[0]

    cur.execute("""SELECT COUNT(*) FROM (
                     SELECT co_curso FROM inep_enade_2023_curso GROUP BY co_curso
                     HAVING COUNT(DISTINCT ROW(co_ies, co_categad, co_orgacad, co_grupo, co_modalidade,
                                               co_munic_curso, co_uf_curso, co_regiao_curso)) > 1) x""")
    curso_inconsistente = cur.fetchone()[0]

    cur.execute("""SELECT COUNT(*) FROM inep_enade_2023_aluno_resultado_prova
                   WHERE nt_ger NOT BETWEEN 0 AND 100 OR nt_fg NOT BETWEEN 0 AND 100 OR nt_ce NOT BETWEEN 0 AND 100""")
    notas_fora = cur.fetchone()[0]

    cur.execute("""SELECT contype, convalidated, COUNT(*) FROM pg_constraint
                   WHERE connamespace = %s::regnamespace AND contype IN ('p', 'f') GROUP BY 1, 2""", (SCHEMA,))
    chaves = {"pk": 0, "fk": 0, "fk_not_valid": 0}
    for tipo, valida, n in cur.fetchall():
        chaves["pk" if tipo == "p" else "fk"] += n
        if tipo == "f" and not valida:
            chaves["fk_not_valid"] += n

    cur.execute("""SELECT c.co_ies, COUNT(*), SUM(c.qt_estudantes) FROM inep_enade_2023_cadastro_curso c
                   LEFT JOIN inep_censo_2023_ies i ON i.co_ies = c.co_ies
                   WHERE i.co_ies IS NULL GROUP BY c.co_ies ORDER BY c.co_ies""")
    ies_fora = [[int(a), int(b), int(c)] for a, b, c in cur.fetchall()]

    cur.execute("""SELECT r.tp_pres, k.descricao, COUNT(*) FROM inep_enade_2023_aluno_resultado_prova r
                   LEFT JOIN inep_2023_categorias k ON k.variavel = 'TP_PRES' AND k.codigo = r.tp_pres::text
                   GROUP BY 1, 2 ORDER BY 3 DESC""")
    presenca = [[int(a), b, int(c)] for a, b, c in cur.fetchall()]

    pub = [i for i, cat in enumerate(cursos["co_categad"]) if cat in CATEGORIAS_PUBLICAS]
    ead = [i for i, mo in enumerate(cursos["co_modalidade"]) if mo == 0]
    soma = lambda idx: sum(cursos["qt_estudantes"][i] for i in idx)
    total = len(cursos["co_curso"])
    return {
        "gerado_em": datetime.datetime.now().strftime("%d/%m/%Y"),
        "arquivos": arquivos,
        "estudantes": sum(cursos["qt_estudantes"]),
        "cursos": total,
        "categorias": {"variaveis": variaveis, "codigos": codigos, "sem_significado": sem_significado},
        "curso_inconsistente": curso_inconsistente,
        "notas_fora": notas_fora,
        "chaves": chaves,
        "ies_fora": ies_fora,
        "presenca": presenca,
        "cursos_poucos_presentes": sum(1 for n in cursos["n_ger"] if n < 20),
        "rede": {"publica": [len(pub), soma(pub)], "privada": [total - len(pub), sum(cursos["qt_estudantes"]) - soma(pub)]},
        "modalidade": {"ead": [len(ead), soma(ead)], "presencial": [total - len(ead), sum(cursos["qt_estudantes"]) - soma(ead)]},
    }


def main():
    senha = os.environ.get("PGPASSWORD") or getpass.getpass("Senha do PostgreSQL: ")
    conn = psycopg2.connect(host="localhost", dbname="postgres", user="postgres", password=senha,
                            options=f"-csearch_path={SCHEMA}")
    cur = conn.cursor()

    print("Lendo os cursos...")
    cur.execute(SQL_CURSOS)
    nomes = [d[0] for d in cur.description]
    linhas = cur.fetchall()
    cursos = {n: [int(r[i]) if r[i] is not None else 0 for r in linhas] for i, n in enumerate(nomes)}
    cursos["rede"] = [1 if c in CATEGORIAS_PUBLICAS else 2 for c in cursos["co_categad"]]

    cur.execute("SELECT codigo, descricao FROM inep_2023_categorias WHERE variavel = 'CO_GRUPO'")
    areas = {int(c): d for c, d in cur.fetchall()}
    cur.execute("SELECT codigo, descricao FROM inep_2023_categorias WHERE variavel = 'CO_CATEGAD'")
    categorias = {int(c): d for c, d in cur.fetchall()}
    cur.execute("SELECT codigo, descricao FROM inep_2023_categorias WHERE variavel = 'CO_MUNIC_CURSO'")
    municipios_inep = {int(c): d for c, d in cur.fetchall()}

    cur.execute("""SELECT co_ies, sg_ies, no_ies FROM inep_censo_2023_ies
                   WHERE co_ies IN (SELECT co_ies FROM inep_enade_2023_cadastro_curso)""")
    ies = {int(c): [s or "", nome_bonito(n)] for c, s, n in cur.fetchall()}
    for c in set(cursos["co_ies"]) - set(ies):
        ies[c] = ["", f"IES {c} (fora do Censo 2023)"]

    auditoria = montar_auditoria(cur, cursos)
    conn.close()

    print("Lendo nomes de municípios e estados (Censo 2023)...")
    censo = pd.read_csv(CADASTRO_CURSOS_CENSO, sep=";", encoding="latin1", dtype=str,
                        usecols=["CO_MUNICIPIO", "NO_MUNICIPIO", "CO_UF", "SG_UF", "NO_UF"])
    mun_nomes = (censo.dropna(subset=["CO_MUNICIPIO"]).drop_duplicates("CO_MUNICIPIO")
                 .set_index("CO_MUNICIPIO")["NO_MUNICIPIO"].to_dict())
    ufs = censo.dropna(subset=["CO_UF"]).drop_duplicates("CO_UF").set_index("CO_UF")[["SG_UF", "NO_UF"]]
    estados = {int(c): {"sigla": r.SG_UF, "nome": r.NO_UF} for c, r in ufs.iterrows()}

    municipios = {}
    for m in sorted(set(cursos["co_munic_curso"])):
        nome = mun_nomes.get(str(m))
        if not nome:
            nome = nome_bonito(re.sub(r"\s*\([A-Z]{2}\)$", "", municipios_inep.get(m, str(m))))
        municipios[m] = nome

    faltando = set(areas) - {c for cods in GRANDES_AREAS.values() for c in cods}
    if faltando:
        raise RuntimeError(f"Áreas sem grupo: {faltando}")
    grupos = [{"nome": g, "areas": [[c, areas[c]] for c in sorted(cods, key=lambda c: areas[c])]}
              for g, cods in GRANDES_AREAS.items()]

    os.makedirs(PASTA_DADOS, exist_ok=True)
    escrever_js("dados.js", "ENADE", {
        "fonte": "INEP: Microdados ENADE 2023 e Censo da Educação Superior 2023",
        "cursos": cursos, "ies": ies, "municipios": municipios, "estados": estados,
        "grupos": grupos, "categorias": categorias,
    })
    escrever_js("auditoria.js", "AUDITORIA", auditoria)
    with open(MALHA_TOPOJSON, encoding="utf-8") as f:
        escrever_js("malha.js", "MALHA", f.read().strip())

    print(f"Pronto: {len(linhas):,} cursos, {len(ies):,} IES, {len(municipios):,} municípios.")
    problemas = [a["arquivo"] for a in auditoria["arquivos"]
                 if a["linhas_arquivo"] != a["linhas_banco"] or not a["colunas_iguais"]]
    print("Auditoria:", "tudo bate com os arquivos do INEP" if not problemas else f"DIFERENÇAS em {problemas}")


if __name__ == "__main__":
    main()
