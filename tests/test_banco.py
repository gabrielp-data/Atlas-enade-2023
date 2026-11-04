"""Regressões da montagem; integração usa somente schema temporário e ROLLBACK."""
import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import Mock, patch
import uuid

import psycopg2

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("montar_banco", ROOT / "montar_banco.py")
banco = importlib.util.module_from_spec(spec)
spec.loader.exec_module(banco)


class ProtecaoMontagem(unittest.TestCase):
    def test_base_existente_nao_executa_ddl(self):
        cur = Mock()
        cur.fetchall.return_value = [("inep_enade_2023_curso",)]
        with patch.object(banco, "executar_arquivo_sql") as executar:
            with self.assertRaisesRegex(SystemExit, "preservada"):
                banco.preparar_montagem(cur)
            executar.assert_not_called()
        self.assertEqual(cur.execute.call_count, 1)
        self.assertTrue(cur.execute.call_args.args[0].lstrip().startswith("SELECT"))

    def test_base_vazia_nao_faz_limpeza(self):
        cur = Mock()
        cur.fetchall.return_value = []
        with patch.object(banco, "executar_arquivo_sql") as executar:
            banco.preparar_montagem(cur)
            executar.assert_not_called()

    def test_recriacao_exige_opcao_explicita(self):
        cur = Mock()
        cur.fetchall.return_value = [("inep_enade_2023_curso",)]
        with patch.object(banco, "executar_arquivo_sql") as executar:
            banco.preparar_montagem(cur, recriar=True)
            executar.assert_called_once_with(cur, "00_recriar_tabelas.sql")


@unittest.skipUnless(os.getenv("TEST_DATABASE_URL"), "Defina TEST_DATABASE_URL para testar o SQL real")
class IntegracaoSQL(unittest.TestCase):
    def setUp(self):
        self.conn = psycopg2.connect(os.environ["TEST_DATABASE_URL"])
        self.addCleanup(self.conn.close)
        self.addCleanup(self.conn.rollback)
        self.cur = self.conn.cursor()
        self.schema = "atlas_test_" + uuid.uuid4().hex
        self.ddl = (ROOT / "sql/01_criar_tabelas.sql").read_text(encoding="utf-8").replace("gabriel", self.schema)
        self.limpeza = (ROOT / "sql/00_recriar_tabelas.sql").read_text(encoding="utf-8").replace("gabriel", self.schema)
        self.cur.execute(self.ddl)
        self.cur.execute("INSERT INTO inep_2023_categorias VALUES ('TESTE', '1', 'Preservar')")

    def test_repetir_ddl_preserva_registros(self):
        self.cur.execute("SAVEPOINT tentativa")
        with self.assertRaises(psycopg2.errors.DuplicateTable):
            self.cur.execute(self.ddl)
        self.cur.execute("ROLLBACK TO SAVEPOINT tentativa")
        self.cur.execute("SELECT descricao FROM inep_2023_categorias")
        self.assertEqual(self.cur.fetchone()[0], "Preservar")

    def test_limpeza_sem_autorizacao_falha(self):
        self.cur.execute("SAVEPOINT tentativa")
        with self.assertRaisesRegex(psycopg2.Error, "não autorizada"):
            self.cur.execute(self.limpeza)
        self.cur.execute("ROLLBACK TO SAVEPOINT tentativa")
        self.cur.execute("SELECT COUNT(*) FROM inep_2023_categorias")
        self.assertEqual(self.cur.fetchone()[0], 1)

    def test_limpeza_preserva_outra_tabela_inep(self):
        self.cur.execute("CREATE TABLE inep_outro_projeto (valor int); INSERT INTO inep_outro_projeto VALUES (42)")
        self.cur.execute("SELECT set_config('atlas.recriar', 'sim', true)")
        self.cur.execute(self.limpeza)
        self.cur.execute("SELECT valor FROM inep_outro_projeto")
        self.assertEqual(self.cur.fetchone()[0], 42)
        self.cur.execute(self.ddl)
        self.cur.execute("SELECT COUNT(*) FROM inep_2023_categorias")
        self.assertEqual(self.cur.fetchone()[0], 0)

    def test_dependencia_externa_bloqueia_sem_apagar(self):
        self.cur.execute("CREATE VIEW consulta_do_professor AS SELECT * FROM inep_2023_categorias")
        self.cur.execute("SELECT set_config('atlas.recriar', 'sim', true)")
        self.cur.execute("SAVEPOINT tentativa")
        with self.assertRaises(psycopg2.errors.DependentObjectsStillExist):
            self.cur.execute(self.limpeza)
        self.cur.execute("ROLLBACK TO SAVEPOINT tentativa")
        self.cur.execute("SELECT descricao FROM consulta_do_professor")
        self.assertEqual(self.cur.fetchone()[0], "Preservar")

    def test_erro_depois_da_limpeza_desfaz_recriacao(self):
        self.cur.execute("SAVEPOINT tentativa")
        self.cur.execute("SELECT set_config('atlas.recriar', 'sim', true)")
        self.cur.execute(self.limpeza)
        self.cur.execute(self.ddl)
        with self.assertRaises(psycopg2.errors.DivisionByZero):
            self.cur.execute("SELECT 1 / 0")
        self.cur.execute("ROLLBACK TO SAVEPOINT tentativa")
        self.cur.execute("SELECT descricao FROM inep_2023_categorias")
        self.assertEqual(self.cur.fetchone()[0], "Preservar")

    def test_limpeza_com_chaves_e_views_do_projeto(self):
        for file in ["03_chaves_estrangeiras.sql", "04_views.sql"]:
            self.cur.execute((ROOT / "sql" / file).read_text(encoding="utf-8").replace("gabriel", self.schema))
        self.cur.execute("SELECT set_config('atlas.recriar', 'sim', true)")
        self.cur.execute(self.limpeza)
        self.cur.execute(self.ddl)
        self.cur.execute("SELECT COUNT(*) FROM pg_tables WHERE schemaname = %s", (self.schema,))
        self.assertEqual(self.cur.fetchone()[0], 13)


if __name__ == "__main__":
    unittest.main()
