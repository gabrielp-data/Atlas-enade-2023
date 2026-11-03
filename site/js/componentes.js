// Atlas ENADE 2023 — componentes: busca, distribuição, duelos e regiões.
(function (A) {
  "use strict";
  const { h } = window.preact;
  const { useState, useMemo } = window.preactHooks;
  const html = window.htm.bind(h);
  A.html = html;
  const D = A.D;

  // ───────── Busca por faculdade ou cidade ─────────
  A.Busca = function Busca({ onSelect }) {
    const [q, setQ] = useState("");
    const [aberto, setAberto] = useState(false);
    const [ativo, setAtivo] = useState(0);
    const indice = useMemo(() => [
      ...Object.entries(D.ies).map(([k, [sg, nome]]) => ({ tipo: "ies", id: k, titulo: nome, detalhe: sg ? `${sg} · instituição` : "instituição", chave: A.normal(`${sg} ${nome}`) })),
      ...Object.entries(D.municipios).map(([k, nome]) => ({ tipo: "mun", id: k, uf: k.slice(0, 2), titulo: nome, detalhe: `${A.ufSigla(k.slice(0, 2))} · município`, chave: A.normal(nome) })),
    ], []);
    const res = useMemo(() => {
      const t = A.normal(q.trim());
      if (t.length < 2) return [];
      const comeca = [], contem = [];
      for (const r of indice) {
        const p = r.chave.indexOf(t);
        if (p === 0 || r.chave.includes(" " + t)) comeca.push(r); else if (p > 0) contem.push(r);
        if (comeca.length >= 8) break;
      }
      return comeca.concat(contem).slice(0, 8);
    }, [q]);
    const escolher = r => {
      onSelect(r.tipo === "ies" ? { tipo: "ies", ies: r.id } : { tipo: "mun", uf: r.uf, mun: r.id });
      setQ(""); setAberto(false);
    };
    const tecla = e => {
      if (e.key === "ArrowDown") { e.preventDefault(); setAtivo(a => Math.min(a + 1, res.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setAtivo(a => Math.max(a - 1, 0)); }
      else if (e.key === "Enter" && res[ativo]) escolher(res[ativo]);
      else if (e.key === "Escape") setAberto(false);
    };
    return html`<div class="busca">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5.25" stroke="#747981" stroke-width="1.5"/><path d="M11 11l3.5 3.5" stroke="#747981" stroke-width="1.5" stroke-linecap="round"/></svg>
      <input id="busca" type="search" placeholder="Buscar faculdade ou cidade" value=${q} autocomplete="off"
        aria-label="Buscar faculdade ou cidade"
        onInput=${e => { setQ(e.target.value); setAberto(true); setAtivo(0); }}
        onFocus=${() => setAberto(true)} onBlur=${() => setTimeout(() => setAberto(false), 150)} onKeyDown=${tecla} />
      ${aberto && q.trim().length >= 2 && html`<ul class="resultados" role="listbox">
        ${res.length ? res.map((r, i) => html`<li key=${r.tipo + r.id}>
          <button class=${i === ativo ? "ativo" : ""} onMouseDown=${e => e.preventDefault()} onClick=${() => escolher(r)}>
            <span>${r.titulo}</span><small>${r.detalhe}</small>
          </button></li>`) : html`<li class="vazio">Nada encontrado para “${q}”.</li>`}
      </ul>`}
    </div>`;
  };

  // ───────── Distribuição dos cursos (histograma) ─────────
  A.Histograma = function Histograma({ m, valores, dom, marca, cor }) {
    const [foco, setFoco] = useState(null);
    const W = 340, H = 120, x0 = 6, x1 = W - 6, y0 = 8, y1 = 92, NB = 24;
    const [lo, hi] = dom;
    const passo = (hi - lo) / NB;
    const bins = new Array(NB).fill(0);
    for (const v of valores) bins[Math.min(NB - 1, Math.max(0, Math.floor((v - lo) / passo)))]++;
    const maxB = Math.max(1, ...bins);
    const X = v => x0 + (x1 - x0) * (v - lo) / (hi - lo);
    const bw = (x1 - x0) / NB;
    const marcas = (() => {
      const bruto = (hi - lo) / 4, p = Math.pow(10, Math.floor(Math.log10(bruto))), f = bruto / p;
      const st = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
      const t = [];
      for (let v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) t.push(+v.toFixed(6));
      return t;
    })();
    const legenda = foco == null
      ? `${A.nf0.format(valores.length)} cursos com pelo menos ${A.MIN_CURSO} respostas`
      : `${A.nf0.format(bins[foco])} cursos entre ${A.fmtValor(m, lo + foco * passo)} e ${A.fmtValor(m, lo + (foco + 1) * passo)}`;
    return html`<div>
      <div class="legenda-hist">${legenda}</div>
      <svg class="grafico" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label=${"Distribuição dos cursos: " + m.rotulo}
        onMouseLeave=${() => setFoco(null)}>
        <line x1=${x0} x2=${x1} y1=${y1} y2=${y1} stroke="#383c43" stroke-width="1"/>
        ${bins.map((b, i) => {
          const alt = b ? Math.max(2, (y1 - y0) * b / maxB) : 0;
          return html`<g key=${i} onMouseEnter=${() => setFoco(i)}>
            <rect x=${x0 + i * bw} y=${y0} width=${bw} height=${y1 - y0} fill="transparent"/>
            ${alt > 0 && html`<rect x=${x0 + i * bw + 1} y=${y1 - alt} width=${Math.max(1, bw - 2)} height=${alt} rx="1.5"
              fill=${cor(lo + (i + 0.5) * passo).css} opacity=${foco == null || foco === i ? 1 : 0.45}/>`}
          </g>`;
        })}
        ${marca != null && marca >= lo && marca <= hi && html`<line x1=${X(marca)} x2=${X(marca)} y1=${y0 - 2} y2=${y1} stroke="#f1f0eb" stroke-width="1" stroke-dasharray="3 3"/>`}
        ${marcas.map(t => html`<text key=${t} x=${X(t)} y=${H - 8} text-anchor="middle">${m.tipo === "pct" ? A.nf0.format(t) + "%" : A.nf0.format(t)}</text>`)}
      </svg>
      ${marca != null && html`<div class="legenda-hist" style="color:var(--tinta-3)">Linha tracejada: Brasil (${A.fmtValor(m, marca)})</div>`}
    </div>`;
  };

  // ───────── Duelos: Pública × Privada e Presencial × EaD (gráfico de halteres) ─────────
  A.Duelos = function Duelos({ m, sel, passa, dom }) {
    const linhas = useMemo(() => Object.values(A.DUELOS).map(d => ({ d, ...A.valoresDuelo(m, sel, passa, d) })), [m, sel, passa]);
    const W = 320, x0 = 8, x1 = W - 8;
    const X = v => x0 + (x1 - x0) * Math.min(1, Math.max(0, (v - dom[0]) / (dom[1] - dom[0])));
    return html`<div class="duelos">
      ${linhas.map(({ d, a, b }) => {
        const ambos = a.v != null && b.v != null;
        return html`<div class="duelo" key=${d.id}>
          <div class="nomes">
            <span><i class="bola a" aria-hidden="true"></i>${d.a.nome} <b>${A.fmtValor(m, a.v)}</b></span>
            <span>${d.b.nome} <b>${A.fmtValor(m, b.v)}</b><i class="bola b" aria-hidden="true"></i></span>
          </div>
          <svg class="grafico" viewBox="0 0 ${W} 22" width="100%" role="img"
            aria-label=${`${d.rotulo}: ${d.a.nome} ${A.fmtValor(m, a.v)}, ${d.b.nome} ${A.fmtValor(m, b.v)}`}>
            <line x1=${x0} x2=${x1} y1="11" y2="11" stroke="#2c3036" stroke-width="2" stroke-linecap="round"/>
            ${ambos && html`<line x1=${X(a.v)} x2=${X(b.v)} y1="11" y2="11" stroke="#5a5f67" stroke-width="3" stroke-linecap="round"/>`}
            ${b.v != null && html`<circle cx=${X(b.v)} cy="11" r="6" fill=${A.CORES_DUELO.b} stroke="#141619" stroke-width="2"/>`}
            ${a.v != null && html`<circle cx=${X(a.v)} cy="11" r="6" fill=${A.CORES_DUELO.a} stroke="#141619" stroke-width="2"/>`}
          </svg>
          <div class="rodape">
            ${ambos ? `Diferença de ${A.fmtGapUnidade(m, a.v - b.v)} a favor de ${a.v >= b.v ? d.a.nome : d.b.nome}` : "Poucas respostas de um dos lados para comparar"}
            · ${A.nf0.format(a.cursos)} cursos ${d.a.cursos} e ${A.nf0.format(b.cursos)} ${d.b.cursos}
          </div>
        </div>`;
      })}
    </div>`;
  };

  // ───────── Regiões ─────────
  A.Regioes = function Regioes({ m, agg, brValor, sel, onSelect, dom, cor }) {
    return html`<ul class="regioes">
      ${Object.keys(A.REGIOES).map(r => {
        const v = A.valorDe(m, agg.reg.get(r), A.MIN_UF);
        const largura = v == null ? 0 : Math.max(2, Math.min(100, 100 * (v - dom[0]) / (dom[1] - dom[0])));
        return html`<li key=${r}>
          <button aria-current=${sel.tipo === "reg" && sel.reg === r} onClick=${() => onSelect({ tipo: "reg", reg: r })}>
            <span class="nome">${A.regNome(r)}</span>
            <span class="d">${v != null && brValor != null ? A.fmtDif(m, v - brValor) : ""}</span>
            <span class="valor">${A.fmtValor(m, v)}</span>
            <span class="barra"><i style=${{ width: largura + "%", background: v == null ? "transparent" : cor(v).css }}></i></span>
          </button>
        </li>`;
      })}
    </ul>`;
  };
})(window.Atlas);
