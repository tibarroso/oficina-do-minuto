import { supabase } from "./supabase.js";  // Importando o cliente Supabase

// Seleção dos elementos DOM
const container = document.getElementById("containerPedidos");
const filtroStatus = document.getElementById("filtroStatus");
const pesquisaOS = document.getElementById("pesquisaOS");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnCriarPedidoContainer = document.getElementById("btnCriarPedidoContainer");

let pedidosGlobais = [];
let usuarioLogado = null;
let usuarioTipo = "admin"; // Pode ser "admin" ou "loja"
let chartStatus = null;
let chartServico = null;

// ===============================
// Função para realizar o login
// ===============================
async function realizarLogin() {
  // Verificando se o usuário já está logado
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    alert("Usuário não logado. Realize o login.");
    window.location.href = "login.html"; // Redireciona para a página de login
    return null;
  }

  return data.user;
}

// ===============================
// Criar botão Criar Pedido (somente para loja)
// ===============================
function criarBotaoPedido() {
  if (usuarioTipo === "loja" && btnCriarPedidoContainer) {
    const btn = document.createElement("button");
    btn.textContent = "Criar Pedido";
    btn.style.marginBottom = "20px";
    btn.onclick = () => window.location.href = "pedidos.html"; // Redireciona para a página de pedidos
    btnCriarPedidoContainer.appendChild(btn);
  }
}

// ===============================
// Carregar pedidos com filtros
// ===============================
async function carregarPedidos() {
  if (!usuarioLogado) return;

  try {
    let query = supabase.from("pedidos").select("*").order("criado_em", { ascending: false });

    // Se for loja, filtra pelos pedidos da loja
    if (usuarioTipo === "loja") {
      query = query.eq("loja_origem", usuarioLogado.email);
    }

    // Filtro de status
    const status = filtroStatus.value;
    if (status && status !== "Todos") {
      query = query.eq("status", status);
    }

    // Filtro de pesquisa por OS ou Loja
    const pesquisa = pesquisaOS.value.trim();
    if (pesquisa) {
      query = query.or(
        `id.ilike.%${pesquisa}%,loja_origem.ilike.%${pesquisa}%,tipo_servico.ilike.%${pesquisa}%,status.ilike.%${pesquisa}%`
      );
    }

    // Executando a consulta ao Supabase
    const { data, error } = await query;
    if (error) throw error;

    pedidosGlobais = data || []; // Armazena os pedidos retornados
    renderizarPedidos(pedidosGlobais); // Renderiza os pedidos na página
    atualizarGraficos(); // Atualiza os gráficos
  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
    alert("Erro ao carregar pedidos");
  }
}

// ===============================
// Renderizar os pedidos na página
// ===============================
function renderizarPedidos(pedidos) {
  container.innerHTML = ""; // Limpa a lista de pedidos antes de renderizar

  if (!pedidos || pedidos.length === 0) {
    container.innerHTML = "<p>Nenhum pedido encontrado.</p>"; // Exibe mensagem se não houver pedidos
    return;
  }

  pedidos.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = ` 
      <h3>OS: ${p.id}</h3>
      <span>Status: ${p.status}</span><br>
      <strong>Loja de Origem:</strong> ${p.loja_origem}<br>
      <strong>Tipo de Serviço:</strong> ${p.tipo_servico}<br>
      <strong>Orçamento:</strong> ${p.eh_orcamento ? "Sim" : "Não"}<br><br>
      <strong>Loja Destino:</strong> ${p.loja_destino || "Não especificada"}<br>
      <strong>Observação da Loja:</strong> ${p.obs_loja_origem || "Nenhuma"}<br><br>
    `;
    container.appendChild(card); // Adiciona o card de pedido ao container
  });
}

// ===============================
// Atualizar gráficos com base nos pedidos carregados
// ===============================
function atualizarGraficos() {
  const statusCount = {};
  const servicoCount = {};

  pedidosGlobais.forEach(p => {
    statusCount[p.status] = (statusCount[p.status] || 0) + 1;
    servicoCount[p.tipo_servico] = (servicoCount[p.tipo_servico] || 0) + 1;
  });

  const ctxStatus = document.getElementById("graficoStatus").getContext("2d");
  if (chartStatus) chartStatus.destroy(); // Se o gráfico já existir, destrói o anterior
  chartStatus = new Chart(ctxStatus, {
    type: "doughnut",
    data: {
      labels: Object.keys(statusCount),
      datasets: [{
        data: Object.values(statusCount),
        backgroundColor: ["#f0ad4e", "#5bc0de", "#5cb85c", "#d9534f", "#337ab7"]
      }]
    }
  });

  const ctxServico = document.getElementById("graficoServico").getContext("2d");
  if (chartServico) chartServico.destroy(); // Se o gráfico já existir, destrói o anterior
  chartServico = new Chart(ctxServico, {
    type: "bar",
    data: {
      labels: Object.keys(servicoCount),
      datasets: [{
        label: "Pedidos por Serviço",
        data: Object.values(servicoCount),
        backgroundColor: "#337ab7"
      }],
    },
    options: { scales: { y: { beginAtZero: true } } }
  });
}

// ===============================
// Inicialização do Dashboard
// ===============================
(async () => {
  // Verifica o login e obtém os dados do usuário
  usuarioLogado = await realizarLogin();
  if (!usuarioLogado) return; // Se não estiver logado, encerra a execução

  // Definir tipo de usuário (admin ou loja)
  usuarioTipo = usuarioLogado.email.includes("loja") ? "loja" : "admin";

  // Criar botão para loja, caso seja necessário
  criarBotaoPedido();

  // Adiciona o evento de filtro
  btnFiltrar?.addEventListener("click", carregarPedidos);

  // Carregar pedidos inicialmente
  carregarPedidos();

  // Atualiza os pedidos a cada 5 segundos
  setInterval(carregarPedidos, 5000);
})();
