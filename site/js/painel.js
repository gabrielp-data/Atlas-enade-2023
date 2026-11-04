// Atlas ENADE 2023 — painel lateral: o lugar selecionado em detalhe.
(function (A) {
  "use strict";
  const { useState, useMemo, useEffect } = window.preactHooks;
  const html = A.html, C = A.C, D = A.D;

  function Manchete({ pedacos }) {
    return html`<p class="manchete">${pedacos.map((p, i) => typeof p === "string" ? p : html`<b key=${i}>${p.f}</b>`)}</p>`;
  }

  function CopiarLink({ token }) {
    const [estado, setEstado] = useState(null);
    const copiar = () => {
      const url = A.linkPublico(token);
      const falhou = () => setEstado({ ok: false, url });
      try {
        navigator.clipboard.writeText(url).then(() => { setEstado({ ok: true, url }); setTimeout(() => setEstado(null), 2500); }, falhou);
      } catch (e) { falhou(); }
    };
    return html`<div>
      <button class="copiar" onClick=${copiar} title="Copia um link com o lugar, os filtros e a divisão do mapa selecionados">
        ${estado && estado.ok ? "Link copiado" : "Copiar link"}
      </button>
      ${estado && !estado.ok && html`<div class="copiado">Copie o link:
        <input id="link-manual" readonly value=${estado.url} onFocus=${e => e.target.select()} /></div>`}
    </div>`;
  }

  A.Painel = function Painel(p) {
    const { m, agg, sel, passa, filtro, pedacos, brValor, escala, histDom, onSelect, token, irMetodo } = p;
    const [ordem, setOrdem] = useState("maiores");
    const [limite, setLimite] = useState(10);
    const [csvStatus, setCsvStatus] = useState("");
    useEffect(() => setLimite(10), [sel, m, passa, ordem]);
    useEffect(() => setCsvStatus(""), [sel, m, passa]);

    const x = A.aggDaSelecao(agg, sel);
    const min = A.minDaSelecao(sel);
    const v = A.valorDe(m, x, min);
    const lista = useMemo(() => A.cursosDa(sel, passa), [sel, passa]);
    const comValor = useMemo(() => lista.map(i => [i, A.valorCurso(m, i)]).filter(z => z[1] != null), [lista, m]);
    const ranking = useMemo(() => comValor.slice().sort((a, b) => ordem === "maiores" ? b[1] - a[1] : a[1] - b[1]), [comValor, ordem]);
    const corBarra = val => escala.tipo === "dif" ? escala.cor(val) : A.corSeq((val - histDom[0]) / (histDom[1] - histDom[0]));
    const reg = sel.tipo === "reg" ? sel.reg : sel.uf ? sel.uf[0] : null;
    const { titulo, olho } = A.tituloDaSelecao(sel);

    const tabela = useMemo(() => {
      if (sel.tipo === "br" || sel.tipo === "reg") {
        return [...agg.uf].filter(([k]) => sel.tipo === "br" || k[0] === sel.reg)
          .map(([k, z]) => ({ k, nome: A.ufNome(k), v: A.valorDe(m, z, A.MIN_UF), cursos: z.cursos, sel: { tipo: "uf", uf: k } }));
      }
      if (sel.tipo === "uf" || sel.tipo === "mun") {
        return [...agg.mun].filter(([k]) => k.startsWith(sel.uf))
          .map(([k, z]) => ({ k, nome: A.munNome(k), v: A.valorDe(m, z, A.MIN_LOCAL), cursos: z.cursos, sel: { tipo: "mun", uf: sel.uf, mun: k } }));
      }
      return [];
    }, [agg, sel, m]);
    const tabelaOrdenada = tabela.slice().sort((a, b) => (b.v ?? -Infinity) - (a.v ?? -Infinity));

    const rotuloN = A.maiuscula(A.rotuloContagem(m));
    const ehIes = sel.tipo === "ies";
    const escolherArea = () => { const s = document.getElementById("area"); if (s) { s.focus(); try { s.showPicker(); } catch (e) { /* navegador sem showPicker */ } } };

    return html`<aside class="painel" aria-label="Detalhes da seleção">
      <div class="cabeca">
        ${sel.tipo !== "br" && html`<nav class="trilha" aria-label="Você está em">
          <button onClick=${() => onSelect({ tipo: "br" })}>Brasil</button>
          ${reg && sel.tipo !== "reg" && html`<span>›</span><button onClick=${() => onSelect({ tipo: "reg", reg })}>${A.regNome(reg)}</button>`}
          ${sel.tipo === "mun" && html`<span>›</span><button onClick=${() => onSelect({ tipo: "uf", uf: sel.uf })}>${A.ufNome(sel.uf)}</button>`}
          ${ehIes && html`<span>›</span><span>Instituição</span>`}
        </nav>`}
        <div class="linha-titulo">
          <h1 class="titulo" tabindex="-1">${titulo}</h1>
          <${CopiarLink} token=${token} />
        </div>
        <div class="sub">${olho}</div>
        <${Manchete} pedacos=${pedacos} />
      </div>

      <div class="destaque">
        <div class="nome-metrica">${m.rotulo}</div>
        <div class="numero">${A.fmtValor(m, v)}${v != null && A.UNIDADE[m.tipo] && html`<small>${A.UNIDADE[m.tipo]}</small>`}</div>
        ${v == null && html`<p class="explica">Poucas respostas para calcular com segurança (mínimo de ${min}).</p>`}
        ${sel.tipo !== "br" && v != null && brValor != null && html`<div class="dif">
          <i class=${"seta " + (v >= brValor ? "cima" : "baixo")} aria-hidden="true"></i>
          <b>${A.fmtDif(m, v - brValor)}</b> em relação ao Brasil (${A.fmtValor(m, brValor)})
        </div>`}
        <p class="explica">${m.explica}${m.respondentes && x && x.n > 0
          ? ` Calculada sobre ${A.nf0.format(x.n)} respostas aos itens, dadas por ${A.nf0.format(x.pessoas)} estudantes.` : ""}</p>
      </div>

      ${!filtro.area && html`<div class="aviso" role="note">
        <span><b>Atenção:</b> esta seleção junta ${filtro.grupo >= 0 ? "várias áreas de " + D.grupos[filtro.grupo].nome.toLowerCase() : "todas as áreas"}.
        Parte da diferença entre lugares vem da mistura de cursos: onde há mais Medicina, por exemplo, a nota tende a ser maior.</span>
        <button onClick=${escolherArea}>Escolher uma área para comparar de igual para igual</button>
      </div>`}

      <dl class="numeros">
        <div><dt>Cursos</dt><dd>${A.nf0.format(x ? x.cursos : 0)}</dd></div>
        <div><dt>Estudantes</dt><dd>${A.nf0.format(x ? x.est : 0)}</dd></div>
        <div><dt>${rotuloN}</dt><dd>${A.nf0.format(Math.round(A.pessoas(m, x)))}</dd></div>
      </dl>

      <div class="exportar">
        <button class="copiar" disabled=${lista.length === 0} onClick=${() => {
          try {
            const n = A.baixarCSV({ m, sel, passa });
            setCsvStatus(`CSV preparado com ${A.nf0.format(n)} cursos.`);
          } catch (e) { setCsvStatus("Não foi possível baixar. Tente novamente."); }
        }}>Baixar cursos da seleção (CSV)</button>
        <p class="explica">Todos os cursos desta área e deste lugar. Valores com menos de ${A.MIN_CURSO} pessoas ficam em branco, com o motivo indicado.</p>
        <span class="explica" role="status">${csvStatus}</span>
      </div>

      <section class="bloco">
        <h3>Comparações</h3>
        <p class="explica">${filtro.area ? "Diferenças observadas dentro da área selecionada." : "Diferenças brutas entre grupos. Selecione uma área para comparar cursos da mesma área."}</p>
        <${A.Duelos} m=${m} sel=${sel} passa=${passa} dom=${histDom} />
      </section>

      ${(sel.tipo === "br" || sel.tipo === "reg") && html`<section class="bloco">
        <h3>Por região</h3>
        <${A.Regioes} m=${m} agg=${agg} brValor=${brValor} sel=${sel} onSelect=${onSelect} dom=${histDom} cor=${corBarra} />
      </section>`}

      <section class="bloco">
        <h3>Como os cursos se distribuem</h3>
        <${A.Histograma} m=${m} valores=${comValor.map(z => z[1])} dom=${histDom} marca=${brValor} cor=${corBarra} />
      </section>

      <section class="bloco">
        <h3>
          <span>${ehIes ? "Cursos da instituição" : "Cursos"}</span>
          <span class="alternar" role="group" aria-label="Ordem">
            <button aria-pressed=${ordem === "maiores"} onClick=${() => setOrdem("maiores")}>Maiores</button>
            <button aria-pressed=${ordem === "menores"} onClick=${() => setOrdem("menores")}>Menores</button>
          </span>
        </h3>
        ${ranking.length === 0 && html`<p class="explica">Nenhum curso com pelo menos ${A.MIN_CURSO} respostas nesta seleção.</p>`}
        <ol class="lista">
          ${ranking.slice(0, limite).map(([i, val], pos) => {
            const mun = String(C.co_munic_curso[i]), uf = String(C.co_uf_curso[i]), ies = String(C.co_ies[i]);
            const largura = Math.max(2, Math.min(100, 100 * (val - histDom[0]) / (histDom[1] - histDom[0])));
            return html`<li key=${C.co_curso[i]}>
              <button onClick=${() => onSelect({ tipo: "mun", uf, mun })} title="Ver o município no mapa">
                <span class="pos">${pos + 1}</span>
                <span class="nome">${A.NOME_AREA[C.co_grupo[i]]}${C.co_modalidade[i] === 0 && html`<span class="tag">EaD</span>`}${C.rede[i] === 1 && html`<span class="tag">Pública</span>`}</span>
                <span class="valor">${A.fmtValor(m, val)}</span>
                <span class="onde">${A.iesSigla(ies) || A.iesNome(ies)} · ${A.munNome(mun)} (${A.ufSigla(uf)})</span>
                <span class="barra"><i style=${{ width: largura + "%", background: corBarra(val).css }}></i></span>
              </button>
            </li>`;
          })}
        </ol>
        ${ranking.length > limite && html`<button class="mais" onClick=${() => setLimite(l => l + 20)}>Mostrar mais (${A.nf0.format(ranking.length - limite)} restantes)</button>`}
      </section>

      ${tabelaOrdenada.length > 0 && html`<details class="tabela">
        <summary>${sel.tipo === "br" || sel.tipo === "reg" ? "Tabela por estado" : "Tabela por município"}</summary>
        <table>
          <thead><tr><th>${sel.tipo === "br" || sel.tipo === "reg" ? "Estado" : "Município"}</th><th>${m.curto}</th><th>Cursos</th></tr></thead>
          <tbody>
            ${tabelaOrdenada.map(r => html`<tr key=${r.k}>
              <td><button type="button" onClick=${() => { onSelect(r.sel); requestAnimationFrame(() => document.querySelector(".titulo")?.focus()); }}>${r.nome}</button></td><td>${A.fmtValor(m, r.v)}</td><td>${A.nf0.format(r.cursos)}</td></tr>`)}
          </tbody>
        </table>
      </details>`}

      <p class="fonte">Fonte: INEP, Microdados do ENADE 2023 e Censo da Educação Superior 2023. Os números são por curso: o INEP não permite ligar as respostas de um mesmo estudante entre arquivos (LGPD).
        <button onClick=${irMetodo}>Como os dados foram tratados</button></p>
    </aside>`;
  };
})(window.Atlas);
