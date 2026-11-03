// Atlas ENADE 2023 — configuração: indicadores, abas, comparações e limites.
// Para mudar um texto ou um mínimo de respostas, é aqui.
(function (A) {
  "use strict";

  // Endereço público do site (GitHub Pages). O botão "Copiar link" sempre gera um link para cá,
  // mesmo quando o site é aberto de outro lugar; no computador (arquivo local) usa o próprio endereço.
  A.URL_PUBLICA = "https://gabrielp-data.github.io/Atlas-enade-2023/site/";

  // Mínimo de respostas para mostrar um número (abaixo disso o lugar fica hachurado).
  A.MIN_UF = 30;
  A.MIN_LOCAL = 30;   // municípios, instituições e regiões pequenas
  A.MIN_CURSO = 20;   // um curso entra no ranking e no gráfico

  // s = soma, n = quantidade (vêm de dados/dados.js). valor = s / n * fator.
  // As somas de notas chegam multiplicadas por uma escala que o próprio dados.js informa ("divisores");
  // base.js divide por ela, então aqui o fator das notas é 1.
  A.METRICAS = {
    ger:   { rotulo: "Nota geral", curto: "Geral", s: "s_ger", n: "n_ger", fator: 1, tipo: "nota",
             maior: "a maior nota geral",
             explica: "Média da nota geral da prova (de 0 a 100) dos estudantes presentes com resultado válido." },
    fg:    { rotulo: "Nota em formação geral", curto: "Formação geral", s: "s_fg", n: "n_fg", fator: 1, tipo: "nota",
             maior: "a maior nota em formação geral",
             explica: "Parte da prova comum a todos os cursos: leitura, escrita e temas gerais. De 0 a 100." },
    ce:    { rotulo: "Nota no componente específico", curto: "Componente específico", s: "s_ce", n: "n_ce", fator: 1, tipo: "nota",
             maior: "a maior nota no componente específico",
             explica: "Parte da prova com o conteúdo de cada área. De 0 a 100." },
    renda: { rotulo: "Renda familiar de até 3 salários mínimos", curto: "Até 3 salários", s: "n_renda3", n: "n_renda", fator: 100, tipo: "pct",
             maior: "a maior proporção de estudantes de baixa renda",
             explica: "Estudantes com renda familiar de até 3 salários mínimos (R$ 3.960 em 2023), entre os que responderam." },
    mae:   { rotulo: "Mãe com ensino superior", curto: "Mãe", s: "n_mae_sup", n: "n_mae", fator: 100, tipo: "pct",
             maior: "a maior proporção de mães com ensino superior",
             explica: "Estudantes cuja mãe concluiu graduação ou pós-graduação, entre os que responderam." },
    pai:   { rotulo: "Pai com ensino superior", curto: "Pai", s: "n_pai_sup", n: "n_pai", fator: 100, tipo: "pct",
             maior: "a maior proporção de pais com ensino superior",
             explica: "Estudantes cujo pai concluiu graduação ou pós-graduação, entre os que responderam." },
    fem:   { rotulo: "Mulheres", curto: "Mulheres", s: "n_fem", n: "n_sexo", fator: 100, tipo: "pct",
             maior: "a maior proporção de mulheres",
             explica: "Estudantes do sexo feminino." },
    ppi:   { rotulo: "Pretos, pardos e indígenas", curto: "Pretos, pardos e indígenas", s: "n_ppi", n: "n_cor", fator: 100, tipo: "pct",
             maior: "a maior proporção de pretos, pardos e indígenas",
             explica: "Estudantes que se declararam pretos, pardos ou indígenas, entre os que responderam." },
    idade: { rotulo: "Idade média", curto: "Idade", s: "s_idade", n: "n_idade", fator: 1, tipo: "anos",
             maior: "os estudantes mais velhos",
             explica: "Idade média dos estudantes no dia da prova." },
    aval:  { rotulo: "Avaliação do curso pelos estudantes", curto: "Avaliação", s: "s_aval", n: "n_aval", fator: 1, tipo: "escala", respondentes: "n_aval_pessoas",
             maior: "a melhor avaliação dos cursos pelos alunos",
             explica: "Média das 42 questões em que o estudante avalia o curso, de 1 (discordo totalmente) a 6 (concordo totalmente)." },
  };

  A.ABAS = [
    { id: "nota", rotulo: "Nota", metricas: ["ger", "fg", "ce"] },
    { id: "renda", rotulo: "Renda", metricas: ["renda"] },
    { id: "pais", rotulo: "Escolaridade dos pais", metricas: ["mae", "pai"] },
    { id: "perfil", rotulo: "Perfil", metricas: ["fem", "ppi", "idade"] },
    { id: "aval", rotulo: "Avaliação do curso", metricas: ["aval"] },
  ];

  // Duelos: dois grupos de cursos lado a lado, como os dois candidatos de uma eleição.
  A.DUELOS = {
    rede: { id: "rede", rotulo: "Pública × Privada", campo: "rede", verbo: "tem",
            a: { valor: 1, nome: "Pública", curto: "Púb", frase: "a rede pública", cursos: "públicos" },
            b: { valor: 2, nome: "Privada", curto: "Priv", frase: "a rede privada", cursos: "privados" } },
    ead:  { id: "ead", rotulo: "Presencial × EaD", campo: "co_modalidade", verbo: "têm",
            a: { valor: 1, nome: "Presencial", curto: "Pres", frase: "os cursos presenciais", cursos: "presenciais" },
            b: { valor: 0, nome: "EaD", curto: "EaD", frase: "os cursos EaD", cursos: "a distância" } },
  };
  // Faixas de diferença do mapa de duelo (como "até 10 · 25 · 45 pontos" da referência)
  A.FAIXAS_DUELO = { nota: [2, 5, 10], pct: [5, 10, 20], anos: [1, 2, 4], escala: [0.1, 0.2, 0.4] };
  A.CORES_DUELO = { a: "#3987e5", b: "#d95926" };

  // Regiões do IBGE (1º dígito do código da UF)
  A.REGIOES = { "1": "Norte", "2": "Nordeste", "3": "Sudeste", "4": "Sul", "5": "Centro-Oeste" };
})(window.Atlas = window.Atlas || {});
