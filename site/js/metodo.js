// Atlas ENADE 2023 — página "Como os dados foram tratados" (auditoria e perguntas frequentes).
(function (A) {
  "use strict";
  const html = A.html, AU = window.AUDITORIA, n0 = v => A.nf0.format(v);

  function Conferencia({ ok, children }) {
    return html`<li><span class=${ok ? "marca-ok" : "marca-atencao"} aria-label=${ok ? "Conferido" : "Atenção"}>${ok ? "✓" : "!"}</span><div>${children}</div></li>`;
  }

  const NOME_RECORTE = c => c.uf == null && c.area == null ? "Brasil"
    : `${c.area != null ? A.NOME_AREA[c.area] : "Todas as áreas"}${c.uf != null ? " em " + A.ufSigla(String(c.uf)) : ""}`;

  A.Metodo = function Metodo({ voltar }) {
    const arquivosOk = AU.arquivos.every(a => a.linhas_arquivo === a.linhas_banco && a.colunas_iguais);
    const conf = A.conferirDados();   // refeito agora, no navegador de quem abre a página
    const confOk = conf.length > 0 && conf.every(c => c.ok);
    const notas = A.resumoNotas();
    const ausentes = AU.presenca.find(p => p[0] === 222);
    const cursosFora = AU.ies_fora.reduce((s, x) => s + x[1], 0);
    const estFora = AU.ies_fora.reduce((s, x) => s + x[2], 0);
    return html`<main class="metodo">
      <div class="folha">
        <header>
          <h1>Como os dados foram tratados</h1>
          <p class="intro">Tudo o que aparece no mapa vem dos microdados oficiais do INEP, carregados num banco PostgreSQL.
          Antes de publicar, o banco é conferido com os arquivos originais. As conferências abaixo foram feitas em ${AU.gerado_em}.</p>
        </header>

        <section>
          <h2>Conferências</h2>
          <ul class="conferencias">
            <${Conferencia} ok=${arquivosOk}><b>Cada tabela tem exatamente as linhas e colunas do arquivo do INEP.</b> ${AU.arquivos.length} arquivos, ${n0(AU.estudantes)} estudantes em cada um.<//>
            <${Conferencia} ok=${AU.categorias.sem_significado === 0}><b>Todo código tem significado no dicionário oficial.</b> ${n0(AU.categorias.codigos)} códigos de ${AU.categorias.variaveis} variáveis; ${n0(AU.categorias.sem_significado)} valores sem tradução.<//>
            <${Conferencia} ok=${AU.curso_inconsistente === 0}><b>Cada curso tem os mesmos dados em todas as linhas do arq1.</b> Por isso o cadastro guarda cada um dos ${n0(AU.cursos)} cursos uma única vez.<//>
            <${Conferencia} ok=${AU.notas_fora === 0}><b>Todas as notas estão entre 0 e 100.</b><//>
            <${Conferencia} ok=${confOk}><b>As médias do site batem com o cálculo direto no banco.</b> ${conf.length} médias (notas, renda e avaliação, no Brasil e em dois recortes) foram recalculadas agora, no seu navegador, e comparadas com o PostgreSQL. A tabela está logo abaixo.<//>
            <${Conferencia} ok=${true}><b>${AU.chaves.pk} chaves primárias e ${AU.chaves.fk} chaves estrangeiras.</b> Todas as tabelas do ENADE se ligam ao cadastro de cursos por (nu_ano, co_curso).<//>
            <${Conferencia} ok=${false}><b>${AU.ies_fora.length} instituições (${cursosFora} cursos, ${n0(estFora)} estudantes) não aparecem no Censo 2023.</b> Os cursos continuam no mapa, mas sem o nome da instituição. Por isso ${AU.chaves.fk_not_valid} ligações com o Censo estão marcadas como NOT VALID no banco.<//>
          </ul>
          <div class="rolar">
            <table>
              <thead><tr><th>Arquivo do INEP</th><th>Tabela no banco</th><th>Linhas no arquivo</th><th>Linhas no banco</th><th>Colunas</th><th>SHA-256</th><th></th></tr></thead>
              <tbody>${AU.arquivos.map(a => html`<tr key=${a.arquivo}>
                <td>${a.arquivo}</td><td>${a.tabela.replace("inep_enade_2023_", "")}</td>
                <td>${n0(a.linhas_arquivo)}</td><td>${n0(a.linhas_banco)}</td><td>${a.colunas_banco}</td>
                <td title=${a.sha256 || ""}><code>${(a.sha256 || "—").slice(0, 12)}</code></td>
                <td class=${a.linhas_arquivo === a.linhas_banco && a.colunas_iguais ? "ok" : ""}>${a.linhas_arquivo === a.linhas_banco && a.colunas_iguais ? "✓ bate" : "diferente"}</td></tr>`)}
              </tbody>
            </table>
          </div>
          <p class="nota-tabela">O SHA-256 é a impressão digital de cada arquivo: quem baixar os mesmos microdados do INEP pode conferir se são idênticos aos usados aqui (passe o mouse para ver o código completo).</p>
          <div class="rolar">
            <table>
              <thead><tr><th>Média recalculada</th><th>Recorte</th><th>Respostas</th><th>No banco</th><th>No site</th><th></th></tr></thead>
              <tbody>${conf.map((c, i) => html`<tr key=${i}>
                <td>${A.METRICAS[c.metrica].rotulo}</td><td>${NOME_RECORTE(c)}</td><td>${n0(c.n)}</td>
                <td>${A.nf2.format(c.media)}</td><td>${c.site == null ? "—" : A.nf2.format(c.site)}</td>
                <td class=${c.ok ? "ok" : ""}>${c.ok ? "✓ bate" : "diferente"}</td></tr>`)}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2>Por que os números são por curso, e não por estudante</h2>
          <p>Todos os arquivos do INEP têm o ano (NU_ANO) e o código do curso (CO_CURSO), mas nenhum código de estudante.
          Além disso, <strong>cada arquivo vem ordenado de um jeito diferente</strong>: o de sexo vem ordenado por sexo, o de renda por renda.
          O Manual do Usuário do INEP (seção 2, sobre a LGPD) diz que isso é proposital: não é possível juntar as informações no nível do estudante.</p>
          <p>Por isso o site sempre soma cada informação por curso e só depois compara. Uma frase como “cursos com mais estudantes de baixa renda têm nota menor”
          está correta; “estudantes de baixa renda tiram nota menor” não pode ser concluída com estes dados.</p>
        </section>

        <section>
          <h2>Como cada número é calculado</h2>
          <p>Os valores de um estado, região ou município são calculados somando os cursos daquele lugar, e não tirando a média das médias. Assim, um curso com 300 estudantes pesa mais que um com 10.</p>
          <div class="formula">nota média do lugar = soma das notas válidas dos presentes ÷ quantidade dessas notas
% de um grupo       = estudantes do grupo ÷ estudantes que responderam × 100</div>
          <p>Para evitar números instáveis, um lugar só ganha cor com pelo menos <strong>${A.MIN_LOCAL} respostas</strong>, e um curso só entra no ranking com pelo menos <strong>${A.MIN_CURSO}</strong>.
          ${n0(AU.cursos_poucos_presentes)} dos ${n0(AU.cursos)} cursos têm menos de ${A.MIN_CURSO} notas gerais válidas.</p>
          <p>Há ${n0(notas.presentes)} estudantes classificados como presentes (TP_PRES = 555).
          Destes, ${n0(notas.validas)} têm nota geral preenchida e entram nessa média; ${n0(notas.semNota)} não têm nota geral e ficam de fora.
          Cada indicador de nota usa sua própria quantidade de resultados preenchidos.
          Os ${n0(ausentes ? ausentes[2] : 0)} ausentes e os casos de dispensa ficam de fora da média.</p>
          <p><strong>Rede pública</strong> reúne as categorias federal, estadual, municipal e especial (todas são rede pública no Censo 2023):
          ${n0(AU.rede.publica[0])} cursos e ${n0(AU.rede.publica[1])} estudantes. A <strong>rede privada</strong> tem ${n0(AU.rede.privada[0])} cursos e ${n0(AU.rede.privada[1])} estudantes.
          Cursos EaD são ${n0(AU.modalidade.ead[0])} (${n0(AU.modalidade.ead[1])} estudantes).</p>
        </section>

        <section>
          <h2>Perguntas frequentes</h2>
          <div class="perguntas">
            <details><summary>Dá para ver a nota de um estudante de baixa renda?</summary>
              <p>Não. A renda e a nota estão em arquivos diferentes, embaralhados de forma independente pelo INEP. Só dá para comparar cursos: por exemplo, a nota média dos cursos com mais estudantes de baixa renda.</p></details>
            <details><summary>Por que o ranking é quase todo de Medicina?</summary>
              <p>Porque a nota média muda muito de uma área para outra. Para comparar de igual para igual, escolha uma área no filtro “Área do curso”. O mesmo vale para comparar estados: um estado com mais cursos de Medicina tende a ter nota maior.</p></details>
            <details><summary>Esta nota é o Conceito ENADE?</summary>
              <p>Não. O Conceito ENADE (de 1 a 5) é calculado pelo INEP com notas padronizadas por área. O site mostra a nota bruta da prova (de 0 a 100), que é o que está nos microdados.</p></details>
            <details><summary>O que é o duelo?</summary>
              <p>É a comparação entre dois grupos de cursos no mesmo lugar: rede pública × privada ou presencial × EaD. O mapa pinta cada estado pela cor do grupo com valor maior, e a intensidade mostra o tamanho da diferença.</p></details>
            <details><summary>Por que alguns lugares aparecem hachurados?</summary>
              <p>Porque têm menos de ${A.MIN_LOCAL} respostas naquela seleção. Com tão poucas respostas, um único estudante mudaria muito o resultado.</p></details>
            <details><summary>O que significa NOT VALID no banco?</summary>
              <p>É uma chave estrangeira que vale para dados novos, mas não bloqueia os registros antigos que não batem. Aqui, ela marca os ${AU.ies_fora.length} códigos de instituição do ENADE que não existem no Censo 2023.</p></details>
            <details><summary>Dá para refazer tudo do zero?</summary>
              <p>Sim. O montar_banco.py cria e confere o banco a partir dos arquivos do INEP, o site/scripts/exportar_dados.py gera os dados do site
              (e para se alguma média não bater com o banco) e o gerar_analise.py produz as tabelas da análise pública × privada. Os três estão no repositório do projeto.</p></details>
          </div>
        </section>

        <section>
          <h2>Fontes</h2>
          <p>INEP, Microdados do ENADE 2023 (arquivos arq1, 2, 3, 4, 5, 6, 8, 10, 11 e 14) e Censo da Educação Superior 2023 (cadastro de IES e de cursos).
          Malha de municípios do IBGE, simplificada com mapshaper.</p>
          <p><button class="link-metodo" onClick=${voltar}>Voltar ao mapa</button></p>
        </section>
      </div>
    </main>`;
  };
})(window.Atlas);
