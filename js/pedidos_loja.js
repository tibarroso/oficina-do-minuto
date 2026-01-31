import { supabase } from "./supabase.js";

async function carregarPedidos(filtro = "") {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .order("criado_em", { ascending: false });

  let pedidos = data || [];
  if (filtro) pedidos = pedidos.filter(p => p.status === filtro);

  const container = document.getElementById("containerPedidos");
  container.innerHTML = "";

  if (!pedidos.length) {
    container.innerHTML = "<p>Nenhum pedido encontrado.</p>";
    return;
  }

  pedidos.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";

    // Status colorido
    let statusClass = "status-Aguardando";
    if (p.status.includes("Loja 5")) statusClass = "status-Loja5";
    else if (p.status.includes("Em serviço")) statusClass = "status-Transporte";
    else if (p.status === "Finalizado") statusClass = "status-Finalizado";
    else if (p.status === "Retrabalho") statusClass = "status-Retrabalho";

    card.innerHTML = `
      <strong>OS:</strong> ${p.id}<br>
      <strong>Serviço:</strong> ${p.tipo_servico}<br>
      <span class="status-tag ${statusClass}">${p.status}</span><br>
      <strong>Observação:</strong><br><em>${p.obs_loja_origem || "—"}</em>
      <div class="timeline" id="timeline-${p.id}"><strong>Eventos:</strong></div>
    `;
    container.appendChild(card);

    // Timeline
    carregarTimeline(p.id);
  });
}

async function carregarTimeline(pedidoId) {
  const { data: eventos } = await supabase
    .from("pedido_eventos")
    .select("*")
    .eq("pedido_id", pedidoId)
    .order("criado_em", { ascending: true });

  const timelineDiv = document.getElementById(`timeline-${pedidoId}`);
  if (!eventos) return;

  eventos.forEach(e => {
    const item = document.createElement("div");
    item.className = "timeline-item";
    item.innerHTML = `${e.evento} <small>${new Date(e.criado_em).toLocaleString()}</small>`;
    timelineDiv.appendChild(item);
  });
}

// Filtro
document.getElementById("btnFiltrar").addEventListener("click", () => {
  const filtro = document.getElementById("filtroStatus").value;
  carregarPedidos(filtro);
});

// Inicial
carregarPedidos();
setInterval(() => carregarPedidos(document.getElementById("filtroStatus").value), 5000);
