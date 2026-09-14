from database import get_connection
from app import app


def test_login_and_list_products():
    client = app.test_client()

    response = client.post(
        "/api/login",
        json={"username": "admin", "password": "admin123"},
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["usuario"] == "admin"

    response = client.get("/api/produtos")
    assert response.status_code == 200
    payload = response.get_json()
    assert "produtos" in payload


def test_add_edit_delete_product_requires_login():
    client = app.test_client()

    response = client.post(
        "/api/produtos",
        json={"nome": "Leite", "categoria": "Laticínios", "quantidade": 10, "preco": 5.5},
    )
    assert response.status_code == 401

    login = client.post(
        "/api/login",
        json={"username": "admin", "password": "admin123"},
    )
    assert login.status_code == 200

    create = client.post(
        "/api/produtos",
        json={"nome": "Leite", "categoria": "Laticínios", "quantidade": 10, "preco": 5.5},
    )
    assert create.status_code == 201
    product = create.get_json()
    product_id = product["id"]

    update = client.put(
        f"/api/produtos/{product_id}",
        json={"nome": "Leite Integral", "categoria": "Laticínios", "quantidade": 15, "preco": 6.2},
    )
    assert update.status_code == 200

    delete = client.delete(f"/api/produtos/{product_id}")
    assert delete.status_code == 200


def test_register_user_and_export_csv():
    client = app.test_client()

    register = client.post(
        "/api/usuarios",
        json={"username": "maria", "password": "maria123"},
    )
    assert register.status_code == 201

    with get_connection() as conn:
        row = conn.execute("SELECT username, password FROM usuarios WHERE username = ?", ("maria",)).fetchone()
        assert row is not None
        assert row["password"] != "maria123"

    login = client.post(
        "/api/login",
        json={"username": "maria", "password": "maria123"},
    )
    assert login.status_code == 200

    client.post(
        "/api/produtos",
        json={"nome": "Café", "categoria": "Bebidas", "quantidade": 12, "preco": 18.5},
    )

    response = client.get("/api/produtos/export")
    assert response.status_code == 200
    body = response.get_data(as_text=True)
    assert "nome,categoria,quantidade,preco" in body
    assert "Café" in body
