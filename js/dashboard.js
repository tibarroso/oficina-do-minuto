import { supabase } from "./supabase.js";  // Importando corretamente o Supabase

const container = document.getElementById("containerPedidos");
const filtroStatus = document.getElementById("filtroStatus");
const pesquisaOS = document.getElementById("pesquisaOS");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnCriarPedidoContainer = document.getElementById("btnCriarPedidoContainer");

let pedidosGlobais = [];
let usuarioLogado = null;
let usuarioTipo = "admin"; // admin ou loja
let chartStatus = null;
let chartServico = null;

// ===============================
// Verificar login
// ===============================
async function verificarLogin() {
  console.log(supabase);  // Verifique se o Supabase está disponível

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      alert("Usuário não logado!");
      window.location.href = "login.html";
      return null;
    }
    return user;
  } catch (err) {
    console.error("Erro ao verificar o login:", err);
    alert("Erro ao verificar o login.");
    return null;
  }
}

// ===============================
// Criar botão Criar Pedido se for loja
// ===============================
function criarBotaoPedido() {
  if (usuarioTipo === "loja" && btnCriarPedidoContainer) {
    const btn = document.createElement("button");
    btn.textContent = "Criar Pedido";
    btn.style.marginBottom = "20px";
    btn.onclick = () => window.location.href = "pedidos.html";
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

    if (usuarioTipo === "loja") query = query.eq("loja_origem", usuarioLogado.email);

    const status = filtroStatus.value;
    if (status && status !== "Todos") {
      query = query.eq("status", status);
    }

    const pesquisa = pesquisaOS.value.trim();
    if (pesquisa) {
      query = query.or(
        `id.ilike.%${pesquisa}%,loja_origem.ilike.%${pesquisa}%,tipo_servico.ilike.%${pesquisa}%,status.ilike.%${pesquisa}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    pedidosGlobais = data || [];
    renderizarPedidos(pedidosGlobais);
    atualizarGraficos();
  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
    alert("Erro ao carregar pedidos");
  }
}

// ===============================
// Renderizar pedidos
// ===============================
function renderizarPedidos(pedidos) {
  container.innerHTML = "";

  if (!pedidos || pedidos.length === 0) {
    container.innerHTML = "<p>Nenhum pedido encontrado.</p>";
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
    container.appendChild(card);
  });
}

// ===============================
// Atualizar gráficos
// ===============================
function atualizarGraficos() {
  const statusCount = {};
  const servicoCount = {};

  pedidosGlobais.forEach(p => {
    statusCount[p.status] = (statusCount[p.status] || 0) + 1;
    servicoCount[p.tipo_servico] = (servicoCount[p.tipo_servico] || 0) + 1;
  });

  // Gráfico de status
  const ctxStatus = document.getElementById("graficoStatus").getContext("2d");
  if (chartStatus) chartStatus.destroy();
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

  // Gráfico de serviços
  const ctxServico = document.getElementById("graficoServico").getContext("2d");
  if (chartServico) chartServico.destroy();
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
// Inicialização
// ===============================
(async () => {
  usuarioLogado = await verificarLogin();
  if (!usuarioLogado) return;

  usuarioTipo = usuarioLogado.email.includes("loja") ? "loja" : "admin";

  criarBotaoPedido();

  btnFiltrar?.addEventListener("click", carregarPedidos);

  carregarPedidos();

  setInterval(carregarPedidos, 5000);
})();
