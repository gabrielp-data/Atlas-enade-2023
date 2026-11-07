# Imagem do site: prepara a publicação (com os testes) e serve com nginx.
FROM node:22-alpine AS preparar
WORKDIR /app
COPY package.json index.html ./
COPY scripts ./scripts
COPY tests/site.test.cjs ./tests/
COPY site ./site
RUN node scripts/preparar_site.cjs

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=preparar /app/_site /usr/share/nginx/html
