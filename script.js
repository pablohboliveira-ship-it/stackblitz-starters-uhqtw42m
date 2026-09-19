const SUPABASE_URL = 'https://nutgyzjaexigklaisxbw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_k1oLKdTi1qPrWk001i2lqQ_6NmBfPAz';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// --- ESTADO DA APLICAÇÃO ---
let state = {
  currentTab: 'inicio',
  currentMonth: '2026-09',
  transactions: [],
  categories: [],
  cards: []
};

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupForms();
  await carregarTudo();
});

async function carregarTudo() {
  await Promise.all([
    carregarCategorias(),
    carregarCartoes(),
    carregarLancamentos()
  ]);
  render();
}

// --- CARREGAR DADOS DO SUPABASE ---
async function carregarCategorias() {
  const { data, error } = await _supabase.from('categorias').select('*');
  if (!error && data) state.categories = data;
}

async function carregarCartoes() {
  const { data, error } = await _supabase.from('cartoes').select('*');
  if (!error && data) state.cards = data;
}

async function carregarLancamentos() {
  const { data, error } = await _supabase.from('lancamentos').select('*');
  if (!error && data) state.transactions = data;
}

// --- NAVEGAÇÃO ENTRE ABAS ---
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      state.currentTab = item.dataset.tab;
      
      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
      const targetTab = document.getElementById(`tab-${state.currentTab}`);
      if (targetTab) targetTab.classList.add('active');
      
      render();
    });
  });
}

// --- FORMULÁRIOS E AÇÕES ---
function setupForms() {
  // Mudança de Mês
  const monthInput = document.getElementById('month-filter');
  if (monthInput) {
    monthInput.value = state.currentMonth;
    monthInput.addEventListener('change', (e) => {
      state.currentMonth = e.target.value;
      render();
    });
  }

  // Novo Lançamento
  const formLancamento = document.getElementById('form-lancamento');
  if (formLancamento) {
    formLancamento.addEventListener('submit', async (e) => {
      e.preventDefault();
      const novo = {
        descricao: document.getElementById('lanc-desc').value,
        valor: parseFloat(document.getElementById('lanc-valor').value),
        tipo: document.getElementById('lanc-tipo').value,
        data: document.getElementById('lanc-data').value,
        categoria_id: document.getElementById('lanc-cat').value || null,
        forma_pagamento: document.getElementById('lanc-forma').value,
        cartao_id: document.getElementById('lanc-cartao').value || null
      };

      const { error } = await _supabase.from('lancamentos').insert([novo]);
      if (error) alert('Erro ao salvar: ' + error.message);
      else {
        formLancamento.reset();
        await carregarLancamentos();
        render();
      }
    });
  }

  // Nova Categoria
  const formCat = document.getElementById('form-categoria');
  if (formCat) {
    formCat.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nova = {
        nome: document.getElementById('cat-nome').value,
        tipo: document.getElementById('cat-tipo').value
      };
      const { error } = await _supabase.from('categorias').insert([nova]);
      if (!error) {
        formCat.reset();
        await carregarCategorias();
        render();
      }
    });
  }

  // Novo Cartão
  const formCartao = document.getElementById('form-cartao');
  if (formCartao) {
    formCartao.addEventListener('submit', async (e) => {
      e.preventDefault();
      const novo = {
        nome: document.getElementById('cartao-nome').value,
        limite: parseFloat(document.getElementById('cartao-limite').value),
        dia_fechamento: parseInt(document.getElementById('cartao-fechamento').value),
        dia_vencimento: parseInt(document.getElementById('cartao-vencimento').value)
      };
      const { error } = await _supabase.from('cartoes').insert([novo]);
      if (!error) {
        formCartao.reset();
        await carregarCartoes();
        render();
      }
    });
  }
}

// --- APAGAR REGISTOS ---
async function apagarLancamento(id) {
  const { error } = await _supabase.from('lancamentos').delete().eq('id', id);
  if (!error) {
    await carregarLancamentos();
    render();
  }
}

// --- RENDERIZAR TELA ---
function render() {
  renderResumo();
  renderListas();
  preencherDropdowns();
}

function renderResumo() {
  const lancamentosDoMes = state.transactions.filter(t => t.data && t.data.startsWith(state.currentMonth));
  
  const receitas = lancamentosDoMes
    .filter(t => t.tipo === 'receita')
    .reduce((acc, t) => acc + Number(t.valor), 0);
    
  const despesas = lancamentosDoMes
    .filter(t => t.tipo === 'despesa')
    .reduce((acc, t) => acc + Number(t.valor), 0);
    
  const saldo = receitas - despesas;

  const elSaldo = document.getElementById('resumo-saldo');
  const elReceitas = document.getElementById('resumo-receitas');
  const elDespesas = document.getElementById('resumo-despesas');

  if (elSaldo) elSaldo.textContent = `R$ ${saldo.toFixed(2)}`;
  if (elReceitas) elReceitas.textContent = `R$ ${receitas.toFixed(2)}`;
  if (elDespesas) elDespesas.textContent = `R$ ${despesas.toFixed(2)}`;
}

function renderListas() {
  // Lista de lançamentos recentes no início
  const containerInicio = document.getElementById('lista-recentes');
  if (containerInicio) {
    const lancamentosDoMes = state.transactions
      .filter(t => t.data && t.data.startsWith(state.currentMonth))
      .slice(0, 5);

    containerInicio.innerHTML = lancamentosDoMes.map(t => `
      <div class="transaction-item ${t.tipo}">
        <div>
          <strong>${t.descricao}</strong>
          <small>${t.data}</small>
        </div>
        <div>
          <span>R$ ${Number(t.valor).toFixed(2)}</span>
          <button onclick="apagarLancamento(${t.id})">🗑️</button>
        </div>
      </div>
    `).join('') || '<p>Nenhum lançamento neste mês.</p>';
  }
}

function preencherDropdowns() {
  const selectCat = document.getElementById('lanc-cat');
  if (selectCat) {
    selectCat.innerHTML = '<option value="">Sem Categoria</option>' + 
      state.categories.map(c => `<option value="${c.id}">${c.nome} (${c.tipo})</option>`).join('');
  }

  const selectCartao = document.getElementById('lanc-cartao');
  if (selectCartao) {
    selectCartao.innerHTML = '<option value="">Nenhum</option>' + 
      state.cards.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  }
}