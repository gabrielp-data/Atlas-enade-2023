// Atlas ENADE 2023 — aplicação: estado, link compartilhável e montagem da página.
(function (A) {
  "use strict";
  const { render } = window.preact;
  const { useState, useMemo, useEffect } = window.preactHooks;
  const html = A.html, C = A.C, NC = A.NC, D = A.D;

  const lerHash = () => A.lerEstado(location.hash);
  A.linkPublico = token => {
    const local = location.protocol === "file:" || /github\.io$|^localhost$|^127\.0\.0\.1$/.test(location.hostname);
    return (local ? location.href.split("#")[0] : A.URL_PUBLICA) + (token ? "#" + token : "");
  };

  function App() {
    const inicio = useMemo(lerHash, []);
    const [view, setView] = useState(inicio.view);
    const [metKey, setMetKey] = useState(inicio.met);
    const [filtro, setFiltro] = useState(inicio.filtro);
    const [nivel, setNivel] = useState(inicio.nivel);
    const [modo, setModo] = useState(inicio.modo);
    const [duelo, setDuelo] = useState(inicio.duelo);
    const [sel, setSel] = useState(inicio.sel);

    const m = A.METRICAS[metKey];
    const aba = A.ABAS.find(a => a.metricas.includes(metKey)).id;
    const passa = useMemo(() => A.filtroFn(filtro), [filtro]);
    const agg = useMemo(() => A.agregar(m, passa), [m, passa]);
    const aggA = useMemo(() => A.agregar(m, A.passaLado(passa, A.DUELOS[duelo], "a")), [m, passa, duelo]);
    const aggB = useMemo(() => A.agregar(m, A.passaLado(passa, A.DUELOS[duelo], "b")), [m, passa, duelo]);
    const brValor = A.valorDe(m, agg.br, 1);
    const escala = useMemo(() => A.montarEscala({ m, agg, nivel, modo, br: brValor, aggA, aggB, duelo: A.DUELOS[duelo] }),
      [agg, aggA, aggB, nivel, modo, brValor, duelo]);
    const histDom = useMemo(() => {
      const vs = [];
      for (let i = 0; i < NC; i++) if (passa(i)) { const v = A.valorCurso(m, i); if (v != null) vs.push(v); }
      return A.dominioHistograma(m, vs);
    }, [m, passa]);

    const token = A.montarToken({ view, met: metKey, filtro, nivel, modo, duelo, sel });
    useEffect(() => {
      try { history.replaceState(null, "", "#" + token); } catch (e) { /* alguns visualizadores bloqueiam */ }
    }, [token]);

    const rotuloArea = filtro.area ? A.NOME_AREA[filtro.area] : filtro.grupo >= 0 ? D.grupos[filtro.grupo].nome.toLowerCase() : null;
    const { titulo } = A.tituloDaSelecao(sel);
    const pedacos = A.manchete({ m, agg, sel, filtro, modo, duelo: A.DUELOS[duelo], aggA, aggB, brValor });
    useEffect(() => {
      document.title = view === "metodo" ? "Como os dados foram tratados · Atlas ENADE 2023"
        : `${titulo} · ${m.rotulo}${rotuloArea ? " em " + rotuloArea : ""} · Atlas ENADE 2023`;
    }, [view, titulo, m, rotuloArea]);

    // Conferência no navegador: as médias do site precisam bater com as calculadas no banco
    const falhas = useMemo(() => {
      const f = A.conferirDados().filter(c => !c.ok);
      if (f.length) console.error("Atlas ENADE: médias do site diferentes das do banco", f);
      return f;
    }, []);
    useEffect(() => {
      const aoMudar = () => {
        const st = lerHash();
        setView(st.view); setMetKey(st.met); setFiltro(st.filtro); setNivel(st.nivel); setModo(st.modo); setDuelo(st.duelo); setSel(st.sel);
      };
      window.addEventListener("hashchange", aoMudar);
      return () => window.removeEventListener("hashchange", aoMudar);
    }, []);

    const escolherAba = id => setMetKey(A.ABAS.find(a => a.id === id).metricas[0]);
    const selecionar = s => { if (s.tipo === "mun") setNivel("mun"); setSel(s); setView("mapa"); };
    const grupoAtual = filtro.grupo;
    const areasDoSeletor = grupoAtual >= 0 ? D.grupos[grupoAtual].areas
      : D.grupos.flatMap(g => g.areas).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));

    return html`<div class=${"app" + (view === "metodo" ? " so-topo" : "")}>
      <header class="topo">
        <button class="marca" onClick=${() => { setView("mapa"); setSel({ tipo: "br" }); }}>Atlas ENADE<span>2023</span></button>
        ${view === "mapa" ? html`<nav class="abas" aria-label="Indicador">
          ${A.ABAS.map(a => html`<button key=${a.id} class="aba" aria-pressed=${aba === a.id} onClick=${() => escolherAba(a.id)}>${a.rotulo}</button>`)}
        </nav>` : html`<span class="espaco"></span>`}
        <${A.Busca} onSelect=${selecionar} />
        <button class="link-metodo" onClick=${() => setView(view === "mapa" ? "metodo" : "mapa")}>
          ${view === "mapa" ? html`<span class="longo">Como os dados foram tratados</span><span class="curto">Método</span>` : "Voltar ao mapa"}
        </button>
      </header>

      ${falhas.length > 0 && html`<p class="alerta-dados" role="alert"><b>Atenção:</b> ${falhas.length} ${falhas.length === 1 ? "média do site não bate" : "médias do site não batem"} com o cálculo direto no banco.
        Rode <code>site/scripts/exportar_dados.py</code> de novo antes de usar estes números.</p>`}

      ${view === "mapa" && html`<div class="filtros" role="group" aria-label="Área do curso">
        <span class="rotulo">Área do curso</span>
        <button class="chip" aria-pressed=${filtro.grupo === -1 && !filtro.area} onClick=${() => setFiltro({ grupo: -1, area: 0 })}>Todas</button>
        ${D.grupos.map((g, gi) => html`<button key=${g.nome} class="chip" aria-pressed=${filtro.grupo === gi && !filtro.area}
          onClick=${() => setFiltro({ grupo: gi, area: 0 })}>${g.nome}</button>`)}
        <select id="area" class="seletor" aria-label="Escolher uma área específica" value=${String(filtro.area)}
          onChange=${e => { const c = +e.target.value; setFiltro(c ? { grupo: A.GRUPO_DA_AREA[c], area: c } : { grupo: filtro.grupo, area: 0 }); }}>
          <option value="0">${grupoAtual >= 0 ? "Todas de " + D.grupos[grupoAtual].nome.toLowerCase() : "Escolher área específica"}</option>
          ${areasDoSeletor.map(([c, n]) => html`<option key=${c} value=${String(c)}>${n}</option>`)}
        </select>
      </div>`}

      ${view === "mapa" && html`<div class="resumo-movel" aria-hidden="true">
        <div class="lugar">${titulo}<small>${m.rotulo}${rotuloArea ? " em " + rotuloArea : ""}</small></div>
        <p class="manchete">${pedacos.map((p, i) => typeof p === "string" ? p : html`<b key=${i}>${p.f}</b>`)}</p>
      </div>`}

      ${view === "mapa" ? html`<main class="corpo">
        <${A.Painel} m=${m} agg=${agg} sel=${sel} passa=${passa} filtro=${filtro} pedacos=${pedacos}
          brValor=${brValor} escala=${escala} histDom=${histDom} onSelect=${selecionar} token=${token} irMetodo=${() => setView("metodo")} />
        <${A.Mapa} m=${m} nivel=${nivel} modo=${modo} duelo=${duelo} sel=${sel} escala=${escala} agg=${agg}
          brValor=${brValor} rotuloArea=${rotuloArea} onSelect=${selecionar} setNivel=${setNivel} setModo=${setModo} setDuelo=${setDuelo}
          metKey=${metKey} setMetKey=${setMetKey} aba=${aba} />
      </main>` : html`<${A.Metodo} voltar=${() => setView("mapa")} />`}
    </div>`;
  }

  const raiz = document.getElementById("app");
  raiz.textContent = "";   // tira o "Carregando o mapa…"
  render(html`<${App} />`, raiz);
  A.montado = true;
})(window.Atlas);
