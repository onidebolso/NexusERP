const form = document.getElementById('produtoForm');
const mensagem = document.getElementById('mensagem');
const tabelaProdutos = document.getElementById('tabelaProdutos');
const buscarInput = document.getElementById('buscarInput');
const buscarBtn = document.getElementById('buscarBtn');
const totalProdutos = document.getElementById('totalProdutos');

async function carregarProdutos(termo = '') {
  try {
    const response = await fetch(`/api/produtos?q=${encodeURIComponent(termo)}`);
    const data = await response.json();

    tabelaProdutos.innerHTML = '';

    if (!data.produtos || data.produtos.length === 0) {
      tabelaProdutos.innerHTML = `
        <tr>
          <td colspan="6">Nenhum produto encontrado.</td>
        </tr>
      `;
      totalProdutos.textContent = '0 produtos';
      return;
    }

    data.produtos.forEach((produto) => {
      const linha = document.createElement('tr');
      linha.innerHTML = `
        <td>${produto.nome}</td>
        <td>${produto.categoria}</td>
        <td>${produto.quantidade}</td>
        <td>R$ ${Number(produto.preco).toFixed(2)}</td>
        <td>${produto.fornecedor || '-'}</td>
        <td>${produto.data_cadastro}</td>
      `;
      tabelaProdutos.appendChild(linha);
    });

    totalProdutos.textContent = `${data.total} produto${data.total !== 1 ? 's' : ''}`;
  } catch (error) {
    console.error(error);
    tabelaProdutos.innerHTML = `
      <tr>
        <td colspan="6">Erro ao carregar os produtos.</td>
      </tr>
    `;
  }
}

async function carregarEstatisticas() {
  try {
    const response = await fetch('/api/estatisticas');
    const data = await response.json();
    totalProdutos.textContent = `${data.total_produtos} produto${data.total_produtos !== 1 ? 's' : ''}`;
  } catch (error) {
    console.error(error);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  payload.quantidade = Number(payload.quantidade);
  payload.preco = Number(payload.preco);

  mensagem.textContent = '';
  mensagem.className = 'mensagem';

  try {
    const response = await fetch('/api/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const resposta = await response.json();

    if (!response.ok) {
      throw new Error(resposta.erro || 'Erro ao adicionar produto');
    }

    mensagem.textContent = resposta.mensagem;
    mensagem.classList.add('success');
    form.reset();
    await carregarProdutos(buscarInput.value.trim());
    await carregarEstatisticas();
  } catch (error) {
    mensagem.textContent = error.message;
    mensagem.classList.add('error');
  }
});

buscarBtn.addEventListener('click', () => {
  carregarProdutos(buscarInput.value.trim());
});

buscarInput.addEventListener('input', () => {
  carregarProdutos(buscarInput.value.trim());
});

carregarProdutos();
carregarEstatisticas();
