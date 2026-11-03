// Atlas ENADE 2023 — malha do IBGE: TopoJSON -> caminhos do Canvas, projeção e enquadramento.
(function (A) {
  "use strict";
  const C = A.C, NC = A.NC;

  // Projeção equirretangular com correção na latitude média do Brasil
  const KX = Math.cos(-14.5 * Math.PI / 180);
  const proj = (lon, lat) => [lon * KX, -lat];

  function construir(geom) {
    const path = new Path2D();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, melhor = 0, c = [0, 0];
    const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
    for (const poly of polys) {
      poly.forEach((anel, r) => {
        let area = 0, cx = 0, cy = 0, px, py;
        anel.forEach(([lon, lat], i) => {
          const [x, y] = proj(lon, lat);
          if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          if (i > 0) { const cr = px * y - x * py; area += cr; cx += (px + x) * cr; cy += (py + y) * cr; }
          px = x; py = y;
        });
        path.closePath();
        // o rótulo vai no centro do maior anel externo
        if (r === 0 && Math.abs(area) > melhor) { melhor = Math.abs(area); c = [cx / (3 * area), cy / (3 * area)]; }
      });
    }
    return { path, bb: [x0, y0, x1, y1], c };
  }

  const T = window.MALHA;
  const ufs = topojson.feature(T, T.objects.ufs).features.map(f => ({ id: f.properties.uf, ...construir(f.geometry) }));
  const muns = topojson.feature(T, T.objects.municipios).features.map(f => ({ id: f.properties.codarea, uf: f.properties.uf, ...construir(f.geometry) }));
  const uniao = lista => lista.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])], [Infinity, Infinity, -Infinity, -Infinity]);
  const munsDaUf = new Map();
  for (const m of muns) { if (!munsDaUf.has(m.uf)) munsDaUf.set(m.uf, []); munsDaUf.get(m.uf).push(m); }

  A.GEO = {
    ufs, muns, munsDaUf,
    ufPorId: new Map(ufs.map(u => [u.id, u])),
    munPorId: new Map(muns.map(m => [m.id, m])),
    bb: uniao(ufs.map(u => u.bb)),
  };
  // RN, PB, PE, AL, SE, ES e RJ ficam em caixas ao lado, como na referência
  A.CAIXAS = new Set(["24", "25", "26", "27", "28", "32", "33"]);
  A.DESLOCA = { "52": [-0.75, 0.45] }; // GO: abre espaço para o rótulo do DF

  A.dentro = (bb, x, y) => x >= bb[0] && x <= bb[2] && y >= bb[1] && y <= bb[3];

  A.bbDaSelecao = sel => {
    const G = A.GEO;
    if (sel.tipo === "uf" || sel.tipo === "mun") return G.ufPorId.get(sel.uf)?.bb || G.bb;
    if (sel.tipo === "reg") return uniao(G.ufs.filter(u => u.id[0] === sel.reg).map(u => u.bb));
    if (sel.tipo === "ies") {
      const caixas = [];
      for (let i = 0; i < NC; i++) {
        if (String(C.co_ies[i]) !== sel.ies) continue;
        const m = G.munPorId.get(String(C.co_munic_curso[i]));
        if (m) caixas.push(m.bb);
      }
      if (caixas.length) { const b = uniao(caixas), p = 1.2; return [b[0] - p, b[1] - p, b[2] + p, b[3] + p]; }
    }
    return G.bb;
  };

  // m = margens em px {t, r, b, l}: espaço para os controles, a legenda e as caixas laterais
  A.enquadrar = (bb, W, H, m) => {
    const w = W - m.l - m.r, h = H - m.t - m.b;
    const s = Math.min(w / (bb[2] - bb[0]), h / (bb[3] - bb[1]));
    return { s, tx: m.l + w / 2 - s * (bb[0] + bb[2]) / 2, ty: m.t + h / 2 - s * (bb[1] + bb[3]) / 2 };
  };
  // à direita fica o espaço das caixas de RN, PB, PE, AL, SE, ES e RJ (no duelo elas têm texto maior)
  A.margemBrasil = W => W > 560 ? { t: 64, r: 124, b: 24, l: 24 } : { t: 100, r: 84, b: 96, l: 8 };
  A.margemZoom = W => W > 560 ? { t: 64, r: 36, b: 40, l: 36 } : { t: 100, r: 16, b: 96, l: 16 };

  A.criarHachura = () => {
    const c = document.createElement("canvas");
    c.width = c.height = 6;
    const x = c.getContext("2d");
    x.fillStyle = "#111316"; x.fillRect(0, 0, 6, 6);
    x.strokeStyle = "#2b2f35"; x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(-1, 7); x.lineTo(7, -1); x.stroke();
    return c;
  };
})(window.Atlas);
