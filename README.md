# NexusERP

Sistema de gestão de estoque e produtos com backend em Flask, frontend em React e persistência em SQLite. O objetivo da aplicação é permitir o cadastro, consulta, atualização, exclusão e movimentação de itens em estoque, além de fornecer um painel com indicadores e alertas de baixa quantidade.

## Visão geral

O NexusERP foi pensado para pequenas empresas e operações locais que precisam controlar produtos, preços e quantidade disponível em estoque de forma simples e eficiente.

Principais recursos:

- Cadastro de usuários e autenticação de acesso
- CRUD de produtos
- Busca por produtos
- Controle de entrada e saída de estoque
- Alertas de produtos com baixo estoque
- Dashboard com resumo geral e distribuição por categoria
- Exportação de produtos em CSV
- Interface web moderna em React

## Tecnologias utilizadas

- Python 3
- Flask
- SQLite
- React
- Vite
- HTML/CSS

## Estrutura do projeto

```text
NexusERP/
├── app.py                  # API principal em Flask
├── database.py            # Operações de banco e regras de negócio
├── estoque.db             # Banco SQLite gerado automaticamente
├── requirements.txt       # Dependências do backend
├── pytest.ini             # Configuração do pytest
├── tests/
│   └── test_api.py        # Testes de API
├── frontend/
│   ├── package.json       # Dependências do frontend
│   ├── vite.config.js     # Configuração do Vite
│   ├── public/
│   └── src/
│       ├── App.jsx        # Interface principal
│       ├── App.css        # Estilos da interface
│       └── main.jsx
├── templates/
│   └── index.html         # Estrutura HTML base de renderização
├── static/
│   ├── app.js
│   └── styles.css
├── logos/
│   └── logoERP.png
└── README.md
```

## Como funciona

### Backend

A API Flask expõe endpoints para:

- criar usuário
- autenticar login
- verificar sessão
- listar produtos
- cadastrar produto
- editar produto
- excluir produto
- registrar movimentação de estoque
- consultar alertas
- consultar dashboard
- exportar CSV

A lógica de negócio fica em `database.py`, incluindo:

- criação automática do banco e das tabelas
- hash da senha do usuário
- cadastro e autenticação dos usuários
- validações para quantidade, preço e estoque mínimo
- movimentações de entrada e saída
- cálculo de dashboard e alertas

### Banco de dados

O projeto usa SQLite com um arquivo local `estoque.db`. O banco é criado automaticamente ao iniciar a aplicação. As principais tabelas são:

- `usuarios`
- `produtos`
- `movimentacoes`

### Frontend

A interface React consome os endpoints da API e exibe:

- tela de login
- cadastro de usuário
- tabela de produtos
- filtros de busca
- modal para cadastro/edição
- botões para entrada e saída de estoque
- painel com alertas e resumo financeiro

## Requisitos

Antes de instalar, confirme que o ambiente tenha:

- Python 3.10 ou superior
- Node.js 18 ou superior
- npm
- pip

## Instalação

### 1. Clone o projeto

```bash
git clone <url-do-repositorio>
cd NexusERP
```

### 2. Crie e ative um ambiente virtual

```bash
python -m venv .venv
source .venv/bin/activate
```

No Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3. Instale as dependências do backend

```bash
pip install -r requirements.txt
```

### 4. Instale as dependências do frontend

```bash
cd frontend
npm install
cd ..
```

## Como executar

### Backend

Na raiz do projeto:

```bash
python app.py
```

A API fica disponível em:

```text
http://localhost:5000
```

### Frontend

Em outro terminal:

```bash
cd frontend
npm run dev
```

O frontend fica disponível em:

```text
http://localhost:5173
```

## Usuário padrão

Ao iniciar o projeto, o sistema cria automaticamente um usuário administrador padrão:

- Usuário: `admin`
- Senha: `admin123`

Esse usuário pode ser usado para testar login e operações do sistema.

## Fluxo de uso

1. Acesse o frontend no navegador.
2. Faça login com o usuário padrão ou crie um novo usuário.
3. Veja o dashboard com resumo de estoque e alertas.
4. Adicione produtos com nome, categoria, quantidade, preço e estoque mínimo.
5. Registre entradas e saídas diretamente na tabela.
6. Use a busca para localizar itens rapidamente.
7. Exporte a relação de produtos em CSV quando necessário.

## Endpoints principais

### Autenticação

- `POST /api/usuarios` — cria um usuário
- `POST /api/login` — autentica o usuário
- `GET /api/session` — verifica se há sessão ativa
- `POST /api/logout` — encerra a sessão

### Produtos

- `GET /api/produtos` — lista todos os produtos ou busca por termo
- `POST /api/produtos` — cadastra um novo produto
- `PUT /api/produtos/<id>` — atualiza um produto
- `DELETE /api/produtos/<id>` — remove um produto
- `POST /api/produtos/<id>/movimentacao` — registra entrada ou saída
- `GET /api/produtos/export` — exporta os produtos em CSV

### Dashboard e alertas

- `GET /api/alertas` — retorna itens em baixa quantidade
- `GET /api/dashboard` — resumo geral do estoque
- `GET /api/estatisticas` — total de produtos e alertas

## Como o sistema funciona na prática

O fluxo principal segue esta lógica:

1. O usuário faz login.
2. O frontend envia requisições para a API Flask.
3. A API valida os dados e chama funções do arquivo `database.py`.
4. O banco SQLite atualiza as tabelas de produtos e movimentações.
5. O frontend recebe a resposta e atualiza o dashboard e a tabela de produtos.
6. Produtos com quantidade menor ou igual ao estoque mínimo são marcados como alerta.

## Testes

Para rodar os testes automatizados:

```bash
pytest
```

Os testes cobrem:

- login
- listagem de produtos
- criação, edição e exclusão de produtos
- autenticação obrigatória
- registro de usuário
- exportação CSV

## Observações

- O projeto cria automaticamente o banco e o usuário admin na primeira execução.
- O sistema foi construído como uma solução leve para gestão local, sem banco externo e sem dependências pesadas.
- Para uso em produção, seria recomendável adicionar autenticação mais robusta, deploy com servidor web e backup do banco.
