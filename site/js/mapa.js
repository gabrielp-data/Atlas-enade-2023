// Atlas ENADE 2023 — mapa em Canvas 2D (malha do IBGE).
// Duas camadas: "tela" desenha o mapa; "realce" desenha só o contorno do lugar sob o mouse.
// Assim, passar o mouse não redesenha os 5.570 municípios a cada movimento.
(function (A) {
  "use strict";
  const { useState, useEffect, useRef } = window.preactHooks;
  const html = A.html, C = A.C, NC = A.NC, GEO = A.GEO;
  const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FONTE = '"Geist", "Segoe UI", sans-serif';

  // Texto do rótulo de um estado. No duelo, diz qual lado tem valor maior (a cor sozinha não basta).
  function rotuloValor(p, val, compacto) {
    if (val == null) return null;
    if (p.escala.tipo === "duelo") {
      const lado = A.DUELOS[p.duelo][val.gap >= 0 ? "a" : "b"].curto;
      return compacto ? lado : `${lado} +${A.fmtGap(p.m, val.gap)}`;
    }
    if (p.escala.tipo === "dif") return A.fmtDifCurto(p.m, val - p.escala.br);
    return A.fmtValor(p.m, val);
  }

  A.Mapa = function Mapa(props) {
    const { m, nivel, modo, duelo, sel, escala, agg, brValor, rotuloArea, onSelect, setNivel, setModo, setDuelo, metKey, setMetKey, aba } = props;
    const caixa = useRef(null), tela = useRef(null), realce = useRef(null), topo = useRef(null), caixaLegenda = useRef(null);
    const tam = useRef({ W: 0, H: 0, dpr: 1 });
    const vista = useRef(null), base = useRef(null), anim = useRef(0), agenda = useRef(0);
    const hachura = useRef(null);
    const atual = useRef({});
    const [dica, setDica] = useState(null);
    atual.current = { m, nivel, sel, escala, dica, duelo };

    // ── camada do mapa ──
    function desenharMapa() {
      const cv = tela.current, v = vista.current;
      if (!cv || !v) return;
      const { W, H, dpr } = tam.current;
      const p = atual.current;
      const ctx = cv.getContext("2d");
      if (!hachura.current) hachura.current = ctx.createPattern(A.criarHachura(), "repeat");
      const hach = hachura.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#0d0e10";
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * v.tx, dpr * v.ty);
      const px = 1 / v.s;
      hach.setTransform(new DOMMatrix([px, 0, 0, px, 0, 0]));
      ctx.lineJoin = "round";
      const emFoco = p.sel.tipo === "uf" || p.sel.tipo === "mun" ? id => id === p.sel.uf
        : p.sel.tipo === "reg" ? id => id[0] === p.sel.reg : null;
      const cores = p.escala.cores;
      const lista = p.nivel === "uf" ? GEO.ufs : GEO.muns;
      for (const g of lista) {
        const ufId = p.nivel === "uf" ? g.id : g.uf;
        ctx.globalAlpha = emFoco && !emFoco(ufId) ? 0.33 : 1;
        const c = cores.get(g.id);
        ctx.fillStyle = c ? c.css : hach;
        ctx.fill(g.path, "evenodd");
      }
      ctx.globalAlpha = 1;
      if (p.nivel === "mun" && v.s > base.current.s * 2.2) {
        ctx.strokeStyle = "rgba(13,14,16,.85)"; ctx.lineWidth = 0.6 * px;
        for (const mu of GEO.muns) if (!emFoco || emFoco(mu.uf)) ctx.stroke(mu.path);
      }
      ctx.strokeStyle = "#0d0e10"; ctx.lineWidth = 1.6 * px;
      for (const u of GEO.ufs) ctx.stroke(u.path);

      ctx.strokeStyle = "#f1f0eb";
      if (emFoco) { ctx.lineWidth = 1.5 * px; for (const u of GEO.ufs) if (emFoco(u.id)) ctx.stroke(u.path); }
      if (p.sel.tipo === "mun" && GEO.munPorId.get(p.sel.mun)) { ctx.lineWidth = 2.2 * px; ctx.stroke(GEO.munPorId.get(p.sel.mun).path); }
      if (p.sel.tipo === "ies") {
        ctx.lineWidth = 1.8 * px;
        const vistos = new Set();
        for (let i = 0; i < NC; i++) {
          if (String(C.co_ies[i]) !== p.sel.ies) continue;
          const k = String(C.co_munic_curso[i]);
          if (vistos.has(k)) continue;
          vistos.add(k);
          const mu = GEO.munPorId.get(k);
          if (mu) ctx.stroke(mu.path);
        }
      }
      if (p.nivel === "uf") rotulos(ctx, v, dpr, W, H, p);
    }

    // ── camada do realce (mouse) ──
    function desenharRealce() {
      const cv = realce.current, v = vista.current;
      if (!cv || !v) return;
      const { dpr } = tam.current;
      const ctx = cv.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      const d = atual.current.dica;
      if (!d) return;
      const g = d.tipo === "uf" ? GEO.ufPorId.get(d.id) : GEO.munPorId.get(d.id);
      if (!g) return;
      ctx.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * v.tx, dpr * v.ty);
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(241,240,235,.92)"; ctx.lineWidth = 1.6 / v.s;
      ctx.stroke(g.path);
    }
    const desenhar = () => { desenharMapa(); desenharRealce(); };

    function rotulos(ctx, v, dpr, W, H, p) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const emBrasil = Math.abs(v.s - base.current.s) / base.current.s < 0.02;
      const compacto = v.s < 7.5; // mapa pequeno (celular): rótulos mais curtos
      const caixas = [];
      ctx.textAlign = "center";
      for (const u of GEO.ufs) {
        const c = p.escala.cores.get(u.id), val = p.escala.vals.get(u.id);
        if (emBrasil && A.CAIXAS.has(u.id)) { caixas.push({ u, c, txt: rotuloValor(p, val, compacto) }); continue; }
        const d = A.DESLOCA[u.id] || [0, 0];
        const x = v.s * (u.c[0] + d[0]) + v.tx, y = v.s * (u.c[1] + d[1]) + v.ty;
        if (x < -30 || x > W + 30 || y < -30 || y > H + 30) continue;
        const foraDoFoco = p.sel.tipo === "uf" || p.sel.tipo === "mun" ? u.id !== p.sel.uf
          : p.sel.tipo === "reg" ? u.id[0] !== p.sel.reg : false;
        ctx.fillStyle = !foraDoFoco && c && c.L > 0.72 ? "#0d0e10" : "#f1f0eb";
        if (compacto) { ctx.font = `600 10px ${FONTE}`; ctx.fillText(A.ufSigla(u.id), x, y + 4); continue; }
        const txt = rotuloValor(p, val, false);
        ctx.font = `600 12px ${FONTE}`;
        ctx.fillText(A.ufSigla(u.id), x, y - 1);
        if (txt) { ctx.font = `500 11px ${FONTE}`; ctx.globalAlpha = 0.85; ctx.fillText(txt, x, y + 12); ctx.globalAlpha = 1; }
      }
      if (!caixas.length) return;
      caixas.sort((a, b) => a.u.c[1] - b.u.c[1]);
      const colX = v.s * GEO.bb[2] + v.tx + 18, bh = 26;
      let ultimo = -Infinity;
      for (const k of caixas) {
        const sigla = A.ufSigla(k.u.id), txt = k.txt || "—";
        ctx.font = `600 12px ${FONTE}`; const ls = ctx.measureText(sigla).width;
        ctx.font = `500 11px ${FONTE}`; const lt = ctx.measureText(txt).width;
        const bw = Math.max(64, Math.ceil(8 + ls + 10 + lt + 7));
        const cy = v.s * k.u.c[1] + v.ty, cx = v.s * k.u.c[0] + v.tx;
        const ly = Math.max(cy, ultimo + bh + 6);
        ultimo = ly;
        ctx.strokeStyle = "#4a4f57"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(colX - 6, ly); ctx.lineTo(colX, ly); ctx.stroke();
        ctx.fillStyle = k.c ? k.c.css : "#1c1f23";
        ctx.beginPath(); ctx.roundRect(colX, ly - bh / 2, bw, bh, 5); ctx.fill();
        ctx.fillStyle = k.c && k.c.L > 0.72 ? "#0d0e10" : "#f1f0eb";
        ctx.textAlign = "left"; ctx.font = `600 12px ${FONTE}`;
        ctx.fillText(sigla, colX + 8, ly + 4);
        ctx.textAlign = "right"; ctx.font = `500 11px ${FONTE}`;
        ctx.fillText(txt, colX + bw - 7, ly + 4);
      }
    }

    const pedirDesenho = () => { cancelAnimationFrame(agenda.current); agenda.current = requestAnimationFrame(desenhar); };

    // ── zoom ──
    // as margens acompanham a altura real dos controles (em cima) e da legenda (embaixo),
    // para nenhum estado ficar escondido atrás deles
    const margens = (W, zoom) => {
      const m0 = zoom ? A.margemZoom(W) : A.margemBrasil(W);
      const alturaControles = topo.current ? topo.current.offsetHeight + 20 : m0.t;
      const alturaLegenda = caixaLegenda.current ? caixaLegenda.current.offsetHeight + 20 : m0.b;
      return { ...m0, t: Math.max(m0.t, alturaControles), b: Math.max(m0.b, alturaLegenda) };
    };
    const alvo = s => {
      const { W, H } = tam.current;
      return s.tipo === "br" ? base.current : A.enquadrar(A.bbDaSelecao(s), W, H, margens(W, true));
    };
    const reenquadrar = () => {
      const { W, H } = tam.current;
      base.current = A.enquadrar(GEO.bb, W, H, margens(W, false));
      vista.current = alvo(atual.current.sel);
    };
    function irPara(a) {
      cancelAnimationFrame(anim.current);
      const ini = vista.current;
      if (!ini || reduzMovimento) { vista.current = a; pedirDesenho(); return; }
      const { W, H } = tam.current;
      const c0 = [(W / 2 - ini.tx) / ini.s, (H / 2 - ini.ty) / ini.s], c1 = [(W / 2 - a.tx) / a.s, (H / 2 - a.ty) / a.s];
      const t0 = performance.now();
      const passo = agora => {
        const t = Math.min(1, (agora - t0) / 480), e = 1 - Math.pow(1 - t, 3);
        const s = Math.exp(Math.log(ini.s) + (Math.log(a.s) - Math.log(ini.s)) * e);
        const cx = c0[0] + (c1[0] - c0[0]) * e, cy = c0[1] + (c1[1] - c0[1]) * e;
        vista.current = { s, tx: W / 2 - s * cx, ty: H / 2 - s * cy };
        desenhar();
        if (t < 1) anim.current = requestAnimationFrame(passo);
      };
      anim.current = requestAnimationFrame(passo);
    }

    useEffect(() => {
      const ro = new ResizeObserver(() => {
        const r = caixa.current.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
        tam.current = { W: r.width, H: r.height, dpr };
        for (const cv of [tela.current, realce.current]) {
          cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
        }
        reenquadrar();
        desenhar();
      });
      ro.observe(caixa.current);
      ro.observe(topo.current);          // controles mudam de altura (ex.: abre a escolha do duelo)
      ro.observe(caixaLegenda.current);  // a legenda do duelo é mais alta
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(pedirDesenho);
      return () => { ro.disconnect(); cancelAnimationFrame(anim.current); cancelAnimationFrame(agenda.current); };
    }, []);
    useEffect(() => { if (base.current) irPara(alvo(sel)); }, [sel]);
    useEffect(() => { if (base.current) { reenquadrar(); pedirDesenho(); } }, [modo, aba]);
    useEffect(() => { pedirDesenho(); }, [escala, nivel, m]);
    useEffect(() => { desenharRealce(); }, [dica]);

    useEffect(() => {
      const cv = realce.current;
      const rolar = ev => {
        // Ctrl/Command + roda continua sendo o zoom do navegador.
        if (ev.ctrlKey || ev.metaKey || !vista.current || !base.current) return;
        const r = cv.getBoundingClientRect();
        const delta = ev.deltaY * (ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? r.height : 1);
        const proxima = A.zoomDaRoda(vista.current, base.current, delta, ev.clientX - r.left, ev.clientY - r.top);
        if (proxima === vista.current) return;
        ev.preventDefault();
        cancelAnimationFrame(anim.current);
        vista.current = proxima;
        setDica(null);
        pedirDesenho();
      };
      cv.addEventListener("wheel", rolar, { passive: false });
      return () => cv.removeEventListener("wheel", rolar);
    }, []);

    // ── mouse ──
    function acertar(ev) {
      const r = realce.current.getBoundingClientRect(), v = vista.current;
      const sx = ev.clientX - r.left, sy = ev.clientY - r.top;
      const x = (sx - v.tx) / v.s, y = (sy - v.ty) / v.s;
      const ctx = tela.current.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const u = GEO.ufs.find(g => A.dentro(g.bb, x, y) && ctx.isPointInPath(g.path, x, y, "evenodd"));
      if (!u) return null;
      if (nivel === "uf") return { tipo: "uf", id: u.id, uf: u.id, sx, sy };
      const mu = (GEO.munsDaUf.get(u.id) || []).find(g => A.dentro(g.bb, x, y) && ctx.isPointInPath(g.path, x, y, "evenodd"));
      return mu ? { tipo: "mun", id: mu.id, uf: u.id, sx, sy } : { tipo: "uf", id: u.id, uf: u.id, sx, sy };
    }
    const mover = ev => { if (vista.current) setDica(acertar(ev)); };
    const clicar = ev => {
      const a = acertar(ev);
      if (!a) return;
      onSelect(a.tipo === "uf" ? { tipo: "uf", uf: a.id } : { tipo: "mun", uf: a.uf, mun: a.id });
    };

    // ── dica ──
    let dicaHtml = null;
    if (dica) {
      const ehUf = dica.tipo === "uf";
      const z = ehUf ? agg.uf.get(dica.id) : agg.mun.get(dica.id);
      const val = escala.vals.get(dica.id);
      const nome = ehUf ? A.ufNome(dica.id) : (A.D.municipios[dica.id] || "Município sem curso avaliado");
      const { W, H } = tam.current;
      const left = Math.max(8, Math.min(dica.sx + 16, W - 270)), top = Math.max(8, Math.min(dica.sy + 16, H - 150));
      const d = A.DUELOS[duelo];
      let corpo;
      if (escala.tipo === "duelo") {
        corpo = val ? html`
          <div class="par"><span><i class="bola a"></i>${d.a.nome}</span><b>${A.fmtValor(m, val.a)}</b></div>
          <div class="par"><span><i class="bola b"></i>${d.b.nome}</span><b>${A.fmtValor(m, val.b)}</b></div>
          <div class="d">Diferença de ${A.fmtGapUnidade(m, val.gap)} a favor de ${val.gap >= 0 ? d.a.nome : d.b.nome}</div>`
          : html`<div class="d">Poucas respostas de um dos lados para comparar</div>`;
      } else {
        corpo = val != null ? html`
          <div class="v">${A.fmtValor(m, val)}</div>
          ${brValor != null && html`<div class="d">${A.fmtDif(m, val - brValor)} em relação ao Brasil</div>`}`
          : html`<div class="d">${z ? "Poucas respostas para calcular" : "Nenhum curso nesta seleção"}</div>`;
      }
      dicaHtml = html`<div class="dica" style=${{ left: left + "px", top: top + "px" }}>
        <div class="lugar">${nome}${!ehUf && html`<small>${A.ufSigla(dica.uf)}</small>`}</div>
        ${corpo}
        ${z && html`<div class="n">${A.nf0.format(z.cursos)} ${z.cursos === 1 ? "curso" : "cursos"} · ${A.nf0.format(z.est)} estudantes</div>`}
        <div class="n">Clique para ver os detalhes</div>
      </div>`;
    }

    // ── legenda ──
    const porOnde = nivel === "uf" ? "por estado" : "por município";
    const naArea = rotuloArea ? ` em ${rotuloArea}` : "";
    let legenda;
    if (escala.tipo === "valor") {
      legenda = html`<div class="t">${m.rotulo}${naArea} · ${porOnde}</div>
        <div class="barra-cor" style=${{ background: A.gradiente(t => A.corSeq(t), 0, 1) }}></div>
        <div class="marcas"><span>${A.fmtValor(m, escala.lo)}</span><span>${A.fmtValor(m, (escala.lo + escala.hi) / 2)}</span><span>${A.fmtValor(m, escala.hi)}</span></div>`;
    } else if (escala.tipo === "dif") {
      legenda = html`<div class="t">${m.rotulo}${naArea}: diferença para o Brasil (${A.fmtValor(m, escala.br)}) · ${porOnde}</div>
        <div class="barra-cor" style=${{ background: A.gradiente(t => A.corDiv(t), -1, 1) }}></div>
        <div class="marcas"><span>${A.fmtDif(m, -escala.D)}</span><span>igual</span><span>${A.fmtDif(m, escala.D)}</span></div>`;
    } else {
      const d = A.DUELOS[duelo];
      const f = escala.faixas.map(x => Number.isInteger(x) ? A.nf0.format(x) : A.fmtGap(m, x));
      const unidade = A.fmtGapUnidade(m, escala.faixas[2]).replace(/^[\d,.]+/, "");
      legenda = html`<div class="t">${m.rotulo}${naArea}: ${d.rotulo} · ${porOnde}</div>
        <div class="faixas">
          ${["a", "b"].map(l => html`<div class="caixas" key=${l}>${[0, 1, 2, 3].map(k => html`<i key=${k} style=${{ background: A.corDuelo(l, k).css }}></i>`)}</div>
            <span>${d[l].nome} maior (${d[l].curto})</span>`)}
          <div class="escala-faixas"><span>${f[0]}</span><span>${f[1]}</span><span>${f[2]}${unidade}</span></div>
        </div>`;
    }

    const abaAtual = A.ABAS.find(a => a.id === aba);
    return html`<div class="mapa" ref=${caixa}>
      <canvas ref=${tela} class="camada-mapa" aria-hidden="true"></canvas>
      <canvas ref=${realce} role="img" aria-label=${`Mapa do Brasil: ${m.rotulo}${naArea} ${porOnde}`} aria-describedby="mapa-ajuda"
        onMouseMove=${mover} onMouseLeave=${() => setDica(null)} onClick=${clicar}></canvas>
      <p id="mapa-ajuda" class="so-leitor">Clique num estado ou município para ver os detalhes no painel. Role para baixo para afastar o mapa e para cima para aproximar. Pelo teclado, use a tabela por estado no fim do painel.</p>
      <div class="mapa-topo" ref=${topo}>
        <div class="grupo-seg">
          ${abaAtual.metricas.length > 1 && html`<div class="seg" role="group" aria-label="Indicador">
            ${abaAtual.metricas.map(k => html`<button key=${k} aria-pressed=${metKey === k} onClick=${() => setMetKey(k)}>${A.METRICAS[k].curto}</button>`)}
          </div>`}
        </div>
        <div class="grupo-seg">
          <div class="seg" role="group" aria-label="Divisão do mapa">
            <button aria-pressed=${nivel === "uf"} onClick=${() => setNivel("uf")}>Estados</button>
            <button aria-pressed=${nivel === "mun"} onClick=${() => setNivel("mun")}>Municípios</button>
          </div>
          <div class="seg" role="group" aria-label="Cor do mapa">
            <button aria-pressed=${modo === "valor"} onClick=${() => setModo("valor")}>Valor</button>
            <button aria-pressed=${modo === "dif"} onClick=${() => setModo("dif")}>Comparado ao Brasil</button>
            <button aria-pressed=${modo === "duelo"} onClick=${() => setModo("duelo")}>Duelo</button>
          </div>
          ${modo === "duelo" && html`<div class="seg" role="group" aria-label="Duelo">
            ${Object.values(A.DUELOS).map(d => html`<button key=${d.id} aria-pressed=${duelo === d.id} onClick=${() => setDuelo(d.id)}>${d.rotulo}</button>`)}
          </div>`}
        </div>
      </div>
      <div class="legenda" ref=${caixaLegenda}>
        ${legenda}
        <div class="sem"><i class="hachura"></i>${escala.tipo === "duelo" ? `Menos de ${A.MIN_LOCAL} respostas em um dos lados` : `Menos de ${A.MIN_LOCAL} respostas`}</div>
      </div>
      ${sel.tipo !== "br" && html`<button class="voltar" onClick=${() => onSelect({ tipo: "br" })}>← <span class="longo">Ver o </span>Brasil<span class="longo"> todo</span></button>`}
      ${dicaHtml}
    </div>`;
  };
})(window.Atlas);
