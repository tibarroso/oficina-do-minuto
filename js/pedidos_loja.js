import { supabase } from "./supabase.js";

function abreviarId(id) {
  if (!id) return "";
  return id.length > 10 ? id.slice(0, 8) + "..." : id;
}

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
      <div class="os-id"><strong>OS:</strong> ${abreviarId(p.id)}</div>
      <p><strong>Serviço:</strong> ${p.tipo_servico || "—"}</p>
      <span class="status-tag ${statusClass}">${p.status}</span>
      <p><strong>Observação:</strong><br><em>${p.obs_loja_origem || "—"}</em></p>
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
    item.innerHTML = `
      <strong>${e.evento}</strong>
      <small>${new Date(e.criado_em).toLocaleString()}</small>
    `;
    timelineDiv.appendChild(item);
  });
}

// Filtro
document.getElementById("btnFiltrar").addEventListener("click", () => {
  const filtro = document.getElementById("filtroStatus").value;
  carregarPedidos(filtro);
});

// Criar pedido
document.getElementById("btnCriarPedido").addEventListener("click", async () => {
  const tipoServico = document.getElementById("tipo").value;
  const orcamento = document.getElementById("orcamento").checked;
  const observacao = document.getElementById("observacao").value.trim();

  if (!tipoServico) {
    alert("Por favor, selecione o tipo de serviço.");
    return;
  }

  const { data, error } = await supabase.from("pedidos").insert([
    {
      tipo_servico: tipoServico,
      orcamento: orcamento,
      obs_loja_origem: observacao,
      status: "Aguardando coleta",
      criado_em: new Date().toISOString(),
    }
  ]);

  if (error) {
    alert("Erro ao criar pedido: " + error.message);
    return;
  }

  alert("Pedido criado com sucesso!");
  // Limpar form
  document.getElementById("tipo").value = "";
  document.getElementById("orcamento").checked = false;
  document.getElementById("observacao").value = "";

  carregarPedidos();
});

// Carregar pedidos inicial e a cada 5s
carregarPedidos();
setInterval(() => carregarPedidos(document.getElementById("filtroStatus").value), 5000);
