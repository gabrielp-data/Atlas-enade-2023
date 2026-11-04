// Endereços compartilháveis. Os links antigos continuam funcionando.
(function (A) {
  "use strict";
  A.lerEstado = hash => {
    const st = { view: "mapa", met: "ger", filtro: { grupo: -1, area: 0 }, nivel: "uf", modo: "valor", duelo: "rede", sel: { tipo: "br" } };
    let nivelExplicito = false;
    for (const t of hash.replace(/^#/, "").split("-").filter(Boolean)) {
      if (t === "metodo") st.view = "metodo";
      else if (Object.hasOwn(A.METRICAS, t)) st.met = t;
      else if (t === "municipios" || t === "estados") { st.nivel = t === "municipios" ? "mun" : "uf"; nivelExplicito = true; }
      else if (t === "comparado") st.modo = "dif";
      else if (Object.hasOwn(A.DUELOS, t)) { st.modo = "duelo"; st.duelo = t; }
      else if (/^a\d+$/.test(t) && A.NOME_AREA[+t.slice(1)]) { const c = +t.slice(1); st.filtro = { grupo: A.GRUPO_DA_AREA[c], area: c }; }
      else if (/^g\d$/.test(t) && A.D.grupos[+t.slice(1)]) st.filtro = { grupo: +t.slice(1), area: 0 };
      else if (/^r[1-5]$/.test(t)) st.sel = { tipo: "reg", reg: t.slice(1) };
      else if (/^m\d{7}$/.test(t) && A.D.municipios[t.slice(1)]) st.sel = { tipo: "mun", uf: t.slice(1, 3), mun: t.slice(1) };
      else if (/^i\d+$/.test(t) && A.D.ies[t.slice(1)]) st.sel = { tipo: "ies", ies: t.slice(1) };
      else if (/^uf[a-z]{2}$/.test(t) && A.ufDaSigla[t.slice(2)]) st.sel = { tipo: "uf", uf: A.ufDaSigla[t.slice(2)] };
    }
    if (st.sel.tipo === "mun" && !nivelExplicito) st.nivel = "mun";
    return st;
  };

  A.montarToken = st => {
    const t = [st.met];
    if (st.view === "metodo") t.push("metodo");
    if (st.filtro.area) t.push("a" + st.filtro.area); else if (st.filtro.grupo >= 0) t.push("g" + st.filtro.grupo);
    if (st.nivel === "mun") t.push("municipios");
    else if (st.sel.tipo === "mun") t.push("estados");
    if (st.modo === "dif") t.push("comparado");
    if (st.modo === "duelo") t.push(st.duelo);
    const s = st.sel;
    if (s.tipo === "reg") t.push("r" + s.reg);
    if (s.tipo === "uf") t.push("uf" + A.ufSigla(s.uf).toLowerCase());
    if (s.tipo === "mun") t.push("m" + s.mun);
    if (s.tipo === "ies") t.push("i" + s.ies);
    return t.join("-");
  };
})(window.Atlas);
