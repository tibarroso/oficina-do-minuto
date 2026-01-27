import { supabase } from "./supabase.js";
import Chart from "chart.js/auto";

const container = document.getElementById("containerPedidos");
const filtroStatus = document.getElementById("filtroStatus");
const pesquisaOS = document.getElementById("pesquisaOS");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnCriarPedidoContainer = document.getElementById("btnCriarPedidoContainer");

let pedidosGlobais = [];
let usuarioLogado = null;
let usuarioTipo = "admin"; // admin ou loja
let chartStatus, chartServico;

// ===============================
// Verificar login
// ===============================
async function verificarLogin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert("Usuário não logado!");
    window.location.href = "login.html";
    return null;
  }
  return user;
}

// ===============================
// Criar botão Criar Pedido se for loja
// ===============================
function criarBotaoPedido() {
  if (usuarioTipo === "loja") {
    const btn = document.createElement("button");
    btn.textContent = "Criar Pedido";
    btn.style.marginBottom = "20px";
    btn.onclick = () => window.location.href = "pedidos.html";
    btnCriarPedidoContainer.appendChild(btn);
  }
}

// ===============================
// Carregar pedidos
// ===============================
async function carregarPedidos() {
  if (!usuarioLogado) return;

  let query = supabase.from("pedidos").select("*").order("criado_em", { ascending: false });

  if (usuarioTipo === "loja") {
    query = query.eq("loja_origem", usuarioLogado.email);
  }

  const status = filtroStatus.value;
  if (status) query = query.eq("status", status);

  const pesquisa = pesquisaOS.value.trim();
  if (pesquisa) query = query.or(`id.ilike.%${pesquisa}%,loja_origem.ilike.%${pesquisa}%`);

  const { data, error } = await query;
  if (error) { console.error(error); return alert("Erro ao carregar pedidos"); }

  pedidosGlobais = data || [];
  renderizarPedidos(pedidosGlobais);
  atualizarGraficos();
}

// ===============================
// Renderizar pedidos
// ===============================
function renderizarPedidos(pedidos) {
  container.innerHTML = "";
  if (!pedidos || pedidos.length === 0) return container.innerHTML = "<p>Nenhum pedido encontrado.</p>";

  pedidos.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>OS: ${p.id}</h3>
      <span>Status: ${p.status}</span><br>
      <strong>Loja:</strong> ${p.loja_origem}<br>
      <strong>Serviço:</strong> ${p.tipo_servico}<br>
      <strong>Orçamento:</strong> ${p.eh_orcamento ? "Sim" : "Não"}<br><br>
    `;
    container.appendChild(card);
  });
}

// ===============================
// Gráficos
// ===============================
function atualizarGraficos() {
  const statusCount = {};
  const servicoCount = {};

  pedidosGlobais.forEach(p => {
    statusCount[p.status] = (statusCount[p.status] || 0) + 1;
    servicoCount[p.tipo_servico] = (servicoCount[p.tipo_servico] || 0) + 1;
  });

  const ctxStatus = document.getElementById("graficoStatus").getContext("2d");
  if (chartStatus) chartStatus.destroy();
  chartStatus = new Chart(ctxStatus, {
    type: "doughnut",
    data: { labels: Object.keys(statusCount), datasets: [{ data: Object.values(statusCount), backgroundColor: ["#f0ad4e","#5bc0de","#5cb85c"] }] }
  });

  const ctxServico = document.getElementById("graficoServico").getContext("2d");
  if (chartServico) chartServico.destroy();
  chartServico = new Chart(ctxServico, {
    type: "bar",
    data: { labels: Object.keys(servicoCount), datasets: [{ label: "Pedidos por Serviço", data: Object.values(servicoCount), backgroundColor: "#337ab7" }] },
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

  btnFiltrar.addEventListener("click", carregarPedidos);
  carregarPedidos();
})();
