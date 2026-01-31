import { supabase } from "./supabase.js";

async function carregarPedidos(filtro = "") {
  try {
    let query = supabase.from("pedidos").select("*").order("criado_em", { ascending: false });
    if (filtro && filtro !== "Todos") {
      query = query.eq("status", filtro);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao buscar pedidos:", error);
      mostrarMensagemErro("Erro ao carregar pedidos.");
      return;
    }

    const pedidos = data || [];
    const container = document.getElementById("containerPedidos");
    container.innerHTML = "";

    if (pedidos.length === 0) {
      container.innerHTML = "<p>Nenhum pedido encontrado.</p>";
      return;
    }

    pedidos.forEach(pedido => {
      const card = criarCardPedido(pedido);
      container.appendChild(card);
      carregarTimeline(pedido.id);
    });
  } catch (err) {
    console.error("Erro inesperado:", err);
    mostrarMensagemErro("Erro inesperado ao carregar pedidos.");
  }
}

function criarCardPedido(pedido) {
  const card = document.createElement("div");
  card.className = "card";

  const statusClass = getStatusClass(pedido.status);

  card.innerHTML = `
    <strong>OS:</strong> ${pedido.id}<br>
    <strong>Serviço:</strong> ${pedido.tipo_servico}<br>
    <span class="status-tag ${statusClass}">${pedido.status}</span><br>
    <strong>Observação:</strong><br><em>${pedido.obs_loja_origem || "—"}</em>
    <div class="timeline" id="timeline-${pedido.id}"><strong>Eventos:</strong></div>
  `;

  return card;
}

async function carregarTimeline(pedidoId) {
  try {
    const { data: eventos, error } = await supabase
      .from("pedido_eventos")
      .select("*")
      .eq("pedido_id", pedidoId)
      .order("criado_em", { ascending: true });

    if (error) {
      console.error(`Erro ao carregar eventos do pedido ${pedidoId}:`, error);
      return;
    }

    const timelineDiv = document.getElementById(`timeline-${pedidoId}`);
    if (!timelineDiv) return;

    eventos.forEach(evento => {
      const item = document.createElement("div");
      item.className = "timeline-item";
      item.innerHTML = `${evento.evento} <small>${new Date(evento.criado_em).toLocaleString()}</small>`;
      timelineDiv.appendChild(item);
    });
  } catch (err) {
    console.error(`Erro inesperado carregando timeline do pedido ${pedidoId}:`, err);
  }
}

function getStatusClass(status) {
  if (!status) return "status-Aguardando";
  if (status.includes("Loja 5")) return "status-Loja5";
  if (status.includes("Em serviço")) return "status-Transporte";
  if (status === "Finalizado") return "status-Finalizado";
  if (status === "Retrabalho") return "status-Retrabalho";
  if (status === "Aguardando coleta") return "status-Aguardando";
  return "status-Aguardando"; // fallback
}

function mostrarMensagemErro(msg) {
  const container = document.getElementById("containerPedidos");
  container.innerHTML = `<p style="color:red;">${msg}</p>`;
}

// Evento do botão filtro
document.getElementById("btnFiltrar").addEventListener("click", () => {
  const filtro = document.getElementById("filtroStatus").value;
  carregarPedidos(filtro);
});

// Carrega pedidos inicialmente e atualiza a cada 5 segundos
carregarPedidos();
setInterval(() => {
  const filtro = document.getElementById("filtroStatus").value;
  carregarPedidos(filtro);
}, 5000);
