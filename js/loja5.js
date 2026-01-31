import { supabase } from "./supabase.js";

let usuarioLogado = null;

// =====================
// Inicialização
// =====================
(async () => {
  const { data } = await supabase.auth.getUser();
  usuarioLogado = data?.user || null;
  if (!usuarioLogado) {
    alert("Usuário não logado!");
    window.location.href = "login.html";
    return;
  }

  carregarTodosPedidos();
  setInterval(carregarTodosPedidos, 5000); // Atualiza sem recarregar
})();

// =====================
// Carregar todos os pedidos
// =====================
async function carregarTodosPedidos() {
  await carregarPedidosRecebidos();
  await carregarPedidosServico();
  await carregarPedidosRetorno();
}

// =====================
// Funções de carregamento
// =====================
async function carregarPedidosRecebidos() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("status", "Entregue na Loja 5")
    .order("criado_em", { ascending: false });

  renderizarPedidos("pedidosRecebidos", data, error);
}

async function carregarPedidosServico() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("status", "Em serviço")
    .order("criado_em", { ascending: false });

  renderizarPedidos("pedidosEmServico", data, error);
}

async function carregarPedidosRetorno() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .in("status", ["Aguardando retorno do transporte", "Em transporte para loja de origem"])
    .order("criado_em", { ascending: false });

  renderizarPedidos("pedidosProntosRetorno", data, error);
}

// =====================
// Renderizar pedidos
// =====================
async function renderizarPedidos(containerId, pedidos, error) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (error) {
    container.innerHTML = `<p>Erro ao carregar pedidos: ${error.message}</p>`;
    return;
  }

  if (!pedidos || pedidos.length === 0) {
    container.innerHTML = "<p>Nenhum pedido encontrado.</p>";
    return;
  }

  for (const p of pedidos) {
    const card = document.createElement("div");
    card.classList.add("card");

    // Status colorido
    let statusClass = "status-Aguardando";
    if (p.status.includes("Loja 5")) statusClass = "status-Loja5";
    else if (p.status.includes("Em serviço")) statusClass = "status-Transporte";
    else if (p.status === "Finalizado") statusClass = "status-Finalizado";
    else if (p.status === "Retrabalho") statusClass = "status-Retrabalho";

    // Card HTML
    card.innerHTML = `
      <strong>OS:</strong> ${p.id}<br>
      <strong>Loja:</strong> ${p.loja_origem}<br>
      <strong>Serviço:</strong> ${p.tipo_servico}<br>
      <span class="status-tag ${statusClass}">${p.status}</span><br>
      <strong>Observação:</strong><br><em>${p.obs_loja_origem || "—"}</em>
      <div class="timeline" id="timeline-${p.id}">
        <strong>Eventos:</strong>
      </div>
    `;

    container.appendChild(card);

    // Carregar timeline de eventos
    carregarTimeline(p.id);
  }
}

// =====================
// Timeline de eventos
// =====================
async function carregarTimeline(pedidoId) {
  const { data: eventos, error } = await supabase
    .from("pedido_eventos")
    .select("*")
    .eq("pedido_id", pedidoId)
    .order("criado_em", { ascending: true });

  const timelineDiv = document.getElementById(`timeline-${pedidoId}`);
  if (error || !eventos) {
    timelineDiv.innerHTML += `<p>Erro ao carregar eventos.</p>`;
    return;
  }

  for (const e of eventos) {
    const item = document.createElement("div");
    item.classList.add("timeline-item");
    if (e.evento.toLowerCase().includes("finalizado")) item.classList.add("evento-final");
    item.innerHTML = `${e.evento} <small>${new Date(e.criado_em).toLocaleString()}</small>`;
    timelineDiv.appendChild(item);
  }
}
