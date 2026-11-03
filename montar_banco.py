"""
TCC ENADE 2023 — MONTA O BANCO INTEIRO
=======================================

Rode este arquivo e ele faz tudo, na ordem:

   1. Cria as tabelas ................... sql/01_criar_tabelas.sql
   2. Carrega a tabela de categorias .... dicionários oficiais do INEP (Excel)
   3. Carrega o cadastro de IES ......... Censo da Educação Superior 2023
   4. Carrega os 10 arquivos do ENADE ... arq1, 2, 3, 4, 5, 6, 8, 10, 11, 14
   5. Monta o cadastro de cursos ........ sql/02_montar_cadastro_curso.sql
   6. Cria as chaves estrangeiras ....... sql/03_chaves_estrangeiras.sql
   7. Cria as views ..................... gera sql/04_views.sql
   8. Grava a descrição das colunas ..... gera sql/05_comentarios.sql
   9. Confere se está tudo certo
  10. Gera os dicionários de dados ...... dicionario/ (Excel e HTML)

Como rodar:
    python montar_banco.py                -> monta tudo (uns 3 minutos)
    python montar_banco.py --dicionario   -> só gera os dicionários de novo

A senha do PostgreSQL é pedida na hora (ou lida da variável PGPASSWORD).
"""
import datetime
import getpass
import html
import io
import os
import re
import sys
import warnings
from decimal import Decimal

import openpyxl
import pandas as pd
import psycopg2
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.hyperlink import Hyperlink

warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl")

# ── Configuração ────────────────────────────────────────────────────────────
HOST, PORTA, BANCO, USUARIO, SCHEMA = "localhost", 5432, "postgres", "postgres", "gabriel"

PASTA_ENADE = os.getenv("ENADE_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "fontes", "enade"))
PASTA_DADOS_ENADE = os.path.join(PASTA_ENADE, "DADOS")
DIC_ENADE = os.path.join(PASTA_ENADE, "1.LEIA-ME", "Dicionário_arquivos_variáveis_microdados_Enade_2023.xlsx")

PASTA_CENSO = os.getenv("CENSO_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "fontes", "censo"))
ARQ_IES = os.path.join(PASTA_CENSO, "dados", "MICRODADOS_ED_SUP_IES_2023.CSV")
DIC_CENSO = os.path.join(PASTA_CENSO, "Anexos", "ANEXO I - Dicionário de Dados", "dicionário_dados_educação_superior.xlsx")

AQUI = os.path.dirname(os.path.abspath(__file__))
PASTA_SQL = os.path.join(AQUI, "sql")
DIC_HTML = os.path.join(AQUI, "dicionario", "dicionario_dados_enade_2023.html")
DIC_EXCEL = os.path.join(AQUI, "dicionario", "dicionario_dados_enade_2023.xlsx")

# Tabela do banco -> número do arquivo do INEP (microdados2023_arqN.txt)
ARQUIVOS_ENADE = {
    "inep_enade_2023_curso": 1,
    "inep_enade_2023_aluno_formacao_academica": 2,
    "inep_enade_2023_aluno_resultado_prova": 3,
    "inep_enade_2023_aluno_avaliacao_curso": 4,
    "inep_enade_2023_aluno_sexo": 5,
    "inep_enade_2023_aluno_idade": 6,
    "inep_enade_2023_aluno_cor_raca": 8,
    "inep_enade_2023_aluno_escolaridade_pai": 10,
    "inep_enade_2023_aluno_escolaridade_mae": 11,
    "inep_enade_2023_aluno_renda_familiar": 14,
}

# Ordem em que as tabelas aparecem nos dicionários
ORDEM_TABELAS = ["inep_2023_categorias", "inep_censo_2023_ies", "inep_enade_2023_cadastro_curso"] + list(ARQUIVOS_ENADE)
VIEW_INDICADORES = "inep_enade_2023_indicadores_curso"

# Variáveis codificadas que vão para a tabela de categorias
CATEGORIAS_ENADE = (
    ["CO_CATEGAD", "CO_ORGACAD", "CO_GRUPO", "CO_MODALIDADE", "CO_UF_CURSO", "CO_REGIAO_CURSO",
     "CO_TURNO_GRADUACAO",
     "TP_PRES", "TP_PR_GER", "TP_PR_OB_FG", "TP_PR_DI_FG", "TP_PR_OB_CE", "TP_PR_DI_CE",
     "TP_SFG_D1", "TP_SCE_D1"]
    + [f"CO_RS_I{i}" for i in range(1, 10)]
    + ["TP_SEXO", "QE_I02", "QE_I04", "QE_I05", "QE_I08"]
    + [f"QE_I{i}" for i in range(27, 69)]
)
CATEGORIAS_CENSO = ["TP_ORGANIZACAO_ACADEMICA", "TP_CATEGORIA_ADMINISTRATIVA", "IN_CAPITAL_IES"]

AVISO_LINHA = ("Atenção: a linha desta tabela NÃO é o mesmo estudante da mesma linha em outra tabela, "
               "porque o INEP ordena cada arquivo de um jeito diferente (LGPD). Para cruzar informações, "
               "agrupe por curso (nu_ano, co_curso).")

DESCRICAO_TABELAS = {
    "inep_2023_categorias": "Significado de todos os códigos usados no banco (ex.: variavel TP_SEXO, codigo F = Feminino). Fonte: dicionários oficiais do INEP (ENADE 2023 e Censo da Educação Superior 2023). As views _desc já trazem esse texto pronto ao lado de cada código.",
    "inep_censo_2023_ies": "Cadastro das Instituições de Ensino Superior (IES), 1 linha por IES. Fonte: Censo da Educação Superior 2023 (MICRODADOS_ED_SUP_IES_2023.CSV).",
    "inep_enade_2023_cadastro_curso": "Cadastro dos cursos avaliados no ENADE 2023, 1 linha por curso (9.812 cursos). Montada a partir do arq1, guardando cada curso uma única vez. É a tabela central: todas as tabelas do ENADE se ligam a ela por (nu_ano, co_curso), e ela se liga às IES pelo co_ies.",
    "inep_enade_2023_curso": "Arquivo microdados2023_arq1 do INEP, sem alteração: caracterização do curso, 1 linha por estudante (os dados do curso se repetem para cada estudante). " + AVISO_LINHA,
    "inep_enade_2023_aluno_formacao_academica": "Arquivo microdados2023_arq2: informações acadêmicas (ano de conclusão do ensino médio, ano de início da graduação e turno). 1 linha por estudante. " + AVISO_LINHA,
    "inep_enade_2023_aluno_resultado_prova": "Arquivo microdados2023_arq3: presença, situação, notas e respostas da prova, mais o questionário de percepção da prova (CO_RS_I1 a I9). 1 linha por estudante. " + AVISO_LINHA,
    "inep_enade_2023_aluno_avaliacao_curso": "Arquivo microdados2023_arq4: avaliação do estudante sobre o curso, questões QE_I27 a QE_I68 (1 = discordo totalmente ... 6 = concordo totalmente, 7 = não sei, 8 = não se aplica). 1 linha por estudante. " + AVISO_LINHA,
    "inep_enade_2023_aluno_sexo": "Arquivo microdados2023_arq5: sexo do estudante (TP_SEXO). 1 linha por estudante. " + AVISO_LINHA,
    "inep_enade_2023_aluno_idade": "Arquivo microdados2023_arq6: idade do estudante no dia da prova (NU_IDADE). 1 linha por estudante. " + AVISO_LINHA,
    "inep_enade_2023_aluno_cor_raca": "Arquivo microdados2023_arq8: cor ou raça declarada (QE_I02). 1 linha por estudante. " + AVISO_LINHA,
    "inep_enade_2023_aluno_escolaridade_pai": "Arquivo microdados2023_arq10: escolaridade do pai (QE_I04). 1 linha por estudante. " + AVISO_LINHA,
    "inep_enade_2023_aluno_escolaridade_mae": "Arquivo microdados2023_arq11: escolaridade da mãe (QE_I05). 1 linha por estudante. " + AVISO_LINHA,
    "inep_enade_2023_aluno_renda_familiar": "Arquivo microdados2023_arq14: renda total da família (QE_I08). 1 linha por estudante. " + AVISO_LINHA,
    VIEW_INDICADORES: "Indicadores por curso (1 linha por curso): junta todas as tabelas de estudantes da forma correta, agrupando cada uma por (nu_ano, co_curso). Ex.: nota média, % mulheres, idade média, % renda até 3 salários mínimos. É a base para as análises do TCC.",
}

DESCRICAO_MANUAL = {
    "id_registro": "Número da linha no arquivo original do INEP (chave primária). Identifica a linha só dentro desta tabela: não liga com outras tabelas.",
    "qt_estudantes": "Quantidade de estudantes do curso nos microdados do ENADE 2023 (inclui ausentes).",
    "variavel": "Nome da variável no dicionário do INEP (ex.: TP_SEXO, QE_I08) — parte da chave primária.",
    "codigo": "Código como aparece nos dados (ex.: F, 555, A) — parte da chave primária.",
    "descricao": "Significado do código, conforme o dicionário oficial do INEP.",
    # colunas da view de indicadores
    "area_curso": "Área de enquadramento do curso no Enade (texto de CO_GRUPO).",
    "modalidade": "Modalidade de ensino do curso: Presencial ou EaD (texto de CO_MODALIDADE).",
    "categoria_administrativa": "Categoria administrativa da IES (texto de CO_CATEGAD).",
    "uf_curso": "Estado onde o curso funciona (texto de CO_UF_CURSO).",
    "regiao_curso": "Região onde o curso funciona (texto de CO_REGIAO_CURSO).",
    "qt_presentes": "Quantidade de estudantes presentes com resultado válido (TP_PRES = 555).",
    "media_nota_geral": "Média da nota geral (NT_GER, de 0 a 100) dos presentes com resultado válido.",
    "media_nota_fg": "Média da nota de Formação Geral (NT_FG, de 0 a 100) dos presentes com resultado válido.",
    "media_nota_ce": "Média da nota de Componente Específico (NT_CE, de 0 a 100) dos presentes com resultado válido.",
    "pct_feminino": "% de estudantes do sexo feminino (entre os de sexo F ou M).",
    "media_idade": "Idade média dos estudantes do curso.",
    "pct_pretos_pardos_indigenas": "% de estudantes que se declararam pretos, pardos ou indígenas (QE_I02 = B, D ou E), entre os que responderam.",
    "pct_pai_com_superior": "% de estudantes cujo pai tem ensino superior (QE_I04 = E ou F), entre os que responderam.",
    "pct_mae_com_superior": "% de estudantes cuja mãe tem ensino superior (QE_I05 = E ou F), entre os que responderam.",
    "pct_renda_ate_3_sm": "% de estudantes com renda familiar de até 3 salários mínimos (QE_I08 = A ou B), entre os que responderam.",
}

# Estudo dos tipos de dados do PostgreSQL (tarefa 6)
#   (tipo, nome no DBeaver, tamanho, faixa, para que serve, usado no TCC, prefixo para contar colunas)
TIPOS_POSTGRES = [
    ("SMALLINT", "int2", "2 bytes", "−32.768 a 32.767",
     "Números inteiros pequenos: anos, idade, códigos curtos e escalas.", "Sim", "SMALLINT"),
    ("INTEGER", "int4", "4 bytes", "−2.147.483.648 a 2.147.483.647",
     "Números inteiros grandes: código do curso, do município, da IES e contagens.", "Sim", "INTEGER"),
    ("BIGINT", "int8", "8 bytes", "cerca de ±9,2 quintilhões",
     "Inteiros enormes. O COUNT do PostgreSQL devolve BIGINT.", "Só na view de indicadores (contagem)", "BIGINT"),
    ("NUMERIC(p,s)", "numeric", "variável (2 bytes a cada 4 dígitos + 3 a 8 bytes)",
     "p dígitos no total, s depois da vírgula. Ex.: NUMERIC(4,1) vai até 999,9",
     "Decimais exatos: notas, valores em dinheiro.", "Sim (notas)", "NUMERIC"),
    ("REAL", "float4", "4 bytes", "cerca de 6 dígitos de precisão (aproximado)",
     "Medidas em que pequenos erros de arredondamento não importam.", "Não — notas precisam ser exatas", "REAL"),
    ("DOUBLE PRECISION", "float8", "8 bytes", "cerca de 15 dígitos de precisão (aproximado)",
     "Cálculos científicos.", "Não", "DOUBLE"),
    ("CHAR(n)", "bpchar", "n caracteres (tamanho fixo)", "sempre n caracteres (completa com espaços)",
     "Códigos de tamanho fixo: sexo, letra da resposta, sigla da UF.", "Sim", "CHAR("),
    ("VARCHAR(n)", "varchar", "até n caracteres (ocupa só o tamanho do texto + 1 byte)", "até n caracteres",
     "Textos de tamanho variável com limite: nomes, vetores de respostas.", "Sim", "VARCHAR"),
    ("TEXT", "text", "variável, sem limite", "sem limite de tamanho",
     "Textos longos sem tamanho máximo definido.", "Não — VARCHAR(n) documenta o tamanho máximo", "TEXT"),
    ("BOOLEAN", "bool", "1 byte", "verdadeiro / falso",
     "Indicadores sim/não.", "Não — o INEP usa 0/1 (ex.: IN_CAPITAL_IES), mantido como no dicionário", "BOOLEAN"),
    ("DATE", "date", "4 bytes", "datas (dia/mês/ano)",
     "Datas.", "Não — os microdados não têm datas", "DATE"),
]


# ── Utilidades ──────────────────────────────────────────────────────────────
def conectar():
    senha = os.environ.get("PGPASSWORD") or getpass.getpass("Senha do PostgreSQL: ")
    conn = psycopg2.connect(host=HOST, port=PORTA, dbname=BANCO, user=USUARIO, password=senha,
                            options=f"-csearch_path={SCHEMA}")
    conn.set_client_encoding("UTF8")
    return conn


def passo(n, texto):
    print(f"\n[{n:>2}] {texto}", flush=True)


def executar_arquivo_sql(cur, nome):
    with open(os.path.join(PASTA_SQL, nome), encoding="utf-8") as f:
        cur.execute(f.read())


def colunas(cur, tabela):
    cur.execute("""SELECT column_name FROM information_schema.columns
                   WHERE table_schema = %s AND table_name = %s ORDER BY ordinal_position""",
                (SCHEMA, tabela))
    return [r[0] for r in cur.fetchall()]


def copiar(cur, tabela, df):
    """Carga rápida com COPY. Texto vazio vira NULL."""
    buf = io.StringIO()
    df.to_csv(buf, index=False, header=False)
    buf.seek(0)
    cur.copy_expert(f"COPY {tabela} ({', '.join(df.columns)}) FROM STDIN WITH (FORMAT csv, NULL '')", buf)


def ler_csv(caminho):
    df = pd.read_csv(caminho, sep=";", encoding="latin1", dtype=str, keep_default_na=False)
    df.columns = [c.strip().lower() for c in df.columns]
    return df.apply(lambda s: s.str.strip())


def br(valor):
    """Formata número no padrão brasileiro: 406.294 / 77,7"""
    if valor is None:
        return ""
    if isinstance(valor, int):
        return f"{valor:,}".replace(",", ".")
    if isinstance(valor, (Decimal, float)):
        inteiro = valor == int(valor)
        texto = f"{valor:,.0f}" if inteiro else f"{valor:,.1f}"
        return texto.replace(",", "X").replace(".", ",").replace("X", ".")
    return str(valor)


# ── Leitura dos dicionários oficiais ────────────────────────────────────────
def interpretar_categoria(linha):
    """'A = Muito fácil.' / '1. Pública Federal' / '222 = Ausente**'  ->  (codigo, texto)"""
    linha = linha.strip()
    m = re.match(r"^(\S+?)\s*=\s*(.+)$", linha) or re.match(r"^(\d+)\.\s+(.+)$", linha)
    if not m:
        return None
    codigo, texto = m.group(1).strip(), m.group(2).strip()
    if not re.fullmatch(r"[0-9]+|[A-Z]|\*|\.", codigo):
        return None
    nota = ""
    if texto.endswith("**"):
        texto, nota = texto[:-2], " (não conta para a nota)"
    elif texto.endswith("*"):
        texto, nota = texto[:-1], " (conta para a nota)"
    return codigo, " ".join(texto.split()).rstrip(".").strip() + nota


def ler_dicionario_enade():
    """Devolve descrições, categorias, municípios e tamanhos das variáveis do ENADE."""
    wb = openpyxl.load_workbook(DIC_ENADE, read_only=True)
    descricoes, categorias, tamanhos, atual = {}, {}, {}, None
    for row in wb["DICIONÁRIO DE VARIÁVEIS"].iter_rows(values_only=True):
        row = list(row) + [None] * 5
        nome, tam, desc, cat = row[0], row[2], row[3], row[4]
        if isinstance(nome, str) and re.fullmatch(r"[A-Z][A-Z0-9_]*", nome.strip()) and nome.strip() != "NOME":
            atual = nome.strip()
            descricoes[atual] = " ".join(str(desc).split()) if desc else ""
            categorias[atual] = []
            tamanhos[atual] = tam
        elif nome is not None:
            atual = None  # linha de título de seção
        if atual and cat:
            for linha in str(cat).splitlines():
                item = interpretar_categoria(linha)
                if item:
                    categorias[atual].append(item)
    municipios = []
    for row in wb["MUNICÍPIOS"].iter_rows(values_only=True):
        row = list(row) + [None] * 4
        codigo, nome, uf = row[1], row[2], row[3]  # a planilha começa na coluna B
        if codigo is not None and str(codigo).strip().isdigit():
            municipios.append((str(int(codigo)), f"{str(nome).strip()} ({str(uf).strip()})"))
    wb.close()
    return descricoes, categorias, municipios, tamanhos


def ler_dicionario_censo():
    """Devolve descrições, categorias e tamanhos das variáveis do cadastro de IES do Censo."""
    wb = openpyxl.load_workbook(DIC_CENSO, read_only=True)
    descricoes, categorias, tamanhos = {}, {}, {}
    for row in wb["cadastro_ies"].iter_rows(values_only=True):
        row = list(row) + [None] * 6
        nome = row[1]
        if isinstance(nome, str) and re.fullmatch(r"[A-Z][A-Z0-9_]*", nome.strip()):
            nome = nome.strip()
            descricoes[nome] = " ".join(str(row[2]).split()) if row[2] else ""
            tamanhos[nome] = row[4]
            itens = [interpretar_categoria(l) for l in str(row[5] or "").splitlines()]
            categorias[nome] = [i for i in itens if i]
    wb.close()
    return descricoes, categorias, tamanhos


# ── Passos da montagem ──────────────────────────────────────────────────────
def carregar_categorias(cur, cats_enade, municipios, cats_censo):
    linhas = []
    for var in CATEGORIAS_ENADE:
        if not cats_enade.get(var):
            raise RuntimeError(f"Sem categorias no dicionário do ENADE para {var}")
        linhas += [(var, c, t) for c, t in cats_enade[var]]
    if not municipios:
        raise RuntimeError("Não foi possível ler a aba MUNICÍPIOS do dicionário do ENADE")
    linhas += [("CO_MUNIC_CURSO", c, t) for c, t in municipios]
    for var in CATEGORIAS_CENSO:
        if not cats_censo.get(var):
            raise RuntimeError(f"Sem categorias no dicionário do Censo para {var}")
        linhas += [(var, c, t) for c, t in cats_censo[var]]
    df = pd.DataFrame(linhas, columns=["variavel", "codigo", "descricao"]).drop_duplicates(["variavel", "codigo"])
    copiar(cur, "inep_2023_categorias", df)
    print(f"     {len(df):,} códigos de {df['variavel'].nunique()} variáveis")


def carregar_ies(cur):
    df = ler_csv(ARQ_IES)
    copiar(cur, "inep_censo_2023_ies", df[colunas(cur, "inep_censo_2023_ies")])
    print(f"     {len(df):,} IES")


def carregar_arquivos_enade(cur):
    for tabela, n in ARQUIVOS_ENADE.items():
        df = ler_csv(os.path.join(PASTA_DADOS_ENADE, f"microdados2023_arq{n}.txt"))
        cols = colunas(cur, tabela)
        faltando = [c for c in cols if c != "id_registro" and c not in df.columns]
        sobrando = [c for c in df.columns if c not in cols]
        if faltando or sobrando:
            raise RuntimeError(f"arq{n}: colunas diferentes da tabela. Faltando={faltando} Sobrando={sobrando}")
        df.insert(0, "id_registro", range(1, len(df) + 1))
        copiar(cur, tabela, df[cols])
        print(f"     arq{n:<2} -> {tabela}: {len(df):,} linhas, {len(cols) - 1} colunas")


def gerar_views(cur):
    cur.execute("SELECT DISTINCT variavel FROM inep_2023_categorias")
    codificadas = {r[0] for r in cur.fetchall()}
    sql = ["-- =====================================================================",
           "-- TCC ENADE 2023 — PASSO 4: VIEWS (arquivo gerado pelo montar_banco.py)",
           "--",
           "-- Views _desc: a mesma tabela, com uma coluna ds_<código> ao lado de cada",
           "-- código trazendo o significado em texto (vem de inep_2023_categorias).",
           "-- View de indicadores: 1 linha por curso, cruzando as tabelas corretamente.",
           "-- =====================================================================",
           "", f"SET search_path TO {SCHEMA};", ""]
    for tabela in ORDEM_TABELAS[1:]:
        cols = colunas(cur, tabela)
        if not any(c.upper() in codificadas for c in cols):
            continue
        select, joins = [], []
        for c in cols:
            select.append(f"t.{c}")
            if c == "co_ies" and tabela != "inep_censo_2023_ies":
                select += ["ies.no_ies", "ies.sg_ies"]
                joins.append("LEFT JOIN inep_censo_2023_ies ies ON ies.co_ies = t.co_ies")
            if c.upper() in codificadas:
                a = f"k_{c}"
                select.append(f"{a}.descricao AS ds_{c}")
                joins.append(f"LEFT JOIN inep_2023_categorias {a} ON {a}.variavel = '{c.upper()}' AND {a}.codigo = t.{c}::text")
        sql.append(f"CREATE VIEW {tabela}_desc AS\nSELECT\n    " + ",\n    ".join(select)
                   + f"\nFROM {tabela} t\n" + "\n".join(joins) + ";\n")
    sql.append(SQL_VIEW_INDICADORES)
    texto = "\n".join(sql)
    with open(os.path.join(PASTA_SQL, "04_views.sql"), "w", encoding="utf-8") as f:
        f.write(texto)
    cur.execute(texto)


SQL_VIEW_INDICADORES = f"""-- Indicadores por curso: cada tabela de estudantes é agrupada por curso
-- (nu_ano, co_curso) e só depois juntada. É a forma correta de cruzar os dados do ENADE.
CREATE VIEW {VIEW_INDICADORES} AS
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
"""


def descrever_coluna(tabela, col, desc_enade, desc_censo):
    if col in DESCRICAO_MANUAL:
        return DESCRICAO_MANUAL[col]
    if col.startswith("ds_") and not col.startswith("ds_vt_"):
        origem = col[3:]
        base = desc_enade.get(origem.upper()) or desc_censo.get(origem.upper())
        if base:
            return f"Significado em texto do código {origem}. ({base})"
    texto = desc_enade.get(col.upper()) or desc_censo.get(col.upper())
    if not texto:
        return None
    base_tabela = tabela.removesuffix("_desc")
    if col in ("nu_ano", "co_curso") and base_tabela == "inep_enade_2023_cadastro_curso":
        texto += " — chave primária (nu_ano + co_curso)"
    elif col in ("nu_ano", "co_curso") and base_tabela in ARQUIVOS_ENADE:
        texto += " — chave estrangeira (nu_ano + co_curso): liga com inep_enade_2023_cadastro_curso"
    elif col == "co_ies" and base_tabela == "inep_censo_2023_ies":
        texto += " — chave primária"
    elif col == "co_ies" and base_tabela in ("inep_enade_2023_cadastro_curso", "inep_enade_2023_curso"):
        texto += " — chave estrangeira: liga com inep_censo_2023_ies"
    return texto


SEPARADOR_CODIGOS = " | Códigos: "


def texto_codigos(variavel, itens):
    """Significado dos códigos, para aparecer no comentário da coluna no DBeaver."""
    if len(itens) <= 12:
        return SEPARADOR_CODIGOS + "; ".join(f"{c} = {d}" for c, d in itens)
    return SEPARADOR_CODIGOS + f"{len(itens)} códigos — veja a tabela inep_2023_categorias (variavel = '{variavel}')"


def gerar_comentarios(cur, desc_enade, desc_censo):
    cur.execute("""SELECT variavel, codigo, descricao FROM inep_2023_categorias
                   ORDER BY variavel, CASE WHEN codigo ~ '^[0-9]+$' THEN lpad(codigo, 10, '0') ELSE codigo END""")
    cats = {}
    for v, c, d in cur.fetchall():
        cats.setdefault(v, []).append((c, d))
    cur.execute("""SELECT c.relname, c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                   WHERE n.nspname = %s AND c.relkind IN ('r','v') ORDER BY c.relname""", (SCHEMA,))
    objetos = cur.fetchall()
    sql = ["-- TCC ENADE 2023 — PASSO 5: DESCRIÇÕES (arquivo gerado pelo montar_banco.py)",
           "-- Aparecem no DBeaver na coluna 'Comment' das tabelas e colunas.", "",
           f"SET search_path TO {SCHEMA};", ""]
    sem_descricao = []
    for nome, tipo in objetos:
        if tipo == "v" and nome.endswith("_desc"):
            desc = (f"Mesmos dados de {nome.removesuffix('_desc')}, com uma coluna ds_ ao lado de cada "
                    "código trazendo o significado em texto. Use esta view para ler e consultar os dados.")
        else:
            desc = DESCRICAO_TABELAS.get(nome)
        if not desc:
            sem_descricao.append(nome)
            continue
        objeto = "VIEW" if tipo == "v" else "TABLE"
        sql.append(cur.mogrify(f"COMMENT ON {objeto} {nome} IS %s;", (desc,)).decode())
        for col in colunas(cur, nome):
            d = descrever_coluna(nome, col, desc_enade, desc_censo)
            if not d:
                sem_descricao.append(f"{nome}.{col}")
                continue
            if col.upper() in cats and nome != "inep_2023_categorias":
                d += texto_codigos(col.upper(), cats[col.upper()])
            sql.append(cur.mogrify(f"COMMENT ON COLUMN {nome}.{col} IS %s;", (d,)).decode())
        sql.append("")
    texto = "\n".join(sql)
    with open(os.path.join(PASTA_SQL, "05_comentarios.sql"), "w", encoding="utf-8") as f:
        f.write(texto)
    cur.execute(texto)
    return sem_descricao


def conferir(cur, sem_descricao):
    problemas = []
    print("     Linhas por tabela:")
    for t in ORDEM_TABELAS:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        print(f"       {t:<45} {cur.fetchone()[0]:>9,}")
    for t in ARQUIVOS_ENADE:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        if cur.fetchone()[0] != 406294:
            problemas.append(f"{t} não tem 406.294 linhas")
    cur.execute("SELECT COUNT(*) FROM inep_enade_2023_cadastro_curso")
    if cur.fetchone()[0] != 9812:
        problemas.append("cadastro de cursos não tem 9.812 cursos")

    cur.execute("SELECT DISTINCT variavel FROM inep_2023_categorias")
    codificadas = {r[0] for r in cur.fetchall()}
    for t in ORDEM_TABELAS[1:]:
        for c in colunas(cur, t):
            if c.upper() in codificadas:
                cur.execute(f"""SELECT COUNT(*) FROM {t} t LEFT JOIN inep_2023_categorias k
                                ON k.variavel = %s AND k.codigo = t.{c}::text
                                WHERE t.{c} IS NOT NULL AND k.codigo IS NULL""", (c.upper(),))
                n = cur.fetchone()[0]
                if n:
                    problemas.append(f"{t}.{c}: {n} linhas com código sem significado")

    cur.execute("""SELECT COUNT(DISTINCT c.co_ies), COUNT(*) FROM inep_enade_2023_cadastro_curso c
                   LEFT JOIN inep_censo_2023_ies i ON i.co_ies = c.co_ies WHERE i.co_ies IS NULL""")
    ies, cursos = cur.fetchone()
    print(f"     IES do ENADE que não estão no Censo 2023 (FK NOT VALID): {ies} IES, {cursos} cursos")

    cur.execute("""SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                   WHERE n.nspname = %s AND c.relkind = 'v'""", (SCHEMA,))
    for (v,) in cur.fetchall():
        cur.execute(f"SELECT * FROM {v} LIMIT 1")
    if sem_descricao:
        problemas.append(f"sem descrição: {sem_descricao}")

    if problemas:
        print("\n     PROBLEMAS ENCONTRADOS:")
        for p in problemas:
            print("      -", p)
        raise SystemExit(1)
    print("     Tudo certo: contagens batem, todos os códigos têm significado, todas as colunas têm descrição.")


# ── Leitura do banco para os dicionários ────────────────────────────────────
def tipo_bonito(tipo):
    """'character varying(200)' -> 'VARCHAR(200)'; 'character(1)' -> 'CHAR(1)'"""
    return tipo.replace("character varying", "varchar").replace("character", "char").upper()


def ler_metadados(cur):
    """Lê do catálogo do PostgreSQL tudo o que o DBeaver mostra: tabelas, colunas, tipos, chaves e comentários."""
    cur.execute("""SELECT c.oid, c.relname, c.relkind, obj_description(c.oid, 'pg_class'),
                          CASE WHEN c.relkind = 'r' THEN pg_total_relation_size(c.oid) END
                   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                   WHERE n.nspname = %s AND c.relkind IN ('r','v')""", (SCHEMA,))
    objetos = []
    for oid, nome, tipo, comentario, tamanho in cur.fetchall():
        base = nome.removesuffix("_desc")
        pos = ORDEM_TABELAS.index(base) if base in ORDEM_TABELAS else 99
        objetos.append({"oid": oid, "nome": nome, "tipo": tipo, "comentario": comentario or "",
                        "bytes": tamanho, "ordem": (tipo != "r", pos, nome)})
    objetos.sort(key=lambda o: o["ordem"])

    for o in objetos:
        cur.execute("""SELECT a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull,
                              col_description(a.attrelid, a.attnum)
                       FROM pg_attribute a WHERE a.attrelid = %s AND a.attnum > 0 AND NOT a.attisdropped
                       ORDER BY a.attnum""", (o["oid"],))
        # os códigos já aparecem em coluna própria nos dicionários, então saem da descrição
        o["colunas"] = [{"nome": n, "tipo": tipo_bonito(t), "notnull": nn,
                         "comentario": (c or "").split(SEPARADOR_CODIGOS)[0]}
                        for n, t, nn, c in cur.fetchall()]
        if o["tipo"] == "r":
            cur.execute(f"SELECT COUNT(*) FROM {o['nome']}")
            o["linhas"] = cur.fetchone()[0]

    cur.execute("""
        SELECT con.conrelid::regclass::text, con.conname, con.contype, con.convalidated,
               ARRAY(SELECT a.attname FROM unnest(con.conkey) WITH ORDINALITY k(n, ord)
                     JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.n ORDER BY k.ord),
               CASE WHEN con.contype = 'f' THEN con.confrelid::regclass::text END,
               ARRAY(SELECT a.attname FROM unnest(con.confkey) WITH ORDINALITY k(n, ord)
                     JOIN pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = k.n ORDER BY k.ord)
        FROM pg_constraint con JOIN pg_namespace n ON n.oid = con.connamespace
        WHERE n.nspname = %s AND con.contype IN ('p', 'f')
        ORDER BY con.contype DESC, con.conname""", (SCHEMA,))
    restricoes = [{"tabela": t.split(".")[-1], "nome": nome, "tipo": tp, "valida": val, "colunas": list(cols),
                   "ref": (ref or "").split(".")[-1], "ref_colunas": list(refcols or [])}
                  for t, nome, tp, val, cols, ref, refcols in cur.fetchall()]
    chaves = {}
    for r in restricoes:
        for c in r["colunas"]:
            chaves.setdefault((r["tabela"], c), []).append(r)

    cur.execute("""SELECT variavel, codigo, descricao FROM inep_2023_categorias
                   ORDER BY variavel, CASE WHEN codigo ~ '^[0-9]+$' THEN lpad(codigo, 10, '0') ELSE codigo END""")
    cats = {}
    for v, c, d in cur.fetchall():
        cats.setdefault(v, []).append((c, d))
    return objetos, restricoes, chaves, cats


def ler_estatisticas(cur, objeto, cats):
    """Para cada coluna: linhas vazias, menor/maior valor, maior texto, valor mais comum, nº de códigos."""
    partes, chaves = [], []
    for col in objeto["colunas"]:
        n, t = col["nome"], col["tipo"]
        partes.append(f"COUNT(*) - COUNT({n})"); chaves.append((n, "vazios"))
        if n.upper() in cats:
            partes.append(f"COUNT(DISTINCT {n})"); chaves.append((n, "distintos"))
        if t.startswith(("SMALLINT", "INTEGER", "BIGINT", "NUMERIC")):
            partes += [f"MIN({n})", f"MAX({n})"]; chaves += [(n, "min"), (n, "max")]
        elif n.upper() not in cats:
            partes += [f"MAX(LENGTH({n}))", f"MODE() WITHIN GROUP (ORDER BY {n})"]
            chaves += [(n, "maxlen"), (n, "moda")]
    cur.execute(f"SELECT {', '.join(partes)} FROM {objeto['nome']}")
    est = {}
    for (n, k), v in zip(chaves, cur.fetchone()):
        est.setdefault(n, {})[k] = v
    return est


def descrever_chave(objeto_nome, col, chaves):
    textos = []
    for r in chaves.get((objeto_nome, col), []):
        if r["tipo"] == "p":
            textos.append("PK" if len(r["colunas"]) == 1 else f"PK ({' + '.join(r['colunas'])})")
        else:
            extra = " — NOT VALID" if not r["valida"] else ""
            textos.append(f"FK → {r['ref']}{extra}")
    return "\n".join(textos)


# ── Dicionário HTML ─────────────────────────────────────────────────────────
def gerar_dicionario_html(objetos, chaves, cats):
    e = html.escape
    indice = {"r": [], "v": []}
    blocos = []
    total_colunas = 0
    for o in objetos:
        nome, tipo = o["nome"], o["tipo"]
        indice[tipo].append(nome)
        contagem = f'<span class="pill">{br(o["linhas"])} linhas</span>' if tipo == "r" else ""
        linhas = []
        for col in o["colunas"]:
            total_colunas += 1
            tags = ""
            for r in chaves.get((nome, col["nome"]), []):
                if r["tipo"] == "p":
                    tags += '<span class="k pk">PK</span>'
                else:
                    extra = " (NOT VALID)" if not r["valida"] else ""
                    tags += f'<span class="k fk">FK → {e(r["ref"])}{extra}</span>'
            lista = ""
            if tipo == "r" and nome != "inep_2023_categorias" and col["nome"].upper() in cats:
                itens = cats[col["nome"].upper()]
                lis = "".join(f"<li><code>{e(c)}</code> {e(d)}</li>" for c, d in itens[:40])
                if len(itens) > 40:
                    lis += f'<li class="mais">… e mais {br(len(itens) - 40)} códigos — veja inep_2023_categorias</li>'
                aberto = " open" if len(itens) <= 8 else ""
                lista = f'<details{aberto}><summary>{br(len(itens))} códigos</summary><ul class="cats">{lis}</ul></details>'
            linhas.append(f"<tr><td class='col'>{e(col['nome'])}</td><td class='tipo'>{e(col['tipo'])}</td>"
                          f"<td>{tags}</td><td>{e(col['comentario'])}{lista}</td></tr>")
        rotulo = "tabela" if tipo == "r" else "view"
        blocos.append(f"""
<section class="obj" id="{e(nome)}">
  <header><h3>{e(nome)}</h3><span class="pill {rotulo}">{rotulo}</span>{contagem}</header>
  <p class="objdesc">{e(o['comentario'])}</p>
  <div class="scroll"><table>
    <thead><tr><th>Coluna</th><th>Tipo</th><th>Chave</th><th>Descrição</th></tr></thead>
    <tbody>{''.join(linhas)}</tbody>
  </table></div>
</section>""")

    tipos_html = "".join(f"<tr><td class='tipo'>{e(t[0])}</td><td>{e(t[2])}</td><td>{e(t[3])}</td><td>{e(t[4])}</td><td>{e(t[5])}</td></tr>"
                         for t in TIPOS_POSTGRES)
    nav = ('<p class="navt">Tabelas</p><ul>' + "".join(f'<li><a href="#{e(n)}">{e(n)}</a></li>' for n in indice["r"])
           + '</ul><p class="navt">Views</p><ul>' + "".join(f'<li><a href="#{e(n)}">{e(n)}</a></li>' for n in indice["v"]) + "</ul>")
    agora = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")

    pagina = f"""<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dicionário de Dados ENADE 2023</title>
<style>
:root {{ --bg:#f3f5f8; --card:#fff; --line:#dde2ea; --text:#1b2230; --muted:#5b6578; --head:#173a6a;
        --accent:#1f66c1; --pk:#d9f0df; --pkt:#1d6b33; --fk:#dbe8fb; --fkt:#174a8c; --chip:#eef1f6; }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg:#10141b; --card:#171d27; --line:#2a3242;
        --text:#e3e7ef; --muted:#97a1b5; --head:#10284c; --accent:#6aa8f0; --pk:#173a22; --pkt:#79d295; --fk:#13294a; --fkt:#8ab8f2; --chip:#222a37; }} }}
:root[data-theme="dark"] {{ --bg:#10141b; --card:#171d27; --line:#2a3242; --text:#e3e7ef; --muted:#97a1b5; --head:#10284c;
        --accent:#6aa8f0; --pk:#173a22; --pkt:#79d295; --fk:#13294a; --fkt:#8ab8f2; --chip:#222a37; }}
* {{ box-sizing:border-box; }}
body {{ margin:0; font:14px/1.5 "Segoe UI", Arial, sans-serif; background:var(--bg); color:var(--text); }}
.top {{ background:var(--head); color:#fff; padding:22px 32px; }}
.top h1 {{ margin:0; font-size:22px; }} .top p {{ margin:4px 0 0; color:#c4d4ee; font-size:13px; }}
.wrap {{ display:flex; }}
nav {{ width:290px; flex-shrink:0; position:sticky; top:0; height:100vh; overflow-y:auto; padding:14px 0;
       background:var(--card); border-right:1px solid var(--line); }}
nav .navt {{ margin:10px 16px 4px; font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); }}
nav ul {{ list-style:none; margin:0; padding:0; }}
nav a {{ display:block; padding:3px 16px; color:var(--text); text-decoration:none; font:12px Consolas, monospace;
         overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }}
nav a:hover, nav a:focus {{ background:var(--bg); color:var(--accent); }}
main {{ flex:1; min-width:0; padding:24px 28px; }}
.guia {{ background:var(--card); border:1px solid var(--line); border-radius:8px; padding:18px 22px; margin-bottom:22px; }}
.guia h2 {{ margin:0 0 10px; font-size:17px; }}
.guia ol {{ margin:0; padding-left:20px; }} .guia li {{ margin:4px 0; }}
.diagrama {{ font:13px Consolas, monospace; background:var(--chip); border-radius:6px; padding:12px 16px; overflow-x:auto; white-space:pre; }}
.obj {{ background:var(--card); border:1px solid var(--line); border-radius:8px; margin-bottom:22px; overflow:hidden; }}
.obj header {{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:12px 16px; border-bottom:1px solid var(--line); }}
.obj h3 {{ margin:0; font:600 15px Consolas, monospace; }}
.objdesc {{ margin:0; padding:10px 16px; color:var(--muted); font-size:13px; border-bottom:1px solid var(--line); }}
.pill {{ font-size:11px; padding:1px 8px; border-radius:10px; background:var(--chip); color:var(--muted); }}
.pill.tabela {{ background:var(--pk); color:var(--pkt); }} .pill.view {{ background:var(--fk); color:var(--fkt); }}
.scroll {{ overflow-x:auto; }}
table {{ border-collapse:collapse; width:100%; }}
th, td {{ text-align:left; padding:6px 12px; border-bottom:1px solid var(--line); vertical-align:top; }}
th {{ font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); background:var(--bg); }}
td.col {{ font:600 12px Consolas, monospace; white-space:nowrap; }}
td.tipo {{ font:12px Consolas, monospace; color:var(--accent); white-space:nowrap; }}
.k {{ font-size:11px; font-weight:600; padding:1px 6px; border-radius:4px; white-space:nowrap; margin-right:3px; }}
.pk {{ background:var(--pk); color:var(--pkt); }} .fk {{ background:var(--fk); color:var(--fkt); }}
details {{ margin-top:4px; }} summary {{ cursor:pointer; color:var(--accent); font-size:12px; }}
ul.cats {{ margin:4px 0 0; padding:6px 10px; list-style:none; background:var(--chip); border-radius:6px; font-size:12px; }}
ul.cats code {{ display:inline-block; min-width:52px; font-weight:600; }}
.mais {{ color:var(--muted); font-style:italic; }}
</style></head><body>
<div class="top"><h1>Dicionário de Dados — Microdados ENADE 2023</h1>
<p>Banco PostgreSQL · schema <b>{SCHEMA}</b> · {len(indice['r'])} tabelas · {len(indice['v'])} views · {total_colunas} colunas · gerado em {agora} direto do banco (igual ao DBeaver)</p></div>
<div class="wrap"><nav>{nav}</nav><main>

<div class="guia">
<h2>Como ler este banco</h2>
<ol>
<li><b>Tabelas</b> (pasta <i>Tables</i> no DBeaver): os dados do INEP como vieram, com os códigos originais.</li>
<li><b>Views <code>_desc</code></b> (pasta <i>Views</i>): os mesmos dados com uma coluna <code>ds_</code> ao lado de cada código, já com o texto (ex.: <code>tp_sexo = F</code> → <code>ds_tp_sexo = Feminino</code>).</li>
<li><b><code>inep_2023_categorias</code></b>: o significado de qualquer código do banco.</li>
<li><b>Regra para cruzar dados:</b> sempre pelo curso <code>(nu_ano, co_curso)</code>. Cada arquivo do INEP vem numa ordem diferente (LGPD), então a linha 1 de uma tabela não é o mesmo estudante da linha 1 de outra. A view <code>{VIEW_INDICADORES}</code> já faz esse cruzamento por curso.</li>
</ol>
<p style="margin:14px 0 6px"><b>Ligações (chaves estrangeiras):</b></p>
<div class="diagrama">inep_censo_2023_ies                 (1 linha por IES)
        ▲  co_ies
inep_enade_2023_cadastro_curso      (1 linha por curso — tabela central)
        ▲  (nu_ano, co_curso)
inep_enade_2023_curso               (arq1)          ┐
inep_enade_2023_aluno_*             (arq2 a arq14)  ┘  1 linha por estudante</div>
</div>

<div class="guia">
<h2>Tipos de dados do PostgreSQL</h2>
<div class="scroll"><table><thead><tr><th>Tipo</th><th>Tamanho</th><th>Faixa</th><th>Para que serve</th><th>Usado no TCC?</th></tr></thead>
<tbody>{tipos_html}</tbody></table></div>
</div>

{''.join(blocos)}
</main></div></body></html>"""
    os.makedirs(os.path.dirname(DIC_HTML), exist_ok=True)
    with open(DIC_HTML, "w", encoding="utf-8") as f:
        f.write(pagina)
    print(f"     {DIC_HTML}")


# ── Dicionário Excel ────────────────────────────────────────────────────────
def tamanho_do_tipo(tipo):
    m = re.match(r"(\w+)(?:\((\d+)(?:,(\d+))?\))?", tipo)
    base, n, s = m.group(1), m.group(2), m.group(3)
    if base == "SMALLINT":
        return "2 bytes"
    if base == "INTEGER":
        return "4 bytes"
    if base == "BIGINT":
        return "8 bytes"
    if base == "NUMERIC":
        return f"{n} dígitos ({s} decimal)" if n else "variável"
    if base == "CHAR":
        return f"{n} caractere" + ("s" if n != "1" else "")
    if base == "VARCHAR":
        return f"até {n} caracteres"
    return "variável"


def valor(nome_coluna, v):
    """Anos sem separador de milhar (2023); o resto no padrão brasileiro (406.294)."""
    return str(v) if nome_coluna.startswith(("nu_ano", "ano_")) else br(v)


def justificar_tipo(objeto_nome, col, tipo, est, tamanhos):
    base = tipo.split("(")[0]
    nome = col["nome"]
    if objeto_nome == VIEW_INDICADORES and base in ("BIGINT", "NUMERIC") and nome not in ("nu_ano", "co_curso"):
        return ("Contagem calculada pela view (o COUNT do PostgreSQL devolve BIGINT)." if base == "BIGINT"
                else "Média ou percentual calculado pela view com ROUND(..., 1).")
    if base == "SMALLINT":
        if est.get("max") is None:
            return "Código pequeno: SMALLINT (2 bytes)."
        faixa = (f"Valor {valor(nome, est['min'])}: cabe" if est["min"] == est["max"]
                 else f"Valores de {valor(nome, est['min'])} a {valor(nome, est['max'])}: cabem")
        return f"{faixa} em SMALLINT (até 32.767), que ocupa só 2 bytes."
    if base == "INTEGER":
        maximo = est.get("max")
        if maximo is not None and maximo > 32767:
            return f"Chega a {br(maximo)}: passa do limite do SMALLINT (32.767), por isso INTEGER (4 bytes)."
        if nome == "qt_estudantes":
            return "Contagem de estudantes por curso: INTEGER é o tipo padrão para contagens."
        tam = tamanhos.get(nome.upper())
        if tam:
            return f"O dicionário do INEP prevê até {tam} dígitos (passa de 32.767), por isso INTEGER (4 bytes)."
        return "Número inteiro: INTEGER (4 bytes)."
    if base == "NUMERIC":
        return ("Nota de 0 a 100 com 1 casa decimal: NUMERIC(4,1) guarda o valor exato (até 999,9), "
                "sem os erros de arredondamento do REAL/FLOAT.")
    if base == "CHAR":
        n = tipo[5:-1]
        return ("Sempre 1 caractere (código de uma letra): CHAR(1) tem tamanho fixo." if n == "1"
                else f"Sempre {n} letras (sigla): CHAR({n}) tem tamanho fixo.")
    if base == "VARCHAR":
        maxlen = est.get("maxlen")
        if nome.startswith("ds_vt_"):
            return f"Vetor com {maxlen} caracteres, 1 por questão da prova: {tipo}."
        if nome.startswith("ds_") or nome in ("area_curso", "modalidade", "categoria_administrativa", "uf_curso", "regiao_curso"):
            return "Texto do significado do código (vem de inep_2023_categorias)."
        return (f"Texto de tamanho variável (o maior tem {maxlen} caracteres): {tipo} só ocupa "
                "o tamanho do texto.") if maxlen else f"Texto de tamanho variável: {tipo}."
    return ""


def descrever_valores(col, est, cats):
    nome = col["nome"]
    if nome.upper() in cats and "distintos" in est:
        return f"{br(est['distintos'])} códigos diferentes"
    if "min" in est:
        if est["min"] is None:
            return "—"
        return (f"sempre {valor(nome, est['min'])}" if est["min"] == est["max"]
                else f"de {valor(nome, est['min'])} a {valor(nome, est['max'])}")
    if est.get("maxlen"):
        moda = str(est.get("moda") or "")
        moda = moda if len(moda) <= 40 else moda[:37] + "..."
        return f"até {est['maxlen']} caracteres · mais comum: {moda}"
    return "—"


def descrever_categorias(objeto, col, cats):
    var = col["nome"].upper()
    if objeto["tipo"] != "r" or objeto["nome"] == "inep_2023_categorias" or var not in cats:
        return ""
    itens = cats[var]
    if len(itens) <= 12:
        return "\n".join(f"{c} = {d}" for c, d in itens)
    return f"{br(len(itens))} códigos — veja a aba Categorias (filtre a variável {var})"


def gerar_dicionario_excel(cur, objetos, restricoes, chaves, cats, tamanhos):
    from openpyxl import Workbook

    FONTE = "Arial"
    AZUL, FAIXA, LINHA = "1F3A5F", "DCE6F2", "D0D7E2"
    f_normal = Font(name=FONTE, size=10)
    f_negrito = Font(name=FONTE, size=10, bold=True)
    f_cab = Font(name=FONTE, size=10, bold=True, color="FFFFFF")
    f_titulo = Font(name=FONTE, size=16, bold=True, color=AZUL)
    f_sub = Font(name=FONTE, size=11, bold=True, color=AZUL)
    f_link = Font(name=FONTE, size=10, color="0563C1", underline="single")
    f_mono = Font(name="Consolas", size=10)
    p_cab = PatternFill("solid", fgColor=AZUL)
    p_faixa = PatternFill("solid", fgColor=FAIXA)
    borda = Border(bottom=Side(style="thin", color=LINHA))
    topo = Alignment(vertical="top", wrap_text=True)

    agora = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    wb = Workbook()
    ws = wb.active
    ws.title = "Como usar"
    ws_tab = wb.create_sheet("Tabelas")
    ws_col = wb.create_sheet("Colunas")
    ws_ch = wb.create_sheet("Chaves")
    ws_cat = wb.create_sheet("Categorias")
    ws_tp = wb.create_sheet("Tipos de dados")

    def cabecalho(ws, titulos, larguras, linha=1):
        for i, (t, w) in enumerate(zip(titulos, larguras), start=1):
            c = ws.cell(row=linha, column=i, value=t)
            c.font, c.fill = f_cab, p_cab
            c.alignment = Alignment(vertical="center", wrap_text=True)
            ws.column_dimensions[get_column_letter(i)].width = w
        ws.row_dimensions[linha].height = 30

    def escrever(ws, linha, valores, fonte=f_normal, preencher=None):
        for i, v in enumerate(valores, start=1):
            c = ws.cell(row=linha, column=i, value=v)
            c.font, c.alignment, c.border = fonte, topo, borda
            if preencher:
                c.fill = preencher
            if isinstance(v, int):
                c.number_format = "#,##0"

    def paisagem(ws):
        ws.page_setup.orientation = "landscape"
        ws.page_setup.fitToWidth, ws.page_setup.fitToHeight = 1, 0
        ws.sheet_properties.pageSetUpPr.fitToPage = True

    def link_interno(celula, destino):
        celula.hyperlink = Hyperlink(ref=celula.coordinate, location=destino)
        celula.font = f_link

    def ajustar_alturas(ws):
        """Altura de cada linha conforme o texto quebrado, para nada ficar escondido."""
        for row in ws.iter_rows(min_row=1):
            r = row[0].row
            if ws.row_dimensions[r].height:
                continue
            linhas = 1
            for c in row:
                if c.value is None or not isinstance(c.value, str):
                    continue
                largura = ws.column_dimensions[c.column_letter].width or 10
                por_linha = max(1, int(largura * 1.1))
                n = sum(max(1, -(-len(p) // por_linha)) for p in c.value.split("\n"))
                linhas = max(linhas, n)
            if linhas > 1:
                ws.row_dimensions[r].height = min(409, 13 * linhas + 3)

    tabelas_detalhadas = [o for o in objetos if o["tipo"] == "r" or o["nome"] == VIEW_INDICADORES]

    # ---------- Aba Colunas (montada primeiro para saber a linha de cada tabela) ----------
    titulos = ["Tabela", "Nº", "Coluna", "Descrição", "Tipo", "Tamanho", "Por que este tipo",
               "Chave", "Aceita vazio?", "Linhas vazias", "Valores no banco", "Categorias (código = significado)"]
    cabecalho(ws_col, titulos, [30, 5, 24, 52, 15, 15, 44, 26, 9, 11, 30, 52])
    linha_da_tabela, linha = {}, 2
    for o in tabelas_detalhadas:
        print(f"     lendo valores de {o['nome']}...", flush=True)
        est = ler_estatisticas(cur, o, cats)
        linha_da_tabela[o["nome"]] = linha
        resumo = o["comentario"].replace(" " + AVISO_LINHA, "")
        escrever(ws_col, linha, [o["nome"], None, None, resumo] + [None] * 8, f_negrito, p_faixa)
        ws_col.cell(row=linha, column=1).font = Font(name=FONTE, size=11, bold=True, color=AZUL)
        linha += 1
        for i, col in enumerate(o["colunas"], start=1):
            e = est.get(col["nome"], {})
            escrever(ws_col, linha, [
                o["nome"], i, col["nome"], col["comentario"], col["tipo"], tamanho_do_tipo(col["tipo"]),
                justificar_tipo(o["nome"], col, col["tipo"], e, tamanhos),
                descrever_chave(o["nome"], col["nome"], chaves),
                "Não" if col["notnull"] else "Sim",
                e.get("vazios"), descrever_valores(col, e, cats), descrever_categorias(o, col, cats)])
            ws_col.cell(row=linha, column=3).font = Font(name="Consolas", size=10, bold=True)
            linha += 1
    ws_col.freeze_panes = "D2"
    ws_col.auto_filter.ref = f"A1:L{linha - 1}"
    paisagem(ws_col)

    # ---------- Aba Tabelas ----------
    cabecalho(ws_tab, ["Nº", "Tabela / view (clique para ver as colunas)", "Tipo", "Origem", "O que guarda",
                       "1 linha =", "Linhas", "Colunas", "Espaço no disco", "Chave primária", "Liga com (chaves estrangeiras)"],
              [5, 46, 8, 26, 60, 12, 11, 9, 13, 24, 44])
    for i, o in enumerate(objetos, start=1):
        nome = o["nome"]
        base = nome.removesuffix("_desc")
        if nome == "inep_2023_categorias":
            origem, unidade = "Dicionários oficiais do INEP (Excel)", "1 código"
        elif nome == "inep_censo_2023_ies":
            origem, unidade = "Censo 2023: MICRODADOS_ED_SUP_IES_2023.CSV", "1 IES"
        elif nome == "inep_enade_2023_cadastro_curso":
            origem, unidade = "Montada a partir do arq1", "1 curso"
        elif nome in ARQUIVOS_ENADE:
            origem, unidade = f"ENADE 2023: microdados2023_arq{ARQUIVOS_ENADE[nome]}", "1 estudante"
        elif nome == VIEW_INDICADORES:
            origem, unidade = "View: junta as tabelas por curso", "1 curso"
        else:
            origem = f"View sobre {base}"
            unidade = "1 estudante" if base in ARQUIVOS_ENADE else ("1 curso" if "curso" in base else "1 IES")
        pk = next((" + ".join(r["colunas"]) for r in restricoes if r["tabela"] == nome and r["tipo"] == "p"), "—")
        fks = [f"{r['ref']} ({', '.join(r['colunas'])})" + (" — NOT VALID" if not r["valida"] else "")
               for r in restricoes if r["tabela"] == nome and r["tipo"] == "f"]
        tamanho = f"{o['bytes'] / 1024 / 1024:,.1f} MB".replace(",", "X").replace(".", ",").replace("X", ".") if o["bytes"] else "—"
        escrever(ws_tab, i + 1, [i, nome, "Tabela" if o["tipo"] == "r" else "View", origem,
                                 o["comentario"].replace(" " + AVISO_LINHA, ""), unidade,
                                 o.get("linhas"), len(o["colunas"]), tamanho, pk, "\n".join(fks) or "—"])
        alvo = nome if nome in linha_da_tabela else base
        if alvo in linha_da_tabela:
            link_interno(ws_tab.cell(row=i + 1, column=2), f"'Colunas'!A{linha_da_tabela[alvo]}")
    nota = len(objetos) + 3
    ws_tab.cell(row=nota, column=2, value=f"Linhas, colunas e espaço em disco lidos do banco PostgreSQL em {agora}.").font = Font(name=FONTE, size=9, italic=True)
    ws_tab.freeze_panes = "C2"
    paisagem(ws_tab)

    # ---------- Aba Chaves ----------
    cabecalho(ws_ch, ["Tabela", "Tipo", "Nome da restrição", "Coluna(s)", "Referencia", "Situação", "Explicação"],
              [44, 18, 38, 22, 40, 22, 70])
    cur.execute("SELECT MAX(qt_estudantes) FROM inep_enade_2023_cadastro_curso")
    max_por_curso = cur.fetchone()[0]
    cur.execute("""SELECT COUNT(DISTINCT c.co_ies), COUNT(*) FROM inep_enade_2023_cadastro_curso c
                   LEFT JOIN inep_censo_2023_ies i ON i.co_ies = c.co_ies WHERE i.co_ies IS NULL""")
    ies_fora, cursos_fora = cur.fetchone()
    ordem = {n: i for i, n in enumerate(ORDEM_TABELAS)}
    for i, r in enumerate(sorted(restricoes, key=lambda r: (r["tipo"] != "p", ordem.get(r["tabela"], 99))), start=2):
        if r["tipo"] == "p":
            tipo = "Chave primária (PK)"
            if r["tabela"] == "inep_2023_categorias":
                expl = "Cada variável tem cada código uma única vez."
            elif r["tabela"] == "inep_censo_2023_ies":
                expl = "Cada IES tem um código único no e-MEC."
            elif r["tabela"] == "inep_enade_2023_cadastro_curso":
                expl = ("Cada curso aparece uma única vez em cada edição do ENADE. NU_ANO e CO_CURSO estão "
                        "em todos os arquivos do INEP, por isso são a chave do curso.")
            else:
                expl = (f"Nos arquivos de estudantes (nu_ano, co_curso) se repete — o mesmo curso tem até "
                        f"{br(max_por_curso)} estudantes — e o INEP não fornece código do estudante (LGPD). "
                        "Por isso a chave é o número da linha do arquivo (id_registro).")
        else:
            tipo = "Chave estrangeira (FK)"
            if r["ref"] == "inep_censo_2023_ies":
                expl = (f"Liga o curso à sua IES. NOT VALID porque {ies_fora} IES ({cursos_fora} cursos) do ENADE "
                        "não estão no Censo 2023; os dados novos são conferidos normalmente.")
            else:
                expl = "Cada registro pertence a um curso do cadastro de cursos."
        situacao = "Válida" if r["valida"] else "NOT VALID (não confere os dados antigos)"
        ref = f"{r['ref']} ({', '.join(r['ref_colunas'])})" if r["tipo"] == "f" else "—"
        escrever(ws_ch, i, [r["tabela"], tipo, r["nome"], " + ".join(r["colunas"]), ref, situacao, expl])
    ws_ch.freeze_panes = "B2"
    paisagem(ws_ch)

    # ---------- Aba Categorias ----------
    cabecalho(ws_cat, ["Variável", "Código", "Significado", "Onde aparece (tabela.coluna)"], [24, 10, 70, 60])
    onde = {}
    for o in objetos:
        if o["tipo"] == "r" and o["nome"] != "inep_2023_categorias":
            for col in o["colunas"]:
                if col["nome"].upper() in cats:
                    onde.setdefault(col["nome"].upper(), []).append(f"{o['nome']}.{col['nome']}")
    linha = 2
    for var in sorted(cats):
        for cod, desc in cats[var]:
            escrever(ws_cat, linha, [var, cod, desc, "\n".join(onde.get(var, []))])
            linha += 1
    ws_cat.freeze_panes = "A2"
    ws_cat.auto_filter.ref = f"A1:D{linha - 1}"

    # ---------- Aba Tipos de dados ----------
    ws_tp["A1"] = "Tipos de dados do PostgreSQL — estudo e uso no TCC"
    ws_tp["A1"].font = f_sub
    cabecalho(ws_tp, ["Tipo", "Nome no DBeaver", "Tamanho", "Faixa de valores", "Para que serve",
                      "Usado no TCC?", "Colunas com este tipo", "Exemplos no banco"],
              [18, 14, 30, 34, 46, 34, 12, 60], linha=3)
    usos = {}
    for o in objetos:
        if o["tipo"] == "r":
            for col in o["colunas"]:
                usos.setdefault(col["tipo"].split("(")[0], []).append(f"{o['nome'].replace('inep_enade_2023_', '')}.{col['nome']} ({col['tipo']})")
    for o in objetos:
        if o["nome"] == VIEW_INDICADORES:
            for col in o["colunas"]:
                if col["tipo"] == "BIGINT":
                    usos.setdefault("BIGINT", []).append(f"indicadores_curso.{col['nome']}")
    for i, (tipo, dbeaver, tam, faixa, uso, usado, prefixo) in enumerate(TIPOS_POSTGRES, start=4):
        chave = prefixo.rstrip("(").split()[0]
        lista = usos.get(chave, [])
        exemplos = "\n".join(lista[:5]) + (f"\n… e mais {len(lista) - 5}" if len(lista) > 5 else "")
        escrever(ws_tp, i, [tipo, dbeaver, tam, faixa, uso, usado, len(lista) if lista else 0, exemplos or "—"])
        ws_tp.cell(row=i, column=1).font = Font(name="Consolas", size=10, bold=True)
    fim = len(TIPOS_POSTGRES) + 5
    observacoes = [
        "Regra usada: escolher o menor tipo em que todos os valores cabem. Tabelas menores ficam mais rápidas e o banco valida o dado.",
        "Por que não TEXT ou BIGINT em tudo? Ocupa mais espaço e o banco deixa de conferir o tamanho máximo do dado.",
        "Os tamanhos de texto (VARCHAR/CHAR) seguem o dicionário do INEP (ex.: vetor de respostas do Componente Específico = 29 letras).",
        "Notas usam NUMERIC(4,1) e não REAL/FLOAT porque NUMERIC é exato: 77,7 fica 77,7 (FLOAT pode virar 77,69999).",
        "A contagem de colunas considera só as tabelas (views não ocupam espaço próprio no disco).",
    ]
    for j, texto in enumerate(observacoes):
        c = ws_tp.cell(row=fim + j, column=1, value=texto)
        c.font = f_normal
    paisagem(ws_tp)

    # ---------- Aba Como usar (primeira) ----------
    ws.column_dimensions["A"].width = 24
    ws.column_dimensions["B"].width = 100
    ws["A1"] = "Dicionário de Dados — Microdados ENADE 2023"
    ws["A1"].font = f_titulo
    ws["A2"] = (f"Banco PostgreSQL · schema {SCHEMA} · gerado em {agora} direto do banco "
                "(mesmas tabelas, colunas e tipos que aparecem no DBeaver)")
    ws["A2"].font = Font(name=FONTE, size=10, italic=True)

    ws["A4"] = "O que tem em cada aba"
    ws["A4"].font = f_sub
    abas = [("Tabelas", "Lista de todas as tabelas e views: de qual arquivo do INEP vieram, quantas linhas, chave primária e com quem se ligam. Clique no nome para ir às colunas."),
            ("Colunas", "O dicionário de dados: cada coluna de cada tabela com descrição, tipo, tamanho, por que esse tipo, chave, linhas vazias, valores e categorias."),
            ("Chaves", "Todas as chaves primárias e estrangeiras, com a explicação de cada uma."),
            ("Categorias", "O significado de cada código (ex.: TP_SEXO F = Feminino). Use o filtro da coluna Variável."),
            ("Tipos de dados", "Estudo dos tipos do PostgreSQL (smallint, integer, numeric, char, varchar...), tamanho em bytes, faixa e onde foram usados.")]
    for j, (aba, texto) in enumerate(abas, start=5):
        link_interno(ws.cell(row=j, column=1, value=aba), f"'{aba}'!A1")
        c = ws.cell(row=j, column=2, value=texto)
        c.font, c.alignment = f_normal, topo

    ws["A11"] = "Como as tabelas se ligam"
    ws["A11"].font = f_sub
    diagrama = ["inep_censo_2023_ies                  1 linha por IES",
                "        ▲  co_ies",
                "inep_enade_2023_cadastro_curso       1 linha por curso (tabela central)",
                "        ▲  (nu_ano, co_curso)",
                "inep_enade_2023_curso                arq1       ┐",
                "inep_enade_2023_aluno_*              arq2 a arq14 ┘  1 linha por estudante"]
    for j, texto in enumerate(diagrama, start=12):
        ws.cell(row=j, column=2, value=texto).font = f_mono

    ws["A19"] = "Regra importante"
    ws["A19"].font = f_sub
    regras = ["Todos os arquivos do INEP têm NU_ANO e CO_CURSO, mas nenhum código de estudante.",
              "O INEP ordena cada arquivo de um jeito diferente (LGPD — Manual do Usuário, seção 2): a linha 1 de uma tabela NÃO é o mesmo estudante da linha 1 de outra.",
              "Por isso as tabelas se ligam pelo curso (nu_ano, co_curso). Para cruzar duas informações de estudantes, agrupe cada uma por curso — a view inep_enade_2023_indicadores_curso já faz isso.",
              "Views _desc (pasta Views no DBeaver) mostram os mesmos dados com o texto de cada código numa coluna ds_ (ex.: tp_sexo = F → ds_tp_sexo = Feminino)."]
    for j, texto in enumerate(regras, start=20):
        c = ws.cell(row=j, column=2, value=texto)
        c.font, c.alignment = f_normal, topo

    ws["A25"] = "Fontes"
    ws["A25"].font = f_sub
    fontes = ["Microdados ENADE 2023 (INEP): arquivos arq1, 2, 3, 4, 5, 6, 8, 10, 11 e 14 — arq7, 9, 12 e 13 não foram usados.",
              "Censo da Educação Superior 2023 (INEP): MICRODADOS_ED_SUP_IES_2023.CSV.",
              "Descrições e categorias: Dicionário_arquivos_variáveis_microdados_Enade_2023.xlsx e dicionário_dados_educação_superior.xlsx (INEP).",
              "Tipos, chaves, contagens e valores: lidos do banco PostgreSQL no momento da geração deste arquivo."]
    for j, texto in enumerate(fontes, start=26):
        c = ws.cell(row=j, column=2, value=texto)
        c.font, c.alignment = f_normal, topo

    for planilha in wb.worksheets:
        planilha.sheet_view.showGridLines = planilha.title not in ("Como usar",)
        ajustar_alturas(planilha)
    wb.active = 0
    os.makedirs(os.path.dirname(DIC_EXCEL), exist_ok=True)
    wb.save(DIC_EXCEL)
    print(f"     {DIC_EXCEL}")


def gerar_dicionarios(cur, tamanhos):
    objetos, restricoes, chaves, cats = ler_metadados(cur)
    gerar_dicionario_excel(cur, objetos, restricoes, chaves, cats, tamanhos)
    gerar_dicionario_html(objetos, chaves, cats)


# ── Execução ────────────────────────────────────────────────────────────────
def main():
    conn = conectar()
    cur = conn.cursor()

    desc_enade, cats_enade, municipios, tam_enade = ler_dicionario_enade()
    desc_censo, cats_censo, tam_censo = ler_dicionario_censo()
    tamanhos = {**tam_censo, **tam_enade}

    if "--dicionario" in sys.argv:
        passo(10, "Gerando os dicionários de dados")
        gerar_dicionarios(cur, tamanhos)
        conn.close()
        return

    passo(1, "Criando as tabelas")
    executar_arquivo_sql(cur, "01_criar_tabelas.sql")

    passo(2, "Carregando a tabela de categorias (dicionários do INEP)")
    carregar_categorias(cur, cats_enade, municipios, cats_censo)

    passo(3, "Carregando o cadastro de IES (Censo 2023)")
    carregar_ies(cur)

    passo(4, "Carregando os arquivos do ENADE")
    carregar_arquivos_enade(cur)

    passo(5, "Montando o cadastro de cursos")
    executar_arquivo_sql(cur, "02_montar_cadastro_curso.sql")

    passo(6, "Criando as chaves estrangeiras e índices")
    executar_arquivo_sql(cur, "03_chaves_estrangeiras.sql")

    passo(7, "Criando as views")
    gerar_views(cur)

    passo(8, "Gravando a descrição de cada tabela e coluna")
    sem_descricao = gerar_comentarios(cur, desc_enade, desc_censo)

    passo(9, "Conferindo")
    conferir(cur, sem_descricao)
    conn.commit()
    cur.execute("ANALYZE")
    conn.commit()

    passo(10, "Gerando os dicionários de dados")
    gerar_dicionarios(cur, tamanhos)

    conn.close()
    print("\nPronto! Abra o DBeaver e dê F5 no schema gabriel.")


if __name__ == "__main__":
    main()
