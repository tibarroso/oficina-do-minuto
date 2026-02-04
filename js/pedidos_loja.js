import { supabase } from "./supabase.js";

// =========================
// CARREGAR PEDIDOS
// =========================
async function carregarPedidos(filtroStatus = "", filtroLoja = "") {
  try {
    let query = supabase.from("pedidos").select("*").order("criado_em", { ascending: false });

    // Aplicando filtro de status
    if (filtroStatus && filtroStatus !== "Todos") {
      query = query.eq("status", filtroStatus);
    }

    // Aplicando filtro de loja
    if (filtroLoja && filtroLoja !== "Todas") {
      query = query.eq("loja", filtroLoja);
    }

    const { data, error } = await query;
    if (error) throw error;

    const pedidos = data || [];
    const container = document.getElementById("containerPedidos");
    container.innerHTML = "";

    if (!pedidos.length) {
      container.innerHTML = "<p>Nenhum pedido encontrado.</p>";
      return;
    }

    pedidos.forEach(pedido => {
      const card = criarCardPedido(pedido);
      container.appendChild(card);
      carregarTimeline(pedido.id);
    });
  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
    const container = document.getElementById("containerPedidos");
    container.innerHTML = `<p style="color:red;">Erro ao carregar pedidos.</p>`;
  }
}

// =========================
// CRIAR CARD
// =========================
function criarCardPedido(pedido) {
  const card = document.createElement("div");
  card.className = "card";

  const statusClass = getStatusClass(pedido.status);

  card.innerHTML = `
    <strong>LOJA:</strong> ${pedido.loja}<br>
    <strong>OS:</strong> ${pedido.id}<br>
    <strong>Serviço:</strong> ${pedido.tipo_servico}<br>
    <span class="status-tag ${statusClass}">${pedido.status}</span><br>
    <strong>Orçamento:</strong> ${pedido.orcamento ? "Sim" : "Não"}<br>
    <strong>Observação:</strong><br><em>${pedido.obs_loja_origem || "—"}</em>
    <div class="timeline" id="timeline-${pedido.id}"><strong>Eventos:</strong></div>
  `;
  return card;
}

// =========================
// CARREGAR TIMELINE
// =========================
async function carregarTimeline(pedidoId) {
  try {
    const { data: eventos, error } = await supabase
      .from("pedido_eventos")
      .select("*")
      .eq("pedido_id", pedidoId)
      .order("criado_em", { ascending: true });

    if (error) throw error;

    const timelineDiv = document.getElementById(`timeline-${pedidoId}`);
    if (!timelineDiv) return;

    eventos.forEach(evento => {
      const item = document.createElement("div");
      item.className = "timeline-item";
      item.innerHTML = `${evento.evento} <small>${new Date(evento.criado_em).toLocaleString()}</small>`;
      timelineDiv.appendChild(item);
    });
  } catch (err) {
    console.error(`Erro carregando timeline do pedido ${pedidoId}:`, err);
  }
}

// =========================
// STATUS
// =========================
function getStatusClass(status) {
  if (!status) return "status-Aguardando";
  if (status.includes("Loja 5")) return "status-Loja5";
  if (status.includes("Em serviço")) return "status-Transporte";
  if (status === "Finalizado") return "status-Finalizado";
  if (status === "Retrabalho") return "status-Retrabalho";
  if (status === "Aguardando coleta") return "status-Aguardando";
  return "status-Aguardando";
}

// =========================
// CRIAR PEDIDO
// =========================
document.getElementById("btnCriarPedido").addEventListener("click", async () => {
  const tipoServico = document.getElementById("tipo").value;
  const loja = document.getElementById("loja").value;
  const orcamento = document.getElementById("orcamento").checked;
  const observacao = document.getElementById("observacao").value.trim();

  if (!tipoServico) {
    alert("Selecione um tipo de serviço!");
    return;
  }

  try {
    const { data, error } = await supabase.from("pedidos").insert([{
      tipo_servico: tipoServico,
      loja: loja,
      orcamento,
      obs_loja_origem: observacao,
      status: "Aguardando coleta",
      criado_em: new Date().toISOString()
    }]);


    if (error) throw error;

    alert("Pedido criado com sucesso!");
    document.getElementById("tipo").value = "";
    document.getElementById("orcamento").checked = false;
    document.getElementById("observacao").value = "";
    carregarPedidos();
  } catch (err) {
    console.error("Erro ao criar pedido:", err);
    alert("Erro ao criar pedido. Veja o console.");
  }
});

// =========================
// FILTRO DE PEDIDOS
// =========================
document.getElementById("btnFiltrar").addEventListener("click", () => {
  const filtroStatus = document.getElementById("filtroStatus").value;
  const filtroLoja = document.getElementById("filtroLoja").value;
  carregarPedidos(filtroStatus, filtroLoja);
});

// =========================
// AUTO-ATUALIZAÇÃO
// =========================
setInterval(() => {
  const filtroStatus = document.getElementById("filtroStatus").value;
  const filtroLoja = document.getElementById("filtroLoja").value;
  carregarPedidos(filtroStatus, filtroLoja);
}, 30000); // Atualiza a cada 30 segundos
