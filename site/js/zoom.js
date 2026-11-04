// Zoom da roda do mouse: mantém o ponto sob o cursor e limita o afastamento ao Brasil.
(function (A) {
  "use strict";
  A.zoomDaRoda = (vista, base, delta, x, y) => {
    if (!delta || !Number.isFinite(delta)) return vista;
    const s = Math.max(base.s, Math.min(base.s * 100,
      vista.s * Math.exp(-Math.max(-600, Math.min(600, delta)) * 0.0015)));
    if (Math.abs(s - vista.s) < 1e-9) return vista;
    if (s === base.s) return { ...base };
    const fator = s / vista.s;
    return { s, tx: x - (x - vista.tx) * fator, ty: y - (y - vista.ty) * fator };
  };
})(window.Atlas);
