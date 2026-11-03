@echo off
rem Refaz a malha do mapa (só é preciso se quiser atualizar o mapa do IBGE).
rem 1) Baixa a malha oficial dos municípios do IBGE (GeoJSON, ~12 MB)
rem 2) Simplifica com o mapshaper e junta os municípios de cada UF para formar os estados
rem 3) Salva em site\dados\malha_br.topojson (depois rode exportar_dados.py)
rem Precisa de: curl (vem no Windows) e Node.js (para o npx)

cd /d "%~dp0"
curl -L -o municipios_br.geojson "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo%%2Bjson&qualidade=intermediaria&intrarregiao=municipio"
npx -y mapshaper@0.6.102 municipios_br.geojson -rename-layers municipios -each "uf=codarea.slice(0,2)" -simplify 8%% keep-shapes -clean -dissolve uf + name=ufs -o target=* format=topojson quantization=20000 ..\dados\malha_br.topojson
del municipios_br.geojson
echo Pronto: site\dados\malha_br.topojson
