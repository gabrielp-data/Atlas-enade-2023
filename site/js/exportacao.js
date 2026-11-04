// CSV por curso, respeitando a área e o lugar escolhidos no painel.
(function (A) {
  "use strict";
  const C = A.C;
  const decimal = v => v == null ? "" : String(Math.round(v * 1000000) / 1000000).replace(".", ",");
  // Textos que começam como fórmulas devem continuar sendo textos no Excel.
  const celula = v => {
    let texto = String(v ?? "");
    if (typeof v === "string" && /^[\s]*[=+\-@]/.test(texto)) texto = "'" + texto;
    return '"' + texto.replace(/"/g, '""') + '"';
  };
  A.serializarCSV = linhas => "\uFEFF" + linhas.map(l => l.map(celula).join(";")).join("\r\n") + "\r\n";

  A.criarCSV = ({ m, sel, passa }) => {
    const indices = A.cursosDa(sel, passa);
    const linhas = [["Ano", "Código do curso", "Área do curso", "Código da IES", "Instituição", "Sigla da IES",
      "UF", "Código do município", "Município", "Rede", "Modalidade", "Indicador", "Unidade", "Valor",
      "Estudantes no curso", "Pessoas com dado válido no indicador", "Respostas válidas aos itens de avaliação",
      "Situação do valor", "Fonte"]];
    for (const i of indices) {
      const v = A.valorCurso(m, i), pessoas = m.respondentes ? C[m.respondentes][i] : C[m.n][i];
      linhas.push([2023, C.co_curso[i], A.NOME_AREA[C.co_grupo[i]], C.co_ies[i], A.iesNome(C.co_ies[i]), A.iesSigla(C.co_ies[i]),
        A.ufSigla(C.co_uf_curso[i]), C.co_munic_curso[i], A.munNome(C.co_munic_curso[i]), C.rede[i] === 1 ? "Pública" : "Privada",
        C.co_modalidade[i] === 0 ? "EaD" : "Presencial", m.rotulo, { nota: "Pontos (0 a 100)", pct: "%", anos: "Anos", escala: "Escala (1 a 6)" }[m.tipo],
        decimal(v), C.qt_estudantes[i], pessoas, m.respondentes ? C[m.n][i] : "",
        v != null ? "Disponível" : pessoas ? `Menos de ${A.MIN_CURSO} pessoas com dado válido` : "Sem dado válido",
        A.D.fonte]);
    }
    const metrica = Object.keys(A.METRICAS).find(k => A.METRICAS[k] === m);
    const lugar = sel.mun || sel.uf || sel.ies || sel.reg || "brasil";
    return { texto: A.serializarCSV(linhas), arquivo: `atlas-enade-2023-${metrica}-${sel.tipo}-${lugar}.csv`, quantidade: indices.length };
  };

  A.baixarCSV = opcoes => {
    const csv = A.criarCSV(opcoes);
    const url = URL.createObjectURL(new Blob([csv.texto], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = csv.arquivo;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return csv.quantidade;
  };
})(window.Atlas);
