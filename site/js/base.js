// Atlas ENADE 2023 — base: nomes, formatação, cores e contas.
(function (A) {
  "use strict";
  const D = window.ENADE, C = D.cursos, NC = C.co_curso.length;
  A.D = D; A.C = C; A.NC = NC;

  // ───────── Nomes ─────────
  A.NOME_AREA = {}; A.GRUPO_DA_AREA = {};
  D.grupos.forEach((g, gi) => g.areas.forEach(([c, n]) => { A.NOME_AREA[c] = n; A.GRUPO_DA_AREA[c] = gi; }));
  A.ufSigla = k => (D.estados[k] || {}).sigla || k;
  A.ufNome = k => (D.estados[k] || {}).nome || k;
  A.munNome = k => D.municipios[k] || "Município";
  A.iesSigla = k => (D.ies[k] || [""])[0];
  A.iesNome = k => (D.ies[k] || ["", "IES " + k])[1];
  A.regNome = r => A.REGIOES[r] || r;
  A.ufDaSigla = {};
  for (const [k, e] of Object.entries(D.estados)) A.ufDaSigla[e.sigla.toLowerCase()] = k;
  const ACENTOS = new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]", "g");
  A.normal = s => s.normalize("NFD").replace(ACENTOS, "").toLowerCase();

  // ───────── Formatação (padrão brasileiro) ─────────
  A.nf0 = new Intl.NumberFormat("pt-BR");
  const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  A.nf1 = nf1; A.nf2 = nf2;
  A.fmtValor = (m, v) => v == null ? "—" : m.tipo === "pct" ? nf1.format(v) + "%" : m.tipo === "escala" ? nf2.format(v) : nf1.format(v);
  A.UNIDADE = { nota: "de 100", pct: "", anos: "anos", escala: "de 6" };
  const unidadeDif = (m, a) => m.tipo === "pct" ? " p.p." : m.tipo === "anos" ? (a === 1 ? " ano" : " anos") : m.tipo === "nota" ? " pts" : "";
  const numDif = (m, a) => m.tipo === "escala" ? nf2.format(a) : nf1.format(a);
  A.fmtDif = (m, d) => {
    const s = d > 0.0001 ? "+" : d < -0.0001 ? "−" : "";
    const a = Math.abs(d);
    return s + numDif(m, a) + unidadeDif(m, a);
  };
  // "3,3 pts acima" / "1,2 p.p. abaixo"
  A.fmtDifTexto = (m, d) => {
    const a = Math.abs(d);
    if (a < (m.tipo === "escala" ? 0.005 : 0.05)) return "na média";
    return numDif(m, a) + unidadeDif(m, a) + (d > 0 ? " acima" : " abaixo");
  };
  A.fmtGap = (m, g) => numDif(m, Math.abs(g));
  A.fmtGapUnidade = (m, g) => numDif(m, Math.abs(g)) + unidadeDif(m, Math.abs(g));
  A.maiuscula = s => s ? s[0].toUpperCase() + s.slice(1) : s;

  // ───────── Cores (OKLab) ─────────
  const hexRgb = x => { const n = parseInt(x.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const gam = c => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return Math.round(Math.min(1, Math.max(0, v)) * 255); };
  function paraLab(x) {
    const [r, g, b] = hexRgb(x).map(lin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  }
  function deLab([L, a, b]) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    return `rgb(${gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)},${gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)},${gam(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)})`;
  }
  const mix = (P, Q, t) => P.map((v, i) => v + (Q[i] - v) * t);
  const RAMPA = ["#0d366b", "#184f95", "#256abf", "#3987e5", "#6da7ec", "#9ec5f4", "#cde2fb"].map(paraLab);
  // laranja (abaixo) e azul (acima): opostos que não sugerem "ruim" ou "bom"
  const NEG = paraLab("#d95926"), MEIO = paraLab("#3a3a37"), POS = paraLab("#6da7ec");
  const LADO = { a: paraLab(A.CORES_DUELO.a), b: paraLab(A.CORES_DUELO.b) };
  const PESO_FAIXA = [0.32, 0.55, 0.78, 1];
  A.corSeq = t => {
    t = Math.min(1, Math.max(0, t));
    const p = t * (RAMPA.length - 1), i = Math.min(RAMPA.length - 2, Math.floor(p));
    const lab = mix(RAMPA[i], RAMPA[i + 1], p - i);
    return { css: deLab(lab), L: lab[0] };
  };
  A.corDiv = t => {
    t = Math.min(1, Math.max(-1, t));
    const lab = t < 0 ? mix(MEIO, NEG, -t) : mix(MEIO, POS, t);
    return { css: deLab(lab), L: lab[0] };
  };
  A.corDuelo = (lado, faixa) => {
    const lab = mix(MEIO, LADO[lado], PESO_FAIXA[faixa]);
    return { css: deLab(lab), L: lab[0] };
  };
  A.gradiente = (fn, a, b) => "linear-gradient(90deg," + Array.from({ length: 11 }, (_, k) => fn(a + (b - a) * k / 10).css).join(",") + ")";

  // ───────── Contas ─────────
  A.filtroFn = f => {
    if (f.area) return i => C.co_grupo[i] === f.area;
    if (f.grupo >= 0) return i => A.GRUPO_DA_AREA[C.co_grupo[i]] === f.grupo;
    return () => true;
  };
  A.passaLado = (passa, duelo, lado) => {
    const campo = C[duelo.campo], alvo = duelo[lado].valor;
    return i => campo[i] === alvo && passa(i);
  };
  // Soma por Brasil, região, estado, município e instituição. Média = soma ÷ quantidade (nunca média de médias).
  A.agregar = (m, passa) => {
    const S = C[m.s], N = C[m.n], Q = C.qt_estudantes;
    const novo = () => ({ s: 0, n: 0, cursos: 0, est: 0 });
    const br = novo(), reg = new Map(), uf = new Map(), mun = new Map(), ies = new Map();
    const soma = (x, i) => { x.s += S[i]; x.n += N[i]; x.cursos++; x.est += Q[i]; };
    const add = (mapa, k, i) => { let x = mapa.get(k); if (!x) mapa.set(k, x = novo()); soma(x, i); };
    for (let i = 0; i < NC; i++) {
      if (!passa(i)) continue;
      const u = String(C.co_uf_curso[i]);
      soma(br, i);
      add(reg, u[0], i);
      add(uf, u, i);
      add(mun, String(C.co_munic_curso[i]), i);
      add(ies, String(C.co_ies[i]), i);
    }
    return { br, reg, uf, mun, ies };
  };
  A.pessoas = (m, x) => x ? x.n / (m.porPessoa || 1) : 0;
  A.valorDe = (m, x, min) => x && x.n > 0 && A.pessoas(m, x) >= min ? x.s / x.n * m.fator : null;
  A.valorCurso = (m, i) => {
    const n = C[m.n][i];
    return n / (m.porPessoa || 1) >= A.MIN_CURSO ? C[m.s][i] / n * m.fator : null;
  };
  A.minDaSelecao = sel => sel.tipo === "br" ? 1 : sel.tipo === "uf" || sel.tipo === "reg" ? A.MIN_UF : A.MIN_LOCAL;
  A.aggDaSelecao = (agg, sel) =>
    sel.tipo === "reg" ? agg.reg.get(sel.reg) :
    sel.tipo === "uf" ? agg.uf.get(sel.uf) :
    sel.tipo === "mun" ? agg.mun.get(sel.mun) :
    sel.tipo === "ies" ? agg.ies.get(sel.ies) : agg.br;
  A.cursosDa = (sel, passa) => {
    const out = [];
    for (let i = 0; i < NC; i++) {
      if (!passa(i)) continue;
      const u = String(C.co_uf_curso[i]);
      if (sel.tipo === "reg" && u[0] !== sel.reg) continue;
      if (sel.tipo === "uf" && u !== sel.uf) continue;
      if (sel.tipo === "mun" && String(C.co_munic_curso[i]) !== sel.mun) continue;
      if (sel.tipo === "ies" && String(C.co_ies[i]) !== sel.ies) continue;
      out.push(i);
    }
    return out;
  };
  // Estados em ordem do maior para o menor valor
  A.rankingUf = (m, agg, filtroUf) =>
    [...agg.uf].filter(([k]) => !filtroUf || filtroUf(k))
      .map(([k, x]) => [k, A.valorDe(m, x, A.MIN_UF)]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1]);

  // Cores do mapa. modo: "valor" (escala azul), "dif" (comparado ao Brasil) ou "duelo"
  A.montarEscala = ({ m, agg, nivel, modo, br, aggA, aggB, duelo }) => {
    const chave = nivel === "uf" ? "uf" : "mun";
    const min = nivel === "uf" ? A.MIN_UF : A.MIN_LOCAL;
    const cores = new Map();
    if (modo === "duelo") {
      const faixas = A.FAIXAS_DUELO[m.tipo], vals = new Map();
      for (const [k, xa] of aggA[chave]) {
        const va = A.valorDe(m, xa, min), vb = A.valorDe(m, aggB[chave].get(k), min);
        if (va == null || vb == null) continue;
        const gap = va - vb, faixa = faixas.filter(f => Math.abs(gap) >= f).length;
        vals.set(k, { a: va, b: vb, gap });
        cores.set(k, A.corDuelo(gap >= 0 ? "a" : "b", faixa));
      }
      return { tipo: "duelo", vals, cores, faixas, duelo };
    }
    const vals = new Map();
    for (const [k, x] of agg[chave]) { const v = A.valorDe(m, x, min); if (v != null) vals.set(k, v); }
    const arr = [...vals.values()].sort((a, b) => a - b);
    const q = p => arr[Math.min(arr.length - 1, Math.max(0, Math.round(p * (arr.length - 1))))];
    if (modo === "valor" || br == null) {
      let lo = arr.length > 40 ? q(0.03) : arr[0], hi = arr.length > 40 ? q(0.97) : arr[arr.length - 1];
      if (!(hi > lo)) { lo = (lo || 0) - 1; hi = lo + 2; }
      const cor = v => A.corSeq((v - lo) / (hi - lo));
      for (const [k, v] of vals) cores.set(k, cor(v));
      return { tipo: "valor", lo, hi, cor, vals, cores };
    }
    const difs = arr.map(v => Math.abs(v - br)).sort((a, b) => a - b);
    let Dm = difs.length > 40 ? difs[Math.round(0.95 * (difs.length - 1))] : difs[difs.length - 1];
    if (!(Dm > 0)) Dm = 1;
    const cor = v => A.corDiv((v - br) / Dm);
    for (const [k, v] of vals) cores.set(k, cor(v));
    return { tipo: "dif", D: Dm, br, cor, vals, cores };
  };

  // Valores dos dois lados de um duelo para uma seleção
  A.valoresDuelo = (m, sel, passa, duelo) => {
    const lado = l => {
      const x = { s: 0, n: 0, cursos: 0, est: 0 };
      for (const i of A.cursosDa(sel, A.passaLado(passa, duelo, l))) { x.s += C[m.s][i]; x.n += C[m.n][i]; x.cursos++; x.est += C.qt_estudantes[i]; }
      return { ...x, v: A.valorDe(m, x, A.minDaSelecao(sel)) };
    };
    return { a: lado("a"), b: lado("b") };
  };

  // ───────── Manchete: uma frase que resume a seleção ─────────
  // Devolve pedaços: texto comum (string) ou destacado ({ f: "texto" })
  A.manchete = ({ m, agg, sel, filtro, modo, duelo, aggA, aggB, brValor }) => {
    const prefixo = filtro.area ? `Em ${A.NOME_AREA[filtro.area]}, ` :
      filtro.grupo >= 0 ? `Nos cursos de ${D.grupos[filtro.grupo].nome.toLowerCase()}, ` : "";
    const artigoReg = prefixo ? "o " : "O ";
    const daRegiao = sel.tipo === "reg" ? k => k[0] === sel.reg : null;

    if (modo === "duelo") {
      const d = duelo;
      if (sel.tipo === "br" || sel.tipo === "reg") {
        const lista = [...aggA.uf.keys()].filter(k => !daRegiao || daRegiao(k));
        let total = 0, ganhaA = 0;
        for (const k of lista) {
          const va = A.valorDe(m, aggA.uf.get(k), A.MIN_UF), vb = A.valorDe(m, aggB.uf.get(k), A.MIN_UF);
          if (va == null || vb == null) continue;
          total++; if (va > vb) ganhaA++;
        }
        if (!total) return [A.maiuscula(prefixo + "não há estados com respostas suficientes dos dois lados para comparar.")];
        const onde = sel.tipo === "reg" ? ` estados do ${A.regNome(sel.reg)}` : " estados";
        const brA = A.valorDe(m, sel.tipo === "reg" ? aggA.reg.get(sel.reg) : aggA.br, 1);
        const brB = A.valorDe(m, sel.tipo === "reg" ? aggB.reg.get(sel.reg) : aggB.br, 1);
        const sujeito = prefixo ? d.a.frase : A.maiuscula(d.a.frase);
        return [prefixo, { f: sujeito }, ` ${d.verbo} ${m.rotulo.toLowerCase()} maior que ${d.b.frase} em `, { f: `${ganhaA} de ${total}` }, onde,
          brA != null && brB != null ? `. No total: ${d.a.nome} ${A.fmtValor(m, brA)} × ${d.b.nome} ${A.fmtValor(m, brB)}.` : "."];
      }
      const xa = A.valorDe(m, A.aggDaSelecao(aggA, sel), A.minDaSelecao(sel));
      const xb = A.valorDe(m, A.aggDaSelecao(aggB, sel), A.minDaSelecao(sel));
      if (xa == null || xb == null) return [A.maiuscula(prefixo + "aqui não há respostas suficientes dos dois lados para comparar.")];
      return [prefixo, { f: `${d.a.nome} ${A.fmtValor(m, xa)}` }, " × ", { f: `${d.b.nome} ${A.fmtValor(m, xb)}` }, `: diferença de ${A.fmtGapUnidade(m, xa - xb)}.`];
    }

    if (sel.tipo === "br") {
      const r = A.rankingUf(m, agg);
      if (!r.length) return [A.maiuscula(prefixo + "não há estados com respostas suficientes.")];
      return [prefixo, { f: A.ufNome(r[0][0]) }, ` tem ${m.maior} do país: `, { f: A.fmtValor(m, r[0][1]) },
        r[1] ? `. Em seguida vem ${A.ufNome(r[1][0])} (${A.fmtValor(m, r[1][1])}).` : "."];
    }
    const v = A.valorDe(m, A.aggDaSelecao(agg, sel), A.minDaSelecao(sel));
    if (v == null) return [A.maiuscula(prefixo + "aqui há poucas respostas para um número confiável.")];
    const dif = brValor != null ? A.fmtDifTexto(m, v - brValor) : null;
    const difTxt = dif === "na média" ? " fica na média do Brasil" : ` fica ${dif} do Brasil`;
    if (sel.tipo === "reg") {
      const r = A.rankingUf(m, agg, daRegiao);
      return [prefixo, { f: artigoReg + A.regNome(sel.reg) }, difTxt, r[0] ? `. Destaque: ${A.ufNome(r[0][0])} (${A.fmtValor(m, r[0][1])}).` : "."];
    }
    if (sel.tipo === "uf") {
      const r = A.rankingUf(m, agg), pos = r.findIndex(x => x[0] === sel.uf) + 1;
      return [prefixo, { f: A.ufNome(sel.uf) }, " é o ", { f: `${pos}º de ${r.length} estados` }, ` em ${m.rotulo.toLowerCase()}`, dif ? ` e${difTxt}.` : "."];
    }
    if (sel.tipo === "mun") {
      const r = [...agg.mun].filter(([k]) => k.startsWith(sel.uf)).map(([k, x]) => [k, A.valorDe(m, x, A.MIN_LOCAL)])
        .filter(x => x[1] != null).sort((a, b) => b[1] - a[1]);
      const pos = r.findIndex(x => x[0] === sel.mun) + 1;
      return [prefixo, { f: A.munNome(sel.mun) }, difTxt, pos ? ` e é o ${pos}º de ${r.length} municípios de ${A.ufSigla(sel.uf)} com dados.` : "."];
    }
    return [prefixo, { f: A.iesSigla(sel.ies) || A.iesNome(sel.ies) }, difTxt, ` em ${m.rotulo.toLowerCase()}.`];
  };
})(window.Atlas);
