# Diferenças de desempenho no ENADE 2023

**Pergunta de pesquisa.** Como a diferença de nota geral entre as redes pública e privada varia por área e região?

*Gerado por `gerar_analise.py` em 03/11/2026, direto do banco PostgreSQL.*

## Método

A análise usa os microdados carregados no banco, agregados por curso. Cada média divide a soma das notas gerais pelo número de notas válidas, considerando presença com resultado válido (TP_PRES = 555). As médias dão o mesmo peso a cada nota válida. A coluna Cursos conta apenas cursos com pelo menos uma nota válida no recorte. A rede pública reúne as categorias federal, estadual, municipal e especial (todas são rede pública no Censo 2023); as demais formam a rede privada.

A diferença é a média da rede pública menos a da privada. O relatório omite as médias e a diferença quando um lado tem menos de 30 notas válidas. Esse limiar é descritivo e não corresponde a um teste de significância.

## Resultado bruto

| Recorte | Pública | Notas | Cursos | Privada | Notas | Cursos | Diferença (pontos) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Brasil | 54,27 | 89.728 | 2.036 | 46,19 | 256.791 | 7.344 | 8,08 |
| Norte | 49,89 | 7.273 | 208 | 43,29 | 15.349 | 464 | 6,60 |
| Nordeste | 55,39 | 21.306 | 528 | 46,90 | 46.946 | 1.379 | 8,49 |
| Sudeste | 54,18 | 35.454 | 634 | 46,60 | 122.654 | 3.379 | 7,58 |
| Sul | 55,40 | 16.428 | 424 | 45,72 | 52.372 | 1.460 | 9,68 |
| Centro-Oeste | 53,53 | 9.267 | 242 | 45,49 | 19.470 | 662 | 8,04 |

## Comparações dentro de cada área

Os três exemplos são de áreas com grande número de inscritos na edição e abrangem saúde e engenharia.

### Medicina

| Recorte | Pública | Notas | Cursos | Privada | Notas | Cursos | Diferença (pontos) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Brasil | 68,86 | 7.871 | 116 | 63,69 | 23.182 | 189 | 5,17 |
| Norte | 63,16 | 774 | 12 | 61,49 | 1.361 | 12 | 1,67 |
| Nordeste | 69,74 | 1.921 | 38 | 62,68 | 5.432 | 37 | 7,06 |
| Sudeste | 70,71 | 2.656 | 28 | 63,52 | 11.844 | 96 | 7,19 |
| Sul | 70,30 | 1.272 | 19 | 66,37 | 3.252 | 33 | 3,93 |
| Centro-Oeste | 65,63 | 1.248 | 19 | 65,08 | 1.293 | 11 | 0,56 |

No Brasil, a diferença foi de 5,17 pontos. Entre as regiões com dados suficientes, variou de 0,56 (Centro-Oeste) a 7,19 (Sudeste).

### Enfermagem

| Recorte | Pública | Notas | Cursos | Privada | Notas | Cursos | Diferença (pontos) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Brasil | 61,26 | 5.381 | 143 | 46,70 | 41.814 | 818 | 14,55 |
| Norte | 55,47 | 445 | 13 | 44,36 | 2.978 | 66 | 11,10 |
| Nordeste | 62,00 | 1.898 | 54 | 46,41 | 8.489 | 205 | 15,59 |
| Sudeste | 62,44 | 1.479 | 31 | 47,70 | 19.978 | 338 | 14,73 |
| Sul | 61,27 | 879 | 24 | 48,92 | 5.047 | 123 | 12,34 |
| Centro-Oeste | 60,37 | 680 | 21 | 42,60 | 5.322 | 86 | 17,77 |

No Brasil, a diferença foi de 14,55 pontos. Entre as regiões com dados suficientes, variou de 11,10 (Norte) a 17,77 (Centro-Oeste).

### Engenharia Civil

| Recorte | Pública | Notas | Cursos | Privada | Notas | Cursos | Diferença (pontos) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Brasil | 52,82 | 7.648 | 173 | 36,75 | 16.875 | 703 | 16,07 |
| Norte | 46,69 | 691 | 18 | 34,97 | 973 | 45 | 11,73 |
| Nordeste | 53,31 | 2.303 | 51 | 37,05 | 2.801 | 119 | 16,26 |
| Sudeste | 54,98 | 2.440 | 48 | 36,56 | 8.231 | 336 | 18,42 |
| Sul | 53,81 | 1.470 | 31 | 37,51 | 3.731 | 138 | 16,30 |
| Centro-Oeste | 47,94 | 744 | 25 | 36,43 | 1.139 | 65 | 11,50 |

No Brasil, a diferença foi de 16,07 pontos. Entre as regiões com dados suficientes, variou de 11,50 (Centro-Oeste) a 18,42 (Sudeste).

## Todas as áreas (Brasil)

Diferença entre as redes em cada uma das 28 áreas avaliadas em 2023, da maior para a menor.

| Área | Pública | Notas | Privada | Notas | Diferença (pontos) |
|---|---:|---:|---:|---:|---:|
| Biomedicina | 58,77 | 1.108 | 38,58 | 15.074 | 20,19 |
| Engenharia Civil | 52,82 | 7.648 | 36,75 | 16.875 | 16,07 |
| Farmácia | 57,49 | 4.351 | 41,54 | 18.978 | 15,95 |
| Enfermagem | 61,26 | 5.381 | 46,70 | 41.814 | 14,55 |
| Fonoaudiologia | 55,13 | 856 | 41,24 | 1.511 | 13,89 |
| Fisioterapia | 65,02 | 2.368 | 52,37 | 20.585 | 12,65 |
| Engenharia Mecânica | 47,93 | 5.899 | 35,78 | 8.413 | 12,15 |
| Arquitetura e Urbanismo | 66,33 | 4.106 | 54,22 | 14.184 | 12,12 |
| Tecnologia em Radiologia | 54,27 | 273 | 42,48 | 2.055 | 11,79 |
| Nutrição | 58,24 | 2.870 | 47,08 | 17.076 | 11,16 |
| Engenharia Elétrica | 45,48 | 5.570 | 34,51 | 6.883 | 10,97 |
| Engenharia Ambiental | 58,11 | 2.806 | 47,26 | 1.019 | 10,85 |
| Odontologia | 58,55 | 3.135 | 47,83 | 20.143 | 10,72 |
| Medicina Veterinária | 56,67 | 4.104 | 46,41 | 13.982 | 10,26 |
| Engenharia de Controle e Automação | 46,95 | 2.283 | 38,22 | 1.297 | 8,73 |
| Engenharia de Produção | 44,72 | 6.261 | 36,23 | 9.767 | 8,49 |
| Engenharia Química | 42,69 | 3.343 | 34,52 | 1.959 | 8,16 |
| Agronomia | 53,86 | 9.017 | 45,92 | 6.670 | 7,94 |
| Tecnologia em Estética e Cosmética | 50,38 | 88 | 42,66 | 7.247 | 7,72 |
| Tecnologia em Segurança no Trabalho | 59,57 | 39 | 52,35 | 1.015 | 7,22 |
| Medicina | 68,86 | 7.871 | 63,69 | 23.182 | 5,17 |
| Engenharia de Computação I | 43,10 | 2.600 | 38,13 | 1.636 | 4,97 |
| Tecnologia em Gestão Hospitalar | 47,89 | 212 | 43,02 | 1.969 | 4,87 |
| Zootecnia | 52,09 | 2.874 | 47,81 | 238 | 4,28 |
| Tecnologia em Gestão Ambiental | 46,92 | 1.062 | 43,58 | 2.188 | 3,35 |
| Tecnologia em Agronegócios | 47,16 | 510 | 48,61 | 874 | -1,44 |
| Engenharia de Alimentos | 46,07 | 1.642 | 47,92 | 147 | -1,84 |
| Engenharia Florestal | — | 1.451 | — | 10 | — |

A rede pública tem média maior em 25 das 27 áreas com dados suficientes dos dois lados. A diferença vai de -1,84 (Engenharia de Alimentos) a 20,19 (Biomedicina).

## Como interpretar

A comparação dentro da mesma área reduz a influência da composição de cursos. Ainda podem existir diferenças de modalidade, localização, seleção e perfil dos cursos. Os resultados descrevem os participantes com nota válida na edição de 2023. Eles não estimam o efeito de estudar em determinada rede.

Os arquivos públicos do ENADE não oferecem uma chave comum de estudante. Uma análise futura de renda ou escolaridade dos pais deve usar indicadores agregados por curso e interpretar as associações nesse nível.

Fonte. Microdados ENADE 2023 e Censo da Educação Superior 2023, INEP. Agregados do Atlas ENADE 2023.
