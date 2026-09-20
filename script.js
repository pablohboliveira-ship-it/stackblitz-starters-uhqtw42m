// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL = 'https://nutgyzjaexigklaisxbw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_k1oLKdTi1qPrWk001i2lqQ_6NmBfPAz';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
    inicializarNavegacao();
    carregarCategorias();
    carregarCartoes();
    carregarDadosIniciais();
    carregarDespesasFixas();

    const monthFilter = document.getElementById("month-filter");
    if (monthFilter) {
        monthFilter.addEventListener("change", carregarDadosIniciais);
    }
});

// --- NAVEGAÇÃO ENTRE ABAS ---
function inicializarNavegacao() {
    const navButtons = document.querySelectorAll(".nav-item");
    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");

            document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));

            btn.classList.add("active");
            const tabElement = document.getElementById(`tab-${targetTab}`);
            if (tabElement) tabElement.classList.add("active");
        });
    });
}

// --- 1. RESUMO MENSAL E LANÇAMENTOS (ABA INÍCIO) ---
async function carregarDadosIniciais() {
    const mesSelecionado = document.getElementById("month-filter").value; // Ex: "2026-09"

    const { data, error } = await supabaseClient
        .from('lancamentos')
        .select('*');

    if (error) {
        console.error("Erro ao carregar lançamentos:", error);
        return;
    }

    let receitas = 0;
    let despesas = 0;
    const listaRecentes = document.getElementById("lista-recentes");
    if (!listaRecentes) return;
    listaRecentes.innerHTML = "";

    if (data && data.length > 0) {
        data.sort((a, b) => new Date(b.data || b.created_at) - new Date(a.data || a.created_at));

        data.forEach(item => {
            const dataItem = item.data || item.created_at || '';
            
            if (dataItem.startsWith(mesSelecionado)) {
                const valor = Number(item.valor) || 0;
                if (item.tipo === 'receita') {
                    receitas += valor;
                } else {
                    despesas += valor;
                }

                const div = document.createElement("div");
                div.style.cssText = "display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #334155;";
                div.innerHTML = `
                    <div>
                        <strong>${item.descricao}</strong><br>
                        <small style="color: #94a3b8;">${dataItem} • ${item.categoria || 'Geral'}</small>
                    </div>
                    <span style="color: ${item.tipo === 'receita' ? '#4ade80' : '#f87171'}; font-weight: bold;">
                        ${item.tipo === 'receita' ? '+' : '-'} R$ ${valor.toFixed(2)}
                    </span>
                `;
                listaRecentes.appendChild(div);
            }
        });

        if (listaRecentes.innerHTML === "") {
            listaRecentes.innerHTML = "<p style='color: #94a3b8; text-align: center;'>Nenhum lançamento neste mês.</p>";
        }
    } else {
        listaRecentes.innerHTML = "<p style='color: #94a3b8; text-align: center;'>Nenhum lançamento registado.</p>";
    }

    const saldo = receitas - despesas;

    document.getElementById("resumo-receitas").innerText = `R$ ${receitas.toFixed(2)}`;
    document.getElementById("resumo-despesas").innerText = `R$ ${despesas.toFixed(2)}`;
    
    const elemSaldo = document.getElementById("resumo-saldo");
    elemSaldo.innerText = `R$ ${saldo.toFixed(2)}`;
    elemSaldo.style.color = saldo >= 0 ? "#4ade80" : "#f87171";
}

// --- 2. FORMULÁRIO DE LANÇAMENTOS ---
const formLancamento = document.getElementById("form-lancamento");
if (formLancamento) {
    formLancamento.addEventListener("submit", async (e) => {
        e.preventDefault();
        const novoLancamento = {
            descricao: document.getElementById("lanc-desc").value,
            valor: Number(document.getElementById("lanc-valor").value),
            tipo: document.getElementById("lanc-tipo").value,
            data: document.getElementById("lanc-data").value,
            categoria: document.getElementById("lanc-cat").value,
            forma_pagamento: document.getElementById("lanc-forma").value,
            cartao_id: document.getElementById("lanc-cartao").value || null
        };

        const { error } = await supabaseClient.from('lancamentos').insert([novoLancamento]);
        if (error) {
            alert("Erro ao salvar lançamento: " + error.message);
        } else {
            alert("Lançamento guardado com sucesso!");
            formLancamento.reset();
            carregarDadosIniciais();
            document.querySelector('[data-tab="inicio"]').click();
        }
    });
}

// --- 3. CATEGORIAS E CARTÕES ---
async function carregarCategorias() {
    const selectCat = document.getElementById("lanc-cat");
    if (!selectCat) return;
    
    const { data } = await supabaseClient.from('categorias').select('*');
    selectCat.innerHTML = '<option value="">Selecione a categoria</option>';
    if (data) {
        data.forEach(cat => {
            selectCat.innerHTML += `<option value="${cat.nome}">${cat.nome}</option>`;
        });
    }
}

async function carregarCartoes() {
    const selectCartao = document.getElementById("lanc-cartao");
    if (!selectCartao) return;

    const { data } = await supabaseClient.from('cartoes').select('*');
    selectCartao.innerHTML = '<option value="">Nenhum / Conta Corrente</option>';
    if (data) {
        data.forEach(c => {
            selectCartao.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
        });
    }
}

const formCategoria = document.getElementById("form-categoria");
if (formCategoria) {
    formCategoria.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nome = document.getElementById("cat-nome").value;
        const tipo = document.getElementById("cat-tipo").value;

        const { error } = await supabaseClient.from('categorias').insert([{ nome, tipo }]);
        if (error) {
            alert("Erro ao criar categoria: " + error.message);
        } else {
            alert("Categoria criada!");
            formCategoria.reset();
            carregarCategorias();
        }
    });
}

const formCartao = document.getElementById("form-cartao");
if (formCartao) {
    formCartao.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nome = document.getElementById("cartao-nome").value;
        const limite = Number(document.getElementById("cartao-limite").value);
        const fechamento = Number(document.getElementById("cartao-fechamento").value);
        const vencimento = Number(document.getElementById("cartao-vencimento").value);

        const { error } = await supabaseClient.from('cartoes').insert([{ nome, limite, dia_fechamento: fechamento, dia_vencimento: vencimento }]);
        if (error) {
            alert("Erro ao cadastrar cartão: " + error.message);
        } else {
            alert("Cartão cadastrado!");
            formCartao.reset();
            carregarCartoes();
        }
    });
}

// --- 4. GESTÃO DE DESPESAS FIXAS ---
async function carregarDespesasFixas() {
    const container = document.getElementById("lista-despesas-fixas");
    if (!container) return;

    const { data, error } = await supabaseClient.from('despesas_fixas').select('*');
    container.innerHTML = "";

    if (error || !data || data.length === 0) {
        container.innerHTML = "<p style='color: #94a3b8; text-align: center;'>Nenhuma despesa fixa registada.</p>";
        return;
    }

    data.forEach(item => {
        const div = document.createElement("div");
        div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #334155;";
        div.innerHTML = `
            <div>
                <strong>${item.nome}</strong><br>
                <small style="color: #94a3b8;">Vencimento dia ${item.dia_vencimento} • R$ ${Number(item.valor).toFixed(2)}</small>
            </div>
            <button onclick="alternarPagoDespesa('${item.id}', ${item.pago})" style="background: ${item.pago ? '#22c55e' : '#475569'}; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                ${item.pago ? 'Pago ✓' : 'Por Pagar'}
            </button>
        `;
        container.appendChild(div);
    });
}

const formDespesaFixa = document.getElementById("form-despesa-fixa");
if (formDespesaFixa) {
    formDespesaFixa.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nome = document.getElementById("fixa-nome").value;
        const valor = Number(document.getElementById("fixa-valor").value);
        const dia_vencimento = Number(document.getElementById("fixa-vencimento").value);

        const { error } = await supabaseClient.from('despesas_fixas').insert([{ nome, valor, dia_vencimento, pago: false }]);
        if (error) {
            alert("Erro ao salvar despesa fixa: " + error.message);
        } else {
            formDespesaFixa.reset();
            carregarDespesasFixas();
        }
    });
}

async function alternarPagoDespesa(id, estadoAtual) {
    const { error } = await supabaseClient
        .from('despesas_fixas')
        .update({ pago: !estadoAtual })
        .eq('id', id);

    if (!error) {
        carregarDespesasFixas();
    }
}
