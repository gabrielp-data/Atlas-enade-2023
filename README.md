# Atlas ENADE 2023

Trabalho de Conclusão de Curso: banco de dados dos **Microdados do ENADE 2023** (INEP) em PostgreSQL e um **site com mapa interativo** que mostra, por região, estado e município, a nota, a renda e o perfil dos cursos avaliados.

- 406.294 estudantes, 9.812 cursos e 1.347 instituições
- Banco conferido com os arquivos originais do INEP: mesmas linhas, mesmas colunas, todos os códigos com significado
- Dicionário de dados em Excel e dentro do próprio banco (aparece no DBeaver)

## O que tem aqui

| Pasta / arquivo | O que é |
|---|---|
| `montar_banco.py` | Monta o banco inteiro do zero com um comando |
| `sql/` | Scripts SQL, numerados na ordem em que rodam |
| `dicionario/` | Dicionário de dados em Excel (`.xlsx`) e HTML |
| `site/` | O site (mapa interativo) |
| `site/scripts/exportar_dados.py` | Gera os dados do site a partir do banco |
| `site/scripts/preparar_malha.cmd` | Refaz a malha do mapa (IBGE + mapshaper) |

## Como montar o banco

Precisa de PostgreSQL, Python 3 e dos microdados baixados do portal de dados abertos do INEP (ENADE 2023 e Censo da Educação Superior 2023). Os caminhos das pastas ficam no início de `montar_banco.py`.

```bash
pip install pandas psycopg2 openpyxl
python montar_banco.py
```

O script pede a senha do PostgreSQL e faz tudo em uns 3 minutos:

1. cria as tabelas;
2. carrega os dados;
3. cria as chaves e as views;
4. grava a descrição de cada coluna;
5. confere tudo e gera os dicionários.

Se algum passo der erro, nada é alterado no banco. Para só refazer os dicionários: `python montar_banco.py --dicionario`.

## Como atualizar o site

Com o banco montado:

```bash
python site/scripts/exportar_dados.py
```

Ele gera `site/dados/dados.js` (números por curso), `site/dados/auditoria.js` (conferências) e `site/dados/malha.js` (mapa). Depois é só abrir `site/index.html` no navegador.

O site usa Preact com htm, sem etapa de build. O mapa é desenhado em Canvas 2D a partir da malha oficial dos municípios do IBGE, simplificada com mapshaper e salva em TopoJSON. A tipografia é Faustina e Geist.

### Publicar no GitHub Pages

Em **Settings → Pages**, escolha publicar a partir da branch `main`, pasta `/ (root)`. O site fica em `https://<usuario>.github.io/<repositorio>/` (a página da raiz redireciona para `site/`).

## O banco no DBeaver (schema `gabriel`)

**Tabelas** (dados do INEP com os códigos originais):

| Tabela | O que guarda |
|---|---|
| `inep_2023_categorias` | Significado de todos os códigos |
| `inep_censo_2023_ies` | Cadastro das instituições (1 linha por IES) |
| `inep_enade_2023_cadastro_curso` | Cadastro dos cursos (1 linha por curso), a tabela central |
| `inep_enade_2023_curso` | arq1 original (1 linha por estudante) |
| `inep_enade_2023_aluno_*` | arq2 a arq14 (1 linha por estudante) |

**Views:**

- `*_desc`: os mesmos dados com o texto de cada código (ex.: `tp_sexo = F` → `ds_tp_sexo = Feminino`).
- `inep_enade_2023_indicadores_curso`: 1 linha por curso, com notas e perfil.

## Como as tabelas se ligam

```
inep_censo_2023_ies                 PK: co_ies
      ▲  co_ies
inep_enade_2023_cadastro_curso      PK: (nu_ano, co_curso)
      ▲  (nu_ano, co_curso)
inep_enade_2023_curso, inep_enade_2023_aluno_*   PK: id_registro
```

Todos os arquivos do INEP têm `NU_ANO` e `CO_CURSO`, mas nenhum código de estudante. Além disso, cada arquivo vem ordenado de um jeito diferente, por causa da LGPD (Manual do Usuário do INEP, seção 2). Por isso:

- a linha 1 de uma tabela **não** é o mesmo estudante da linha 1 de outra;
- os cruzamentos são feitos **por curso**;
- as conclusões valem para cursos, não para estudantes individuais.

## Dados usados

- **ENADE 2023 (INEP):** arq1, 2, 3, 4, 5, 6, 8, 10, 11 e 14. Os arq7, 9, 12 e 13 ficaram de fora, conforme orientação.
- **Censo da Educação Superior 2023 (INEP):** cadastro de IES e de cursos.
- **Dicionários oficiais do ENADE e do Censo:** fonte das descrições e categorias.
- **Malha de municípios do IBGE:** base do mapa.
