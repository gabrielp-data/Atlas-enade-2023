#!/bin/sh
# Roda só na primeira vez que o container do banco sobe (volume vazio):
# restaura o schema gabriel já carregado, com tabelas, chaves, views e descrições.
set -e
if [ -f /backup/enade2023.dump ]; then
  echo "Restaurando o banco do ENADE 2023..."
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --exit-on-error /backup/enade2023.dump
  echo "Banco restaurado."
fi
