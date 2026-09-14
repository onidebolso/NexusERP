import csv
import io

from flask import Flask, Response, jsonify, request, session

from database import (
    add_product,
    add_stock_movement,
    authenticate_user,
    count_products,
    create_user,
    delete_product,
    get_dashboard_data,
    get_low_stock_products,
    init_db,
    list_products,
    update_product,
)

app = Flask(__name__)
app.config["SECRET_KEY"] = "nexuserp-secret-key"


@app.before_request
def setup_database():
    init_db()


@app.route("/api/usuarios", methods=["POST"])
def api_criar_usuario():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    try:
        create_user(username, password)
    except ValueError as exc:
        return jsonify({"erro": str(exc)}), 400
    except Exception as exc:
        return jsonify({"erro": f"Erro ao criar usuário: {exc}"}), 500

    return jsonify({"mensagem": "Usuário criado com sucesso.", "usuario": username}), 201


@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    user = authenticate_user(username, password)
    if not user:
        return jsonify({"erro": "Usuário ou senha inválidos."}), 401

    session["user"] = user["username"]
    return jsonify({"mensagem": "Login realizado com sucesso", "usuario": user["username"]})


@app.route("/api/session", methods=["GET"])
def api_session():
    if "user" not in session:
        return jsonify({"autenticado": False}), 401

    return jsonify({"autenticado": True, "usuario": session["user"]})


@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"mensagem": "Logout realizado com sucesso"})


@app.route("/api/produtos", methods=["GET"])
def api_listar_produtos():
    termo = request.args.get("q", "")
    produtos = list_products(termo)
    alertas = get_low_stock_products(10)
    return jsonify({"produtos": produtos, "total": len(produtos), "alertas": alertas})


@app.route("/api/produtos/export", methods=["GET"])
def api_exportar_csv():
    if "user" not in session:
        return jsonify({"erro": "Autenticação necessária."}), 401

    produtos = list_products()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "nome", "categoria", "quantidade", "preco", "codigo_barras", "fornecedor", "estoque_minimo", "data_cadastro"])

    for produto in produtos:
        writer.writerow([
            produto.get("id"),
            produto.get("nome"),
            produto.get("categoria"),
            produto.get("quantidade"),
            produto.get("preco"),
            produto.get("codigo_barras") or "",
            produto.get("fornecedor") or "",
            produto.get("estoque_minimo", 10),
            produto.get("data_cadastro"),
        ])

    response = Response(output.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=produtos.csv"
    return response


@app.route("/api/produtos", methods=["POST"])
def api_adicionar_produto():
    if "user" not in session:
        return jsonify({"erro": "Autenticação necessária."}), 401

    data = request.get_json(silent=True) or {}

    try:
        produto_id = add_product(data)
    except ValueError as exc:
        return jsonify({"erro": str(exc)}), 400
    except Exception as exc:
        return jsonify({"erro": f"Erro ao salvar produto: {exc}"}), 500

    return jsonify({"mensagem": "Produto adicionado com sucesso", "id": produto_id}), 201


@app.route("/api/produtos/<int:produto_id>", methods=["PUT"])
def api_atualizar_produto(produto_id):
    if "user" not in session:
        return jsonify({"erro": "Autenticação necessária."}), 401

    data = request.get_json(silent=True) or {}

    try:
        produto_id = update_product(produto_id, data)
    except ValueError as exc:
        return jsonify({"erro": str(exc)}), 400
    except Exception as exc:
        return jsonify({"erro": f"Erro ao atualizar produto: {exc}"}), 500

    return jsonify({"mensagem": "Produto atualizado com sucesso", "id": produto_id})


@app.route("/api/produtos/<int:produto_id>", methods=["DELETE"])
def api_excluir_produto(produto_id):
    if "user" not in session:
        return jsonify({"erro": "Autenticação necessária."}), 401

    try:
        delete_product(produto_id)
    except ValueError as exc:
        return jsonify({"erro": str(exc)}), 404
    except Exception as exc:
        return jsonify({"erro": f"Erro ao excluir produto: {exc}"}), 500

    return jsonify({"mensagem": "Produto excluído com sucesso"})


@app.route("/api/produtos/<int:produto_id>/movimentacao", methods=["POST"])
def api_movimentar_estoque(produto_id):
    if "user" not in session:
        return jsonify({"erro": "Autenticação necessária."}), 401

    data = request.get_json(silent=True) or {}
    tipo = data.get("tipo")
    quantidade = data.get("quantidade")
    motivo = data.get("motivo")

    try:
        novo_estoque = add_stock_movement(produto_id, tipo, quantidade, motivo, session["user"])
    except ValueError as exc:
        return jsonify({"erro": str(exc)}), 400
    except Exception as exc:
        return jsonify({"erro": f"Erro na movimentação: {exc}"}), 500

    return jsonify({"mensagem": "Movimentação registrada com sucesso", "novo_estoque": novo_estoque})


@app.route("/api/alertas", methods=["GET"])
def api_alertas():
    alertas = get_low_stock_products(10)
    return jsonify({"alertas": alertas, "total": len(alertas)})


@app.route("/api/dashboard", methods=["GET"])
def api_dashboard():
    if "user" not in session:
        return jsonify({"erro": "Autenticação necessária."}), 401

    return jsonify(get_dashboard_data())


@app.route("/api/estatisticas", methods=["GET"])
def api_estatisticas():
    alertas = get_low_stock_products(10)
    return jsonify({
        "total_produtos": count_products(),
        "alertas_total": len(alertas),
    })


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
