const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ctx = vm.createContext({ window: {}, Intl });
for (const file of ['dados/dados.js', 'dados/auditoria.js', 'js/config.js', 'js/base.js', 'js/estado.js', 'js/exportacao.js', 'js/zoom.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'site', file), 'utf8'), ctx, { filename: file });
}
const A = ctx.window.Atlas, C = A.C, AU = ctx.window.AUDITORIA;
const plain = x => JSON.parse(JSON.stringify(x));

test('roda para baixo afasta, para cima aproxima e preserva a posição do cursor', () => {
  const base = { s: 10, tx: 500, ty: 200 }, vista = { s: 40, tx: 100, ty: 50 };
  const x = 350, y = 240;
  for (const delta of [120, -120]) {
    const next = A.zoomDaRoda(vista, base, delta, x, y);
    assert.equal(next.s < vista.s, delta > 0);
    assert.ok(Math.abs((x - next.tx) / next.s - (x - vista.tx) / vista.s) < 1e-9);
    assert.ok(Math.abs((y - next.ty) / next.s - (y - vista.ty) / vista.s) < 1e-9);
  }
});

test('zoom não afasta além do Brasil e limita a aproximação', () => {
  const base = { s: 10, tx: 500, ty: 200 };
  let vista = { s: 40, tx: 100, ty: 50 };
  for (let i = 0; i < 20; i++) vista = A.zoomDaRoda(vista, base, 120, 350, 240);
  assert.deepEqual(plain(vista), base);
  assert.equal(A.zoomDaRoda(vista, base, 120, 350, 240), vista);
  for (let i = 0; i < 100; i++) vista = A.zoomDaRoda(vista, base, -120, 350, 240);
  assert.equal(vista.s, base.s * 100);
  assert.equal(A.zoomDaRoda(vista, base, 0, 350, 240), vista);
});

test('dados: cursos únicos, colunas alinhadas e sem números inválidos', () => {
  assert.equal(A.NC, 9812);
  assert.equal(new Set(C.co_curso).size, A.NC);
  for (const [key, values] of Object.entries(C)) {
    assert.equal(values.length, A.NC, key);
    assert.ok(values.every(Number.isFinite), key);
  }
  assert.equal(C.qt_estudantes.reduce((s, n) => s + n, 0), AU.estudantes);
});

test('as 13 conferências do banco batem; códigos e notas foram validados', () => {
  const checks = A.conferirDados();
  assert.equal(checks.length, 13);
  assert.ok(checks.every(c => c.ok));
  for (const key of ['sem_significado']) assert.equal(AU.categorias[key], 0);
  assert.equal(AU.notas_fora, 0);
  assert.equal(AU.curso_inconsistente, 0);
  assert.ok(AU.arquivos.every(a => a.linhas_arquivo === a.linhas_banco && a.colunas_iguais));
});

test('médias são ponderadas pelas respostas, inclusive avaliação por item', () => {
  for (const m of Object.values(A.METRICAS)) {
    const agg = A.agregar(m, () => true);
    const s = C[m.s].reduce((a, b) => a + b, 0), n = C[m.n].reduce((a, b) => a + b, 0);
    assert.equal(A.valorDe(m, agg.br, 1), s / n * m.fatorEfetivo);
    for (const level of ['uf', 'mun', 'ies']) {
      assert.equal([...agg[level].values()].reduce((a, x) => a + x.n, 0), n);
    }
  }
  const m = A.METRICAS.aval;
  assert.equal(A.valorDe(m, { s: 600, n: 100, pessoas: 19 }, 20), null);
  assert.equal(A.valorDe(m, { s: 600, n: 100, pessoas: 20 }, 20), 6);
});

test('presença é distinta de nota geral preenchida', () => {
  assert.deepEqual(plain(A.resumoNotas()), { presentes: 346728, validas: 346519, semNota: 209 });
});

test('histogramas incluem os extremos em todos os indicadores e áreas', () => {
  for (const m of Object.values(A.METRICAS)) {
    for (const area of [0, ...Object.keys(A.NOME_AREA).map(Number)]) {
      const passa = A.filtroFn({ grupo: -1, area });
      const values = C.co_curso.map((_, i) => passa(i) ? A.valorCurso(m, i) : null).filter(v => v != null);
      const domain = A.dominioHistograma(m, values);
      assert.ok(domain[1] > domain[0]);
      assert.ok(values.every(v => v >= domain[0] && v <= domain[1]));
      const { bins } = A.distribuirHistograma(values, domain);
      assert.equal(bins.reduce((a, b) => a + b, 0), values.length);
    }
  }
  assert.deepEqual(plain(A.distribuirHistograma([0, 2, 4, 10], [0, 10], 5).bins), [1, 1, 1, 0, 1]);
  assert.throws(() => A.distribuirHistograma([77.7], [30, 75]), /fora da faixa/);
});

test('link conserva lugar, divisão, área, indicador, comparação e página', () => {
  const selections = [{ tipo: 'br' }, { tipo: 'reg', reg: '3' }, { tipo: 'uf', uf: '35' },
    { tipo: 'mun', uf: '35', mun: '3506003' }, { tipo: 'ies', ies: String(C.co_ies[0]) }];
  for (const sel of selections) for (const nivel of ['uf', 'mun']) for (const met of Object.keys(A.METRICAS))
    for (const view of ['mapa', 'metodo']) for (const modo of ['valor', 'dif', 'duelo']) {
      const st = { sel, nivel, met, view, modo, duelo: 'rede', filtro: { grupo: A.GRUPO_DA_AREA[12], area: 12 } };
      assert.deepEqual(plain(A.lerEstado('#' + A.montarToken(st))), st);
    }
  assert.equal(A.lerEstado('#ger-m3506003').nivel, 'mun'); // links antigos
  assert.equal(A.lerEstado('#ger-estados-m3506003').nivel, 'uf');
  assert.equal(A.lerEstado('#ger-m3506003-estados').nivel, 'uf');
  assert.equal(A.lerEstado('#ger-m9999999').sel.tipo, 'br');
  assert.equal(A.lerEstado('#metodo').view, 'metodo');
  assert.equal(A.lerEstado('#constructor-__proto__').met, 'ger');
  assert.equal(A.lerEstado('#constructor-__proto__').modo, 'valor');
});

// Leitor independente: valida aspas, separadores e quebras de linha do CSV gerado.
function readCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (!quoted && (c === ';' || c === '\r' || c === '\n')) {
      row.push(cell); cell = '';
      if (c !== ';') { rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; }
    } else cell += c;
  }
  return rows;
}

test('CSV preserva acentos, separadores e texto sem executar fórmulas no Excel', () => {
  const csv = A.serializarCSV([['São Luís; "Centro"', 'linha\nseguinte', '=1+1', '@SUM(A1)', '+1', '-1']]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.deepEqual(readCSV(csv), [['São Luís; "Centro"', 'linha\nseguinte', "'=1+1", "'@SUM(A1)", "'+1", "'-1"]]);
});

test('CSV segue os filtros e distingue zero, dado ausente e amostra pequena', () => {
  const sel = { tipo: 'uf', uf: '35' }, passa = A.filtroFn({ grupo: -1, area: 12 });
  const m = A.METRICAS.ger, csv = A.criarCSV({ m, sel, passa }), rows = readCSV(csv.texto);
  const expected = C.co_curso.map((_, i) => i).filter(i => C.co_uf_curso[i] === 35 && C.co_grupo[i] === 12);
  assert.equal(csv.quantidade, expected.length);
  assert.equal(rows.length, expected.length + 1);
  for (const [j, i] of expected.entries()) {
    const row = rows[j + 1];
    assert.equal(row[1], String(C.co_curso[i])); assert.equal(row[6], 'SP');
    assert.equal(row[2], 'Medicina'); assert.equal(row[15], String(C.n_ger[i]));
    if (C.n_ger[i] < 20) assert.equal(row[13], '');
    else assert.ok(Math.abs(Number(row[13].replace(',', '.')) - A.valorCurso(m, i)) < 1e-6);
  }
  const i = expected[0], oldN = C.n_ger[i], oldS = C.s_ger[i];
  try {
    C.n_ger[i] = 20; C.s_ger[i] = 0;
    const only = () => true;
    const extract = () => readCSV(A.criarCSV({ m, sel: { tipo: 'br' }, passa: j => j === i && only() }).texto)[1];
    assert.equal(extract()[13], '0'); assert.equal(extract()[17], 'Disponível');
    C.n_ger[i] = 19; assert.equal(extract()[13], ''); assert.match(extract()[17], /Menos de 20/);
    C.n_ger[i] = 0; assert.equal(extract()[17], 'Sem dado válido');
  } finally { C.n_ger[i] = oldN; C.s_ger[i] = oldS; }
  const empty = A.criarCSV({ m, sel, passa: () => false });
  assert.equal(empty.quantidade, 0); assert.equal(readCSV(empty.texto).length, 1);
});

test('CSV da avaliação separa pessoas de respostas aos itens', () => {
  const i = C.n_aval_pessoas.findIndex(n => n >= 20), m = A.METRICAS.aval;
  const rows = readCSV(A.criarCSV({ m, sel: { tipo: 'br' }, passa: j => i === j }).texto);
  assert.equal(rows[1][15], String(C.n_aval_pessoas[i]));
  assert.equal(rows[1][16], String(C.n_aval[i]));
});

test('scripts locais existem, têm sintaxe válida e versão de cache uniforme', () => {
  const html = fs.readFileSync(path.join(root, 'site/index.html'), 'utf8');
  const resources = [...html.matchAll(/(?:src|href)="((?:js|css|dados)\/[^"?]+)\?v=([^" ]+)"/g)];
  assert.equal(new Set(resources.map(r => r[2])).size, 1);
  for (const [, file] of resources) {
    const source = fs.readFileSync(path.join(root, 'site', file), 'utf8');
    if (file.endsWith('.js')) new vm.Script(source, { filename: file });
  }
});
