// Atlas ENADE 2023 — aplicação: estado, link compartilhável e montagem da página.
(function (A) {
  "use strict";
  const { render } = window.preact;
  const { useState, useMemo, useEffect } = window.preactHooks;
  const html = A.html, C = A.C, NC = A.NC, D = A.D;

  // ───────── Link compartilhável ─────────
  // Ex.: #ger-a12-ufmg = nota geral, Medicina, Minas Gerais. Só letras, números e hífen (o Claude só repassa esse formato).
  const PADRAO = { view: "mapa", met: "ger", filtro: { grupo: -1, area: 0 }, nivel: "uf", modo: "valor", duelo: "rede", sel: { tipo: "br" } };
  function lerHash() {
    const st = JSON.parse(JSON.stringify(PADRAO));
    for (const t of location.hash.replace(/^#/, "").split("-").filter(Boolean)) {
      if (t === "metodo") st.view = "metodo";
      else if (A.METRICAS[t]) st.met = t;
      else if (t === "municipios") st.nivel = "mun";
      else if (t === "comparado") st.modo = "dif";
      else if (A.DUELOS[t]) { st.modo = "duelo"; st.duelo = t; }
      else if (/^a\d+$/.test(t) && A.NOME_AREA[+t.slice(1)]) { const c = +t.slice(1); st.filtro = { grupo: A.GRUPO_DA_AREA[c], area: c }; }
      else if (/^g\d$/.test(t) && D.grupos[+t.slice(1)]) st.filtro = { grupo: +t.slice(1), area: 0 };
      else if (/^r[1-5]$/.test(t)) st.sel = { tipo: "reg", reg: t.slice(1) };
      else if (/^m\d{7}$/.test(t) && D.municipios[t.slice(1)]) st.sel = { tipo: "mun", uf: t.slice(1, 3), mun: t.slice(1) };
      else if (/^i\d+$/.test(t) && D.ies[t.slice(1)]) st.sel = { tipo: "ies", ies: t.slice(1) };
      else if (/^uf[a-z]{2}$/.test(t) && A.ufDaSigla[t.slice(2)]) st.sel = { tipo: "uf", uf: A.ufDaSigla[t.slice(2)] };
    }
    if (st.sel.tipo === "mun") st.nivel = "mun";
    return st;
  }
  function montarToken(st) {
    if (st.view === "metodo") return "metodo";
    const t = [st.met];
    if (st.filtro.area) t.push("a" + st.filtro.area); else if (st.filtro.grupo >= 0) t.push("g" + st.filtro.grupo);
    if (st.nivel === "mun" && st.sel.tipo !== "mun") t.push("municipios");
    if (st.modo === "dif") t.push("comparado");
    if (st.modo === "duelo") t.push(st.duelo);
    const s = st.sel;
    if (s.tipo === "reg") t.push("r" + s.reg);
    if (s.tipo === "uf") t.push("uf" + A.ufSigla(s.uf).toLowerCase());
    if (s.tipo === "mun") t.push("m" + s.mun);
    if (s.tipo === "ies") t.push("i" + s.ies);
    return t.join("-");
  }
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
      vs.sort((a, b) => a - b);
      if (!vs.length) return [0, 1];
      let lo = vs[Math.floor(0.01 * (vs.length - 1))], hi = vs[Math.ceil(0.99 * (vs.length - 1))];
      if (m.tipo === "pct") { lo = Math.max(0, Math.floor(lo / 10) * 10); hi = Math.min(100, Math.ceil(hi / 10) * 10); }
      else if (m.tipo === "escala") { lo = Math.floor(lo * 2) / 2; hi = Math.ceil(hi * 2) / 2; }
      else { lo = Math.floor(lo / 5) * 5; hi = Math.ceil(hi / 5) * 5; }
      return hi > lo ? [lo, hi] : [lo, lo + 1];
    }, [m, passa]);

    const token = montarToken({ view, met: metKey, filtro, nivel, modo, duelo, sel });
    useEffect(() => {
      try { history.replaceState(null, "", "#" + token); } catch (e) { /* alguns visualizadores bloqueiam */ }
    }, [token]);
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
          ${view === "mapa" ? "Como os dados foram tratados" : "Voltar ao mapa"}
        </button>
      </header>

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

      ${view === "mapa" ? html`<main class="corpo">
        <${A.Painel} m=${m} agg=${agg} aggA=${aggA} aggB=${aggB} sel=${sel} passa=${passa} filtro=${filtro} modo=${modo} duelo=${duelo}
          brValor=${brValor} escala=${escala} histDom=${histDom} onSelect=${selecionar} token=${token} irMetodo=${() => setView("metodo")} />
        <${A.Mapa} m=${m} nivel=${nivel} modo=${modo} duelo=${duelo} sel=${sel} escala=${escala} agg=${agg} aggA=${aggA} aggB=${aggB}
          brValor=${brValor} onSelect=${selecionar} setNivel=${setNivel} setModo=${setModo} setDuelo=${setDuelo}
          metKey=${metKey} setMetKey=${setMetKey} aba=${aba} />
      </main>` : html`<${A.Metodo} voltar=${() => setView("mapa")} />`}
    </div>`;
  }

  render(html`<${App} />`, document.getElementById("app"));
})(window.Atlas);
