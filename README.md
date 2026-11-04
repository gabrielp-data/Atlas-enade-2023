# Atlas ENADE 2023

Trabalho de Conclusão de Curso: banco de dados dos **Microdados do ENADE 2023** (INEP) em PostgreSQL e um **site com mapa interativo** que mostra, por região, estado e município, a nota, a renda e o perfil dos cursos avaliados.

**Site:** https://gabrielp-data.github.io/Atlas-enade-2023/ · **Análise:** [ANALISE_ENADE_2023.md](ANALISE_ENADE_2023.md)

- 406.294 estudantes, 9.812 cursos e 1.347 instituições
- Banco conferido com os arquivos originais do INEP: mesmas linhas, mesmas colunas, todos os códigos com significado
- Dicionário de dados em Excel e dentro do próprio banco (aparece no DBeaver)

## O que tem aqui

| Pasta / arquivo | O que é |
|---|---|
| `montar_banco.py` | Monta o banco inteiro do zero com um comando |
| `gerar_analise.py` | Gera `ANALISE_ENADE_2023.md` (pública × privada por área e região) direto do banco |
| `sql/` | Scripts SQL, numerados na ordem em que rodam |
| `dicionario/` | Dicionário de dados em Excel (`.xlsx`) e HTML |
| `site/` | O site (mapa interativo) |
| `site/scripts/exportar_dados.py` | Gera os dados do site a partir do banco |
| `site/scripts/preparar_malha.cmd` | Refaz a malha do mapa (IBGE + mapshaper) |

## Como montar o banco

Precisa de PostgreSQL, Python 3 e dos microdados baixados do portal de dados abertos do INEP (ENADE 2023 e Censo da Educação Superior 2023). Os scripts procuram os microdados em `fontes/enade` e `fontes/censo`, na raiz do projeto. A pasta `fontes/` fica fora do Git, então os microdados nunca vão para o repositório. Há duas formas de apontar para eles:

- **Atalho (recomendado no Windows):** cria `fontes/` como atalho para onde os arquivos já estão, sem copiar nada:

  ```powershell
  New-Item -ItemType Junction -Path fontes\enade -Target "C:\caminho\Microdados_Enade_2023"
  New-Item -ItemType Junction -Path fontes\censo -Target "C:\caminho\microdados_censo_da_educacao_superior_2023"
  ```

- **Variáveis de ambiente:** `ENADE_DIR` e `CENSO_DIR` com o caminho das pastas extraídas.

```bash
pip install -r requirements.txt
python montar_banco.py
```

O script pede a senha do PostgreSQL e faz tudo em uns 3 minutos:

1. cria as tabelas;
2. carrega os dados;
3. cria as chaves e as views;
4. grava a descrição de cada coluna;
5. confere tudo e gera os dicionários.

Se as tabelas já existirem, o comando para e preserva a base. Para só refazer os dicionários: `python montar_banco.py --dicionario`.

**Recriar é uma operação separada:** `python montar_banco.py --recriar` substitui explicitamente as tabelas deste projeto e recarrega os arquivos originais. A limpeza usa uma lista fechada e `RESTRICT`: outras tabelas `inep_*` não são apagadas, e dependências externas impedem a recriação. A limpeza e a carga ficam na mesma transação; erros antes da confirmação desfazem as mudanças. Os dicionários são gerados depois dessa confirmação: uma falha ao gravar o Excel não desfaz uma carga já concluída.

## Como atualizar o site

Com o banco montado:

```bash
python site/scripts/exportar_dados.py
```

Ele gera `site/dados/dados.js` (números por curso), `site/dados/auditoria.js` (conferências) e `site/dados/malha.js` (mapa). Depois é só abrir `site/index.html` no navegador.

**Conferência automática.** O exportador recalcula 13 médias direto no banco (as três notas, renda e avaliação, no Brasil e em dois recortes) e só grava os arquivos se elas baterem com o que foi exportado. O site refaz as mesmas contas no navegador: se alguma não bater, ele mostra um aviso vermelho no topo e marca o erro na página "Como os dados foram tratados".

**Análise da pergunta de pesquisa.** `python gerar_analise.py` lê o banco e reescreve `ANALISE_ENADE_2023.md`. Rode de novo sempre que o banco mudar, para o texto do TCC usar números atuais.

O site usa Preact com htm, sem etapa de build. O mapa é desenhado em Canvas 2D a partir da malha oficial dos municípios do IBGE, simplificada com mapshaper e salva em TopoJSON. A tipografia é Faustina e Geist.

Com o mouse sobre o mapa, role para baixo para afastar e para cima para aproximar. O afastamento para no enquadramento do Brasil; o lugar selecionado no painel é mantido. Ctrl/Command + roda continua controlando o zoom do navegador. O link compartilhável guarda os filtros, o lugar e a divisão do mapa; o zoom manual é ajustado ao abrir.

### Publicar no GitHub Pages

Em **Settings → Pages → Source**, escolha **GitHub Actions**. O workflow `.github/workflows/pages.yml` roda os testes e só publica se todos passarem. O endereço permanece `https://<usuario>.github.io/<repositorio>/` (a página da raiz redireciona para `site/`).

O pacote de publicação contém apenas a página inicial e o site. A versão de cache dos arquivos é calculada automaticamente a partir do conteúdo: novas mudanças recebem outro `?v=`. A preparação é feita por `npm run build`, que também executa os testes do site e gera `_site/` em uma pasta de trabalho limpa. Para abrir diretamente os arquivos locais sem essa preparação, mantenha o `?v=` uniforme em `site/index.html`.

### Testes

Precisa de Node.js 22 ou superior, além das dependências Python:

```bash
npm test
python -m unittest discover -s tests -p "test_*.py" -v
```

Os testes cobrem as conferências com a exportação do banco, histogramas completos, links compartilháveis e CSV. A integração SQL usa `TEST_DATABASE_URL`, cria schemas temporários com nomes aleatórios e desfaz tudo com `ROLLBACK`; sem essa variável, os testes de integração são ignorados. No GitHub Actions, eles sempre rodam em um PostgreSQL 18 isolado, sem acesso à base do TCC.

### Baixar os dados filtrados

No painel, **Baixar cursos da seleção (CSV)** exporta todos os cursos da área e do lugar escolhidos, com o indicador atual. O arquivo usa ponto e vírgula, vírgula decimal e UTF-8 com BOM para abrir no Excel. Traz nomes, códigos, unidade, contagens e fonte. Cursos com menos de 20 pessoas com dado válido permanecem no arquivo com o valor vazio e o motivo registrado; zero continua sendo zero. Na avaliação, pessoas e respostas aos itens aparecem em colunas diferentes. No modo Duelo, as duas redes/modalidades são incluídas e identificadas nas respectivas colunas.

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

## Pergunta de pesquisa

Como a diferença de desempenho entre as redes pública e privada varia por área e região no ENADE 2023? A comparação usa médias ponderadas pela quantidade de notas válidas. As diferenças são descritivas. Renda e perfil contextualizam os cursos e não permitem inferências individuais.
