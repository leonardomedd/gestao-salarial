#!/usr/bin/env python3
"""
Gestão de Salário — backend local.

- Apenas biblioteca padrão do Python (sem pip install).
- Banco SQLite em arquivo local (data/salario.db) — seus dados ficam com você.
- Escuta somente em 127.0.0.1 (não fica acessível na rede).
- Serve a API (/api/...) e, se existir, o build do frontend (dist/).

Uso:
    python3 server.py            # porta 8471
    python3 server.py --port 9000
"""

import argparse
import json
import re
import sqlite3
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "salario.db"
DIST_DIR = BASE_DIR / "dist"

DEFAULT_PORT = 8471

MONTH_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")
DATE_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$")

SCHEMA = """
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT NOT NULL CHECK (type IN ('income','expense')),
    description TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'Outros',
    amount      INTEGER NOT NULL CHECK (amount > 0),  -- centavos
    date        TEXT NOT NULL,                        -- YYYY-MM-DD
    recurring   INTEGER NOT NULL DEFAULT 0,           -- 1 = repete todo mês
    created_at  INTEGER NOT NULL
);
"""


def get_db() -> sqlite3.Connection:
    DATA_DIR.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def row_to_dict(r: sqlite3.Row) -> dict:
    return {
        "id": r["id"],
        "type": r["type"],
        "description": r["description"],
        "category": r["category"],
        "amount": r["amount"],
        "date": r["date"],
        "recurring": bool(r["recurring"]),
    }


def validate_tx(data: dict, partial: bool = False) -> dict:
    """Valida e normaliza um lançamento. Lança ValueError em caso de erro."""
    out = {}
    if not partial or "type" in data:
        if data.get("type") not in ("income", "expense"):
            raise ValueError("type deve ser 'income' ou 'expense'")
        out["type"] = data["type"]
    if not partial or "description" in data:
        desc = str(data.get("description", "")).strip()
        if not desc or len(desc) > 120:
            raise ValueError("description obrigatória (máx. 120 caracteres)")
        out["description"] = desc
    if not partial or "category" in data:
        cat = str(data.get("category", "Outros")).strip() or "Outros"
        out["category"] = cat[:40]
    if not partial or "amount" in data:
        try:
            amount = int(round(float(data["amount"])))
        except (TypeError, ValueError):
            raise ValueError("amount deve ser número (centavos)")
        if amount <= 0 or amount > 10**12:
            raise ValueError("amount inválido")
        out["amount"] = amount
    if not partial or "date" in data:
        date = str(data.get("date", ""))
        if not DATE_RE.match(date):
            raise ValueError("date deve ser YYYY-MM-DD")
        out["date"] = date
    if "recurring" in data:
        out["recurring"] = 1 if data["recurring"] else 0
    elif not partial:
        out["recurring"] = 0
    return out


class Handler(BaseHTTPRequestHandler):
    server_version = "SalarioApp/1.0"

    # ---------- utilidades ----------
    def _send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        # Dev: permite o Vite dev server chamar a API; em produção é mesma origem.
        origin = self.headers.get("Origin", "")
        if re.match(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$", origin):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def _error(self, msg, status=400):
        self._send_json({"error": msg}, status)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        if length > 64 * 1024:
            raise ValueError("payload muito grande")
        try:
            return json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            raise ValueError("JSON inválido")

    def log_message(self, fmt, *args):  # log discreto
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))

    # ---------- rotas ----------
    def do_OPTIONS(self):
        self._send_json({})

    def do_GET(self):
        parsed = urlparse(self.path)
        path, qs = parsed.path, parse_qs(parsed.query)

        if path == "/api/health":
            return self._send_json({"ok": True, "time": int(time.time())})

        if path == "/api/month":
            month = (qs.get("m") or [""])[0]
            if not MONTH_RE.match(month):
                return self._error("parâmetro m=YYYY-MM obrigatório")
            conn = get_db()
            salary = conn.execute(
                "SELECT value FROM settings WHERE key='salary'"
            ).fetchone()
            # lançamentos do mês + recorrentes iniciados até este mês
            rows = conn.execute(
                """
                SELECT * FROM transactions
                WHERE (recurring = 0 AND substr(date,1,7) = ?)
                   OR (recurring = 1 AND substr(date,1,7) <= ?)
                ORDER BY date DESC, id DESC
                """,
                (month, month),
            ).fetchall()
            txs = [row_to_dict(r) for r in rows]
            conn.close()
            return self._send_json({
                "month": month,
                "salary": int(salary["value"]) if salary else 0,
                "transactions": txs,
            })

        if path == "/api/export":
            conn = get_db()
            salary = conn.execute(
                "SELECT value FROM settings WHERE key='salary'"
            ).fetchone()
            rows = conn.execute(
                "SELECT * FROM transactions ORDER BY date DESC, id DESC"
            ).fetchall()
            conn.close()
            return self._send_json({
                "salary": int(salary["value"]) if salary else 0,
                "transactions": [row_to_dict(r) for r in rows],
            })

        # arquivos estáticos (build do frontend)
        if not path.startswith("/api"):
            return self._serve_static(path)

        self._error("rota não encontrada", 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        try:
            data = self._read_json()
        except ValueError as e:
            return self._error(str(e))

        if parsed.path == "/api/transaction":
            try:
                tx = validate_tx(data)
            except ValueError as e:
                return self._error(str(e))
            conn = get_db()
            cur = conn.execute(
                """INSERT INTO transactions
                   (type, description, category, amount, date, recurring, created_at)
                   VALUES (?,?,?,?,?,?,?)""",
                (tx["type"], tx["description"], tx["category"], tx["amount"],
                 tx["date"], tx["recurring"], int(time.time())),
            )
            conn.commit()
            new_id = cur.lastrowid
            conn.close()
            return self._send_json({"id": new_id}, 201)

        if parsed.path == "/api/salary":
            try:
                amount = int(round(float(data.get("amount", 0))))
            except (TypeError, ValueError):
                return self._error("amount deve ser número (centavos)")
            if amount < 0 or amount > 10**12:
                return self._error("amount inválido")
            conn = get_db()
            conn.execute(
                "INSERT INTO settings (key,value) VALUES ('salary',?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (str(amount),),
            )
            conn.commit()
            conn.close()
            return self._send_json({"salary": amount})

        self._error("rota não encontrada", 404)

    def do_PUT(self):
        m = re.match(r"^/api/transaction/(\d+)$", urlparse(self.path).path)
        if not m:
            return self._error("rota não encontrada", 404)
        try:
            tx = validate_tx(self._read_json(), partial=True)
        except ValueError as e:
            return self._error(str(e))
        if not tx:
            return self._error("nada para atualizar")
        sets = ", ".join(f"{k}=?" for k in tx)
        conn = get_db()
        cur = conn.execute(
            f"UPDATE transactions SET {sets} WHERE id=?",
            (*tx.values(), int(m.group(1))),
        )
        conn.commit()
        changed = cur.rowcount
        conn.close()
        if not changed:
            return self._error("lançamento não encontrado", 404)
        self._send_json({"ok": True})

    def do_DELETE(self):
        m = re.match(r"^/api/transaction/(\d+)$", urlparse(self.path).path)
        if not m:
            return self._error("rota não encontrada", 404)
        conn = get_db()
        cur = conn.execute("DELETE FROM transactions WHERE id=?", (int(m.group(1)),))
        conn.commit()
        changed = cur.rowcount
        conn.close()
        if not changed:
            return self._error("lançamento não encontrado", 404)
        self._send_json({"ok": True})

    # ---------- estáticos ----------
    def _serve_static(self, path: str):
        if not DIST_DIR.is_dir():
            self._error(
                "Frontend não compilado. Rode 'npm run build' no frontend "
                "ou use o dev server (npm run dev).", 404)
            return
        rel = path.lstrip("/") or "index.html"
        target = (DIST_DIR / rel).resolve()
        if not str(target).startswith(str(DIST_DIR.resolve())) or not target.is_file():
            target = DIST_DIR / "index.html"  # SPA fallback
        mime = {
            ".html": "text/html; charset=utf-8",
            ".js": "text/javascript",
            ".css": "text/css",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".ico": "image/x-icon",
            ".json": "application/json",
            ".woff2": "font/woff2",
        }.get(target.suffix, "application/octet-stream")
        body = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache" if target.name == "index.html" else "max-age=31536000, immutable")
        self.end_headers()
        self.wfile.write(body)


def main():
    parser = argparse.ArgumentParser(description="Gestão de Salário — servidor local")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args()

    get_db().close()  # garante schema
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Gestão de Salário rodando em http://127.0.0.1:{args.port}")
    print(f"Dados em: {DB_PATH}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrado.")


if __name__ == "__main__":
    main()
