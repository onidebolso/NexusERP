import { useEffect, useMemo, useState } from 'react'
import logo from '../../logos/logoERP.png'
import './App.css'

const initialForm = {
  nome: '',
  categoria: '',
  quantidade: '',
  preco: '',
  codigo_barras: '',
  fornecedor: '',
  estoque_minimo: 10,
}

const defaultLogin = {
  username: 'admin',
  password: 'admin123',
}

const defaultRegister = {
  username: '',
  password: '',
  confirmPassword: '',
}

function CategoryChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">Sem categorias para exibir.</div>
  }

  const maxValue = Math.max(...data.map((item) => Number(item.value || 0))) || 1

  return (
    <div className="chart-bars">
      {data.map((item) => (
        <div key={item.name} className="chart-row">
          <div className="chart-label-row">
            <span>{item.name}</span>
            <strong>{item.value}</strong>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(Number(item.value || 0) / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function App() {
  const [usuario, setUsuario] = useState(null)
  const [loginForm, setLoginForm] = useState(defaultLogin)
  const [registerForm, setRegisterForm] = useState(defaultRegister)
  const [loginMode, setLoginMode] = useState('login')
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [produtos, setProdutos] = useState([])
  const [alertas, setAlertas] = useState([])
  const [dashboard, setDashboard] = useState({
    total_produtos: 0,
    valor_total: 0,
    produtos_baixo_estoque: 0,
    categorias: [],
  })
  const [busca, setBusca] = useState('')
  const [mensagem, setMensagem] = useState({ type: '', text: '' })
  const [movementValues, setMovementValues] = useState({})
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (!mensagem.text) return undefined

    const timeout = window.setTimeout(() => {
      setMensagem({ type: '', text: '' })
    }, mensagem.type === 'error' ? 3500 : 2200)

    return () => window.clearTimeout(timeout)
  }, [mensagem])

  const totalProdutos = produtos.length

  const resumo = useMemo(
    () => ({
      total: totalProdutos,
      emEstoque: produtos.filter((item) => Number(item.quantidade) > 0).length,
      valorTotal: produtos.reduce((acc, item) => acc + Number(item.quantidade) * Number(item.preco), 0),
    }),
    [produtos, totalProdutos],
  )

  const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.erro || 'Operação não concluída.')
    }

    return data
  }

  const carregarDashboard = async (termo = '') => {
    try {
      const [dataProdutos, dataAlertas, dataDashboard] = await Promise.all([
        fetchJson(`/api/produtos?q=${encodeURIComponent(termo)}`),
        fetchJson('/api/alertas'),
        fetchJson('/api/dashboard'),
      ])

      setProdutos(dataProdutos.produtos || [])
      setAlertas(dataAlertas.alertas || [])
      setDashboard({
        total_produtos: dataDashboard.total_produtos || dataProdutos.total || 0,
        valor_total: dataDashboard.valor_total || 0,
        produtos_baixo_estoque: dataDashboard.produtos_baixo_estoque || 0,
        categorias: dataDashboard.categorias || [],
      })
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    }
  }

  const verificarSessao = async () => {
    try {
      const data = await fetchJson('/api/session')
      setUsuario(data.usuario)
    } catch {
      setUsuario(null)
    }
  }

  useEffect(() => {
    verificarSessao()
    carregarDashboard('')
  }, [])

  useEffect(() => {
    carregarDashboard(busca)
  }, [busca])

  const handleLoginField = (event) => {
    const { name, value } = event.target
    setLoginForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleRegisterField = (event) => {
    const { name, value } = event.target
    setRegisterForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleFormField = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleLogin = async (event) => {
    event.preventDefault()

    try {
      const data = await fetchJson('/api/login', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      })

      setUsuario(data.usuario)
      setMensagem({ type: 'success', text: 'Login realizado com sucesso!' })
      carregarDashboard('')
    } catch (error) {
      setMensagem({ type: 'error', text: error.message })
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()

    if (registerForm.password !== registerForm.confirmPassword) {
      setMensagem({ type: 'error', text: 'As senhas devem coincidir.' })
      return
    }

    try {
      await fetchJson('/api/usuarios', {
        method: 'POST',
        body: JSON.stringify({
          username: registerForm.username,
          password: registerForm.password,
        }),
      })

      setLoginMode('login')
      setRegisterForm(defaultRegister)
      setMensagem({ type: 'success', text: 'Usuário criado com sucesso! Faça login.' })
    } catch (error) {
      setMensagem({ type: 'error', text: error.message })
    }
  }

  const handleLogout = async () => {
    try {
      await fetchJson('/api/logout', { method: 'POST' })
      setUsuario(null)
      setMensagem({ type: 'success', text: 'Logout realizado.' })
    } catch (error) {
      setMensagem({ type: 'error', text: error.message })
    }
  }

  const openNewModal = () => {
    setEditingId(null)
    setForm(initialForm)
    setIsModalOpen(true)
  }

  const openEditModal = (produto) => {
    setEditingId(produto.id)
    setForm({
      nome: produto.nome,
      categoria: produto.categoria,
      quantidade: produto.quantidade,
      preco: produto.preco,
      codigo_barras: produto.codigo_barras || '',
      fornecedor: produto.fornecedor || '',
      estoque_minimo: produto.estoque_minimo || 10,
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setForm(initialForm)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      const payload = {
        ...form,
        quantidade: Number(form.quantidade || 0),
        preco: Number(form.preco || 0),
        estoque_minimo: Number(form.estoque_minimo || 10),
      }

      const endpoint = editingId ? `/api/produtos/${editingId}` : '/api/produtos'
      const method = editingId ? 'PUT' : 'POST'

      await fetchJson(endpoint, {
        method,
        body: JSON.stringify(payload),
      })

      setMensagem({
        type: 'success',
        text: editingId ? 'Produto atualizado com sucesso!' : 'Produto adicionado com sucesso!',
      })
      closeModal()
      carregarDashboard(busca)
    } catch (error) {
      setMensagem({ type: 'error', text: error.message })
    }
  }

  const handleDelete = async (produtoId) => {
    const confirmar = window.confirm('Deseja realmente excluir este produto?')
    if (!confirmar) return

    try {
      await fetchJson(`/api/produtos/${produtoId}`, { method: 'DELETE' })
      setMensagem({ type: 'success', text: 'Produto excluído com sucesso.' })
      carregarDashboard(busca)
    } catch (error) {
      setMensagem({ type: 'error', text: error.message })
    }
  }

  const handleMovimentacao = async (produtoId, tipo) => {
    const quantidade = Number(movementValues[produtoId] ?? 1)

    if (!quantidade || quantidade <= 0) {
      setMensagem({ type: 'error', text: 'Informe uma quantidade válida.' })
      return
    }

    try {
      await fetchJson(`/api/produtos/${produtoId}/movimentacao`, {
        method: 'POST',
        body: JSON.stringify({
          tipo,
          quantidade,
          motivo: tipo === 'entrada' ? 'Entrada manual' : 'Saída manual',
        }),
      })

      setMensagem({
        type: 'success',
        text: tipo === 'entrada' ? 'Entrada registrada com sucesso.' : 'Saída registrada com sucesso.',
      })
      setMovementValues((prev) => ({ ...prev, [produtoId]: 1 }))
      carregarDashboard(busca)
    } catch (error) {
      setMensagem({ type: 'error', text: error.message })
    }
  }

  const handleCsvExport = () => {
    window.location.href = '/api/produtos/export'
  }

  if (!usuario) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-brand">
            <img src={logo} alt="Logo NexusERP" className="brand-logo brand-logo-large" />
          </div>

          <div className="auth-switcher">
            <button
              type="button"
              className={loginMode === 'login' ? 'switch-btn active' : 'switch-btn'}
              onClick={() => setLoginMode('login')}
            >
              Entrar
            </button>
            <button
              type="button"
              className={loginMode === 'register' ? 'switch-btn active' : 'switch-btn'}
              onClick={() => setLoginMode('register')}
            >
              Criar conta
            </button>
          </div>

          {loginMode === 'login' ? (
            <form onSubmit={handleLogin} className="login-form">
              <label>
                Usuário
                <input
                  name="username"
                  value={loginForm.username}
                  onChange={handleLoginField}
                  placeholder="admin"
                  required
                />
              </label>

              <label>
                Senha
                <input
                  type="password"
                  name="password"
                  value={loginForm.password}
                  onChange={handleLoginField}
                  placeholder="admin123"
                  required
                />
              </label>

              <button type="submit" className="primary-btn full-width">Entrar</button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="login-form">
              <label>
                Usuário
                <input
                  name="username"
                  value={registerForm.username}
                  onChange={handleRegisterField}
                  placeholder="novo_usuario"
                  required
                />
              </label>

              <label>
                Senha
                <input
                  type="password"
                  name="password"
                  value={registerForm.password}
                  onChange={handleRegisterField}
                  placeholder="••••••••"
                  required
                />
              </label>

              <label>
                Confirmar senha
                <input
                  type="password"
                  name="confirmPassword"
                  value={registerForm.confirmPassword}
                  onChange={handleRegisterField}
                  placeholder="••••••••"
                  required
                />
              </label>

              <button type="submit" className="primary-btn full-width">Criar usuário</button>
            </form>
          )}

          {mensagem.text && <div className={`message ${mensagem.type}`}>{mensagem.text}</div>}

          <div className="login-hint">
            Usuário demo: <strong>admin</strong> / <strong>admin123</strong>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-box">
          <img src={logo} alt="Logo NexusERP" className="brand-logo brand-logo-large" />
        </div>

        <div className="topbar-actions">
          <div className="topbar-pill">Olá, {usuario}</div>
          <button type="button" className="secondary-btn" onClick={handleLogout}>Sair</button>
        </div>
      </header>

      <section className="dashboard-topbar">
        <div className="dashboard-title-wrap">
          <h2>Dashboard</h2>
          <p>Resumo rápido do desempenho do estoque</p>
        </div>
        <div className="dashboard-actions">
          <button type="button" className="primary-btn" onClick={openNewModal}>Adicionar produto</button>
          <button type="button" className="secondary-btn" onClick={handleCsvExport}>Exportar CSV</button>
        </div>
      </section>

      <div className="summary-grid">
        <div className="summary-card">
          <span>Total de itens</span>
          <strong>{dashboard.total_produtos || resumo.total}</strong>
        </div>
        <div className="summary-card">
          <span>Valor em estoque</span>
          <strong>
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(dashboard.valor_total || resumo.valorTotal)}
          </strong>
        </div>
        <div className="summary-card warning-card">
          <span>Baixo estoque</span>
          <strong>{dashboard.produtos_baixo_estoque || alertas.length}</strong>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel chart-panel">
          <div className="section-header">
            <h2>Produtos por categoria</h2>
          </div>
          <CategoryChart data={dashboard.categorias || []} />
        </div>

        <div className="panel alerts-panel">
          <div className="section-header">
            <h2>Alertas</h2>
          </div>
          <div className="alert-box">
            {alertas.length === 0 ? (
              <span>Sem itens em baixa quantidade.</span>
            ) : (
              <ul>
                {alertas.map((item) => (
                  <li key={item.id}>
                    <strong>{item.nome}</strong>
                    <span>{item.quantidade} unidades</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <section className="panel table-panel">
        <div className="section-header row-space">
          <h2>Produtos em estoque</h2>
          <div className="search-box">
            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar produto..."
            />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Qtd</th>
                <th>Preço</th>
                <th>Fornecedor</th>
                <th>Data</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-row">Nenhum produto encontrado.</td>
                </tr>
              ) : (
                produtos.map((produto) => {
                  const baixo = Number(produto.quantidade) <= Number(produto.estoque_minimo || 10)

                  return (
                    <tr key={produto.id} className={baixo ? 'low-stock-row' : ''}>
                      <td>
                        {produto.nome}
                        {baixo && <span className="warning-pill">Baixo</span>}
                      </td>
                      <td>{produto.categoria}</td>
                      <td>{produto.quantidade}</td>
                      <td>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(Number(produto.preco))}
                      </td>
                      <td>{produto.fornecedor || '-'}</td>
                      <td>{produto.data_cadastro}</td>
                      <td className="actions-cell">
                        <div className="inline-actions">
                          <button type="button" className="ghost-btn" onClick={() => openEditModal(produto)}>Editar</button>
                          <button type="button" className="danger-btn" onClick={() => handleDelete(produto.id)}>Excluir</button>
                        </div>
                        <div className="movement-box">
                          <input
                            type="number"
                            min="1"
                            value={movementValues[produto.id] ?? 1}
                            onChange={(event) =>
                              setMovementValues((prev) => ({
                                ...prev,
                                [produto.id]: Number(event.target.value) || 1,
                              }))
                            }
                          />
                          <button type="button" className="small-success" onClick={() => handleMovimentacao(produto.id, 'entrada')}>
                            Entrada
                          </button>
                          <button type="button" className="small-danger" onClick={() => handleMovimentacao(produto.id, 'saida')}>
                            Saída
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Editar produto' : 'Adicionar produto'}</h3>
              <button type="button" className="close-btn" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="product-form modal-form">
              <div className="field-grid">
                <label>
                  Nome
                  <input name="nome" value={form.nome} onChange={handleFormField} placeholder="Ex: Arroz 5kg" required />
                </label>

                <label>
                  Categoria
                  <input name="categoria" value={form.categoria} onChange={handleFormField} placeholder="Ex: Grãos" required />
                </label>

                <label>
                  Quantidade
                  <input type="number" min="0" name="quantidade" value={form.quantidade} onChange={handleFormField} placeholder="0" required />
                </label>

                <label>
                  Preço
                  <input type="number" min="0" step="0.01" name="preco" value={form.preco} onChange={handleFormField} placeholder="0.00" required />
                </label>

                <label>
                  Código de barras
                  <input name="codigo_barras" value={form.codigo_barras} onChange={handleFormField} placeholder="Opcional" />
                </label>

                <label>
                  Fornecedor
                  <input name="fornecedor" value={form.fornecedor} onChange={handleFormField} placeholder="Opcional" />
                </label>

                <label className="full-span">
                  Estoque mínimo
                  <input type="number" min="0" name="estoque_minimo" value={form.estoque_minimo} onChange={handleFormField} placeholder="10" />
                </label>
              </div>

              <div className="action-row modal-actions">
                <button type="submit" className="primary-btn">{editingId ? 'Atualizar' : 'Salvar'}</button>
                <button type="button" className="secondary-btn" onClick={closeModal}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mensagem.text && <div className={`floating-message ${mensagem.type}`}>{mensagem.text}</div>}
    </div>
  )
}

export default App
