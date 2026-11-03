"""
TCC ENADE 2023 — GERA A ANÁLISE DA PERGUNTA DE PESQUISA
=======================================================

Pergunta: como a diferença de nota geral entre as redes pública e privada
varia por área e região no ENADE 2023?

Lê direto do banco (não do site) e escreve ANALISE_ENADE_2023.md com as tabelas.
Rodar de novo sempre que o banco mudar, para o texto do TCC usar números atuais.

Como rodar (com o banco montado):  python gerar_analise.py
"""
import datetime
import getpass
import os
from collections import defaultdict
from decimal import Decimal

import psycopg2

SCHEMA = "gabriel"
SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ANALISE_ENADE_2023.md")
MIN_NOTAS = 30                       # abaixo disso, o lado não entra na comparação
CATEGORIAS_PUBLICAS = (1, 2, 3, 7)   # federal, estadual, municipal e especial (rede pública no Censo 2023)
REGIOES = {1: "Norte", 2: "Nordeste", 3: "Sudeste", 4: "Sul", 5: "Centro-Oeste"}
AREAS_EXEMPLO = [12, 23, 5710]       # Medicina, Enfermagem e Engenharia Civil

# Uma linha por (região, área, rede). Como cada curso pertence a uma só região, área e rede,
# as contagens de cursos podem ser somadas entre grupos sem contar curso duas vezes.
SQL = """
SELECT c.co_regiao_curso, c.co_grupo,
       CASE WHEN c.co_categad IN %(publicas)s THEN 'pub' ELSE 'priv' END AS rede,
       COUNT(*) AS notas, COUNT(DISTINCT c.co_curso) AS cursos, SUM(p.nt_ger) AS soma
FROM inep_enade_2023_aluno_resultado_prova p
JOIN inep_enade_2023_cadastro_curso c USING (nu_ano, co_curso)
WHERE p.tp_pres = 555 AND p.nt_ger IS NOT NULL
GROUP BY 1, 2, 3
"""


def br(valor, casas=2):
    texto = f"{valor:,.{casas}f}"
    return texto.replace(",", "X").replace(".", ",").replace("X", ".").replace("-", "−")


def recorte(grupos, area=None, regiao=None):
    """Soma notas, cursos e soma de notas de cada rede dentro do recorte."""
    total = {"pub": [0, 0, Decimal(0)], "priv": [0, 0, Decimal(0)]}
    for (reg, grupo, rede), (notas, cursos, soma) in grupos.items():
        if (area is None or grupo == area) and (regiao is None or reg == regiao):
            t = total[rede]
            t[0] += notas; t[1] += cursos; t[2] += soma
    def lado(rede):
        notas, cursos, soma = total[rede]
        return {"notas": notas, "cursos": cursos, "media": float(soma / notas) if notas else None}
    pub, priv = lado("pub"), lado("priv")
    ok = pub["notas"] >= MIN_NOTAS and priv["notas"] >= MIN_NOTAS
    return pub, priv, (pub["media"] - priv["media"]) if ok else None


def linha(nome, pub, priv, dif):
    media = lambda x: br(x["media"]) if dif is not None else "—"
    return (f"| {nome} | {media(pub)} | {br(pub['notas'], 0)} | {br(pub['cursos'], 0)} "
            f"| {media(priv)} | {br(priv['notas'], 0)} | {br(priv['cursos'], 0)} | {br(dif) if dif is not None else '—'} |")


CABECALHO = ("| Recorte | Pública | Notas | Cursos | Privada | Notas | Cursos | Diferença (pontos) |\n"
             "|---|---:|---:|---:|---:|---:|---:|---:|")


def tabela_regioes(grupos, area=None):
    linhas, difs = [CABECALHO], []
    pub, priv, dif = recorte(grupos, area)
    linhas.append(linha("Brasil", pub, priv, dif))
    brasil = dif
    for codigo, nome in REGIOES.items():
        p, q, d = recorte(grupos, area, codigo)
        linhas.append(linha(nome, p, q, d))
        if d is not None:
            difs.append((d, nome))
    return "\n".join(linhas), brasil, difs


def main():
    senha = os.environ.get("PGPASSWORD") or getpass.getpass("Senha do PostgreSQL: ")
    conn = psycopg2.connect(host="localhost", dbname="postgres", user="postgres", password=senha,
                            options=f"-csearch_path={SCHEMA}")
    cur = conn.cursor()
    cur.execute(SQL, {"publicas": CATEGORIAS_PUBLICAS})
    grupos = {(int(r), int(g), rede): (int(n), int(c), s) for r, g, rede, n, c, s in cur.fetchall()}
    cur.execute("SELECT codigo, descricao FROM inep_2023_categorias WHERE variavel = 'CO_GRUPO'")
    nomes_area = {int(c): d for c, d in cur.fetchall()}
    conn.close()

    partes = [f"""# Diferenças de desempenho no ENADE 2023

**Pergunta de pesquisa.** Como a diferença de nota geral entre as redes pública e privada varia por área e região?

*Gerado por `gerar_analise.py` em {datetime.date.today().strftime("%d/%m/%Y")}, direto do banco PostgreSQL.*

## Método

A análise usa os microdados carregados no banco, agregados por curso. Cada média divide a soma das notas gerais pelo número de notas válidas, considerando presença com resultado válido (TP_PRES = 555). As médias dão o mesmo peso a cada nota válida. A coluna Cursos conta apenas cursos com pelo menos uma nota válida no recorte. A rede pública reúne as categorias federal, estadual, municipal e especial (todas são rede pública no Censo 2023); as demais formam a rede privada.

A diferença é a média da rede pública menos a da privada. O relatório omite as médias e a diferença quando um lado tem menos de {MIN_NOTAS} notas válidas. Esse limiar é descritivo e não corresponde a um teste de significância.

## Resultado bruto
"""]
    texto, _, _ = tabela_regioes(grupos)
    partes.append(texto)

    partes.append("\n## Comparações dentro de cada área\n\nOs três exemplos são de áreas com grande número de inscritos na edição e abrangem saúde e engenharia.")
    for area in AREAS_EXEMPLO:
        texto, brasil, difs = tabela_regioes(grupos, area)
        partes.append(f"\n### {nomes_area[area]}\n\n{texto}\n")
        frase = f"No Brasil, a diferença foi de {br(brasil)} pontos." if brasil is not None else "No Brasil, não há notas suficientes dos dois lados."
        if len(difs) >= 2:
            menor, maior = min(difs), max(difs)
            frase += f" Entre as regiões com dados suficientes, variou de {br(menor[0])} ({menor[1]}) a {br(maior[0])} ({maior[1]})."
        partes.append(frase)

    # Todas as áreas, no Brasil
    linhas_area = []
    for codigo, nome in nomes_area.items():
        pub, priv, dif = recorte(grupos, codigo)
        linhas_area.append((dif, nome, pub, priv))
    com_dados = sorted([x for x in linhas_area if x[0] is not None], key=lambda x: -x[0])
    sem_dados = [x for x in linhas_area if x[0] is None]
    a_favor = sum(1 for x in com_dados if x[0] > 0)
    partes.append(f"""
## Todas as áreas (Brasil)

Diferença entre as redes em cada uma das {len(nomes_area)} áreas avaliadas em 2023, da maior para a menor.

| Área | Pública | Notas | Privada | Notas | Diferença (pontos) |
|---|---:|---:|---:|---:|---:|""")
    for dif, nome, pub, priv in com_dados + sem_dados:
        media = lambda x: br(x["media"]) if dif is not None else "—"
        partes.append(f"| {nome} | {media(pub)} | {br(pub['notas'], 0)} | {media(priv)} | {br(priv['notas'], 0)} | {br(dif) if dif is not None else '—'} |")
    if com_dados:
        partes.append(f"\nA rede pública tem média maior em {a_favor} das {len(com_dados)} áreas com dados suficientes dos dois lados. "
                      f"A diferença vai de {br(com_dados[-1][0])} ({com_dados[-1][1]}) a {br(com_dados[0][0])} ({com_dados[0][1]}).")

    partes.append("""
## Como interpretar

A comparação dentro da mesma área reduz a influência da composição de cursos. Ainda podem existir diferenças de modalidade, localização, seleção e perfil dos cursos. Os resultados descrevem os participantes com nota válida na edição de 2023. Eles não estimam o efeito de estudar em determinada rede.

Os arquivos públicos do ENADE não oferecem uma chave comum de estudante. Uma análise futura de renda ou escolaridade dos pais deve usar indicadores agregados por curso e interpretar as associações nesse nível.

Fonte. Microdados ENADE 2023 e Censo da Educação Superior 2023, INEP. Agregados do Atlas ENADE 2023.
""")
    with open(SAIDA, "w", encoding="utf-8") as f:
        f.write("\n".join(partes))
    print(f"Pronto: {SAIDA}")


if __name__ == "__main__":
    main()
