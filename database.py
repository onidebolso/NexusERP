import os
import sqlite3

from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "estoque.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'admin'
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS produtos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                categoria TEXT NOT NULL,
                quantidade INTEGER NOT NULL CHECK(quantidade >= 0),
                preco REAL NOT NULL CHECK(preco >= 0),
                codigo_barras TEXT,
                fornecedor TEXT,
                estoque_minimo INTEGER NOT NULL DEFAULT 10,
                data_cadastro TEXT NOT NULL DEFAULT CURRENT_DATE
            )
            """
        )

        produto_columns = conn.execute("PRAGMA table_info(produtos)").fetchall()
        column_names = {column[1] for column in produto_columns}
        if "estoque_minimo" not in column_names:
            conn.execute("ALTER TABLE produtos ADD COLUMN estoque_minimo INTEGER NOT NULL DEFAULT 10")

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS movimentacoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                produto_id INTEGER NOT NULL,
                tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'saida')),
                quantidade INTEGER NOT NULL CHECK(quantidade > 0),
                motivo TEXT,
                usuario TEXT,
                data_movimento TEXT NOT NULL DEFAULT CURRENT_DATE,
                FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
            )
            """
        )

        admin = conn.execute("SELECT id FROM usuarios WHERE username = ?", ("admin",)).fetchone()
        if admin is None:
            conn.execute(
                """
                INSERT INTO usuarios (username, password, role)
                VALUES (?, ?, ?)
                """,
                ("admin", generate_password_hash("admin123"), "admin"),
            )

        conn.execute(
            """
            UPDATE usuarios
            SET password = ?
            WHERE username = ? AND password IS NOT NULL AND password != ? AND password NOT LIKE 'pbkdf2:%'
            """,
            (generate_password_hash("admin123"), "admin", "admin123"),
        )

        conn.commit()


def create_user(username, password):
    username = (username or "").strip()
    password = (password or "").strip()

    if not username or not password:
        raise ValueError("Usuário e senha são obrigatórios.")

    if len(password) < 4:
        raise ValueError("A senha deve ter pelo menos 4 caracteres.")

    with get_connection() as conn:
        existing = conn.execute("SELECT id FROM usuarios WHERE username = ?", (username,)).fetchone()
        if existing:
            raise ValueError("Usuário já existe.")

        conn.execute(
            "INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)",
            (username, generate_password_hash(password), "admin"),
        )
        conn.commit()
        return username


def authenticate_user(username, password):
    username = (username or "").strip()
    password = (password or "").strip()

    if not username or not password:
        return None

    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, username, password, role FROM usuarios WHERE username = ?",
            (username,),
        ).fetchone()

    if row is None:
        return None

    saved_password = row["password"]
    if check_password_hash(saved_password, password):
        return dict(row)

    if saved_password == password:
        with get_connection() as conn:
            conn.execute(
                "UPDATE usuarios SET password = ? WHERE username = ?",
                (generate_password_hash(password), username),
            )
            conn.commit()
        row = dict(row)
        row["password"] = generate_password_hash(password)
        return row

    return None


def add_product(data):
    nome = (data.get("nome") or "").strip()
    categoria = (data.get("categoria") or "").strip()
    quantidade = int(data.get("quantidade", 0) or 0)
    preco = float(data.get("preco", 0) or 0)
    codigo_barras = (data.get("codigo_barras") or "").strip()
    fornecedor = (data.get("fornecedor") or "").strip()
    estoque_minimo = int(data.get("estoque_minimo", 10) or 10)

    if not nome or not categoria:
        raise ValueError("Nome e categoria são obrigatórios.")

    if quantidade < 0:
        raise ValueError("Quantidade não pode ser negativa.")

    if preco < 0:
        raise ValueError("Preço não pode ser negativo.")

    if estoque_minimo < 0:
        raise ValueError("Estoque mínimo não pode ser negativo.")

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO produtos (nome, categoria, quantidade, preco, codigo_barras, fornecedor, estoque_minimo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (nome, categoria, quantidade, preco, codigo_barras or None, fornecedor or None, estoque_minimo),
        )
        conn.commit()
        return cursor.lastrowid


def update_product(product_id, data):
    nome = (data.get("nome") or "").strip()
    categoria = (data.get("categoria") or "").strip()
    quantidade = int(data.get("quantidade", 0) or 0)
    preco = float(data.get("preco", 0) or 0)
    codigo_barras = (data.get("codigo_barras") or "").strip()
    fornecedor = (data.get("fornecedor") or "").strip()
    estoque_minimo = int(data.get("estoque_minimo", 10) or 10)

    if not nome or not categoria:
        raise ValueError("Nome e categoria são obrigatórios.")

    if quantidade < 0:
        raise ValueError("Quantidade não pode ser negativa.")

    if preco < 0:
        raise ValueError("Preço não pode ser negativo.")

    if estoque_minimo < 0:
        raise ValueError("Estoque mínimo não pode ser negativo.")

    with get_connection() as conn:
        row = conn.execute("SELECT id FROM produtos WHERE id = ?", (product_id,)).fetchone()
        if row is None:
            raise ValueError("Produto não encontrado.")

        conn.execute(
            """
            UPDATE produtos
            SET nome = ?, categoria = ?, quantidade = ?, preco = ?, codigo_barras = ?, fornecedor = ?, estoque_minimo = ?
            WHERE id = ?
            """,
            (nome, categoria, quantidade, preco, codigo_barras or None, fornecedor or None, estoque_minimo, product_id),
        )
        conn.commit()
        return product_id


def delete_product(product_id):
    with get_connection() as conn:
        row = conn.execute("SELECT id FROM produtos WHERE id = ?", (product_id,)).fetchone()
        if row is None:
            raise ValueError("Produto não encontrado.")

        conn.execute("DELETE FROM movimentacoes WHERE produto_id = ?", (product_id,))
        conn.execute("DELETE FROM produtos WHERE id = ?", (product_id,))
        conn.commit()
        return True


def add_stock_movement(product_id, tipo, quantidade, motivo, usuario):
    tipo = (tipo or "").strip().lower()
    quantidade = int(quantidade or 0)
    motivo = (motivo or "").strip()

    if tipo not in {"entrada", "saida"}:
        raise ValueError("Tipo da movimentação é inválido.")

    if quantidade <= 0:
        raise ValueError("Quantidade da movimentação deve ser maior que zero.")

    with get_connection() as conn:
        row = conn.execute("SELECT quantidade FROM produtos WHERE id = ?", (product_id,)).fetchone()
        if row is None:
            raise ValueError("Produto não encontrado.")

        estoque_atual = row["quantidade"]

        if tipo == "saida" and estoque_atual < quantidade:
            raise ValueError("Estoque insuficiente para a saída.")

        novo_estoque = estoque_atual + quantidade if tipo == "entrada" else estoque_atual - quantidade

        conn.execute(
            "UPDATE produtos SET quantidade = ? WHERE id = ?",
            (novo_estoque, product_id),
        )
        conn.execute(
            """
            INSERT INTO movimentacoes (produto_id, tipo, quantidade, motivo, usuario)
            VALUES (?, ?, ?, ?, ?)
            """,
            (product_id, tipo, quantidade, motivo or "Movimentação manual", usuario or "sistema"),
        )
        conn.commit()
        return novo_estoque


def list_products(search_term=""):
    search = f"%{search_term.strip()}%"
    with get_connection() as conn:
        if search_term.strip():
            rows = conn.execute(
                """
                SELECT id, nome, categoria, quantidade, preco, codigo_barras, fornecedor, estoque_minimo, data_cadastro
                FROM produtos
                WHERE nome LIKE ? OR categoria LIKE ? OR codigo_barras LIKE ? OR fornecedor LIKE ?
                ORDER BY nome ASC
                """,
                (search, search, search, search),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT id, nome, categoria, quantidade, preco, codigo_barras, fornecedor, estoque_minimo, data_cadastro
                FROM produtos
                ORDER BY nome ASC
                """
            ).fetchall()

        return [dict(row) for row in rows]


def count_products():
    with get_connection() as conn:
        result = conn.execute("SELECT COUNT(*) as total FROM produtos").fetchone()
        return result["total"]


def get_low_stock_products(threshold=10):
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, nome, categoria, quantidade, preco, estoque_minimo
            FROM produtos
            WHERE quantidade <= ?
            ORDER BY quantidade ASC, nome ASC
            """,
            (threshold,),
        ).fetchall()

    return [dict(row) for row in rows]


def get_dashboard_data():
    produtos = list_products()
    total = len(produtos)
    valor_total = sum(float(item["preco"]) * int(item["quantidade"]) for item in produtos)
    baixo_estoque = [item for item in produtos if int(item["quantidade"]) <= int(item.get("estoque_minimo", 10))]

    categorias = {}
    for produto in produtos:
        categoria = produto["categoria"]
        categorias[categoria] = categorias.get(categoria, 0) + 1

    return {
        "total_produtos": total,
        "valor_total": valor_total,
        "produtos_baixo_estoque": len(baixo_estoque),
        "categorias": [
            {"name": categoria, "value": quantidade}
            for categoria, quantidade in sorted(categorias.items())
        ],
    }
